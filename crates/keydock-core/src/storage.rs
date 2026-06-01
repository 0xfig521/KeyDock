use crate::{
    decrypt_secret, encrypt_secret, ApiKey, ApiKeyInput, AuditLog, Secret, SecretCategory,
    SecretInput, Workspace, WorkspaceEnv, WorkspaceVariable,
};
use anyhow::{anyhow, Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use time::OffsetDateTime;
use uuid::Uuid;

pub fn default_database_path() -> Result<PathBuf> {
    if let Ok(path) = std::env::var("KEYDOCK_DB_PATH") {
        return Ok(PathBuf::from(path));
    }

    let base = dirs::data_dir()
        .ok_or_else(|| anyhow!("cannot find platform data directory"))?
        .join("KeyDock");
    std::fs::create_dir_all(&base).context("create KeyDock data directory")?;
    Ok(base.join("keydock.sqlite3"))
}

pub struct AppStore {
    conn: Connection,
    master_key: Vec<u8>,
}

impl AppStore {
    pub fn open(path: PathBuf, master_key: Vec<u8>) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).context("create database parent directory")?;
        }
        let conn = Connection::open(path).context("open sqlite database")?;
        let store = Self { conn, master_key };
        store.migrate()?;
        Ok(store)
    }

    pub fn open_default() -> Result<Self> {
        let path = default_database_path()?;
        let password = std::env::var("KEYDOCK_MASTER_PASSWORD")
            .map_err(|_| anyhow!("KEYDOCK_MASTER_PASSWORD is required for CLI access"))?;
        Self::open(path.clone(), crate::unlock_vault(&path, &password)?)
    }

    fn migrate(&self) -> Result<()> {
        self.reset_legacy_schema_if_needed()?;
        self.conn.execute_batch(
            "
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS secrets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                base_url TEXT,
                model_name TEXT,
                tags_json TEXT NOT NULL DEFAULT '[]',
                description TEXT,
                dashboard_url TEXT,
                docs_url TEXT,
                login_url TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                secret_id TEXT NOT NULL,
                name TEXT NOT NULL,
                encrypted_value TEXT NOT NULL,
                env_name TEXT,
                include_by_default INTEGER NOT NULL DEFAULT 1,
                tags_json TEXT NOT NULL DEFAULT '[]',
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(secret_id, name),
                FOREIGN KEY(secret_id) REFERENCES secrets(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                tags_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS workspace_variables (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                secret_id TEXT NOT NULL,
                api_key_id TEXT NOT NULL,
                env_name TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                required INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(workspace_id, env_name),
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(secret_id) REFERENCES secrets(id) ON DELETE CASCADE,
                FOREIGN KEY(api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                action TEXT NOT NULL,
                target_id TEXT,
                workspace_id TEXT,
                env_name TEXT,
                created_at TEXT NOT NULL
            );
            ",
        )?;
        Ok(())
    }

    fn reset_legacy_schema_if_needed(&self) -> Result<()> {
        let exists: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'secrets'",
            [],
            |row| row.get(0),
        )?;
        if exists == 0 {
            return Ok(());
        }
        let mut stmt = self.conn.prepare("PRAGMA table_info(secrets)")?;
        let columns = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        if columns.iter().any(|column| column == "category") {
            return Ok(());
        }
        self.conn.execute_batch(
            "
            PRAGMA foreign_keys = OFF;
            DROP TABLE IF EXISTS workspace_variables;
            DROP TABLE IF EXISTS project_bindings;
            DROP TABLE IF EXISTS secret_entries;
            DROP TABLE IF EXISTS api_keys;
            DROP TABLE IF EXISTS secrets;
            PRAGMA foreign_keys = ON;
            ",
        )?;
        Ok(())
    }

    pub fn create_secret(&self, input: SecretInput) -> Result<Secret> {
        let id = Uuid::new_v4().to_string();
        let now = now();
        self.conn.execute(
            "INSERT INTO secrets (id, name, category, base_url, model_name, tags_json, description, dashboard_url, docs_url, login_url, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)",
            params![
                id,
                input.name,
                input.category.as_str(),
                input.base_url,
                input.model_name,
                serde_json::to_string(&input.tags)?,
                input.description,
                input.dashboard_url,
                input.docs_url,
                input.login_url,
                input.notes,
                now,
            ],
        )?;
        self.audit("create_secret", Some(&id), None, None)?;
        self.get_secret_by_id(&id)?
            .ok_or_else(|| anyhow!("created secret not found"))
    }

    pub fn update_secret(&self, id: &str, input: SecretInput) -> Result<Secret> {
        let now = now();
        self.conn.execute(
            "UPDATE secrets SET name = ?2, category = ?3, base_url = ?4, model_name = ?5, tags_json = ?6,
             description = ?7, dashboard_url = ?8, docs_url = ?9, login_url = ?10, notes = ?11, updated_at = ?12 WHERE id = ?1",
            params![
                id,
                input.name,
                input.category.as_str(),
                input.base_url,
                input.model_name,
                serde_json::to_string(&input.tags)?,
                input.description,
                input.dashboard_url,
                input.docs_url,
                input.login_url,
                input.notes,
                now,
            ],
        )?;
        self.audit("edit_secret", Some(id), None, None)?;
        self.get_secret_by_id(id)?
            .ok_or_else(|| anyhow!("secret not found"))
    }

    pub fn list_secrets(&self) -> Result<Vec<Secret>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, category, base_url, model_name, tags_json, description, dashboard_url, docs_url, login_url, notes, created_at, updated_at
             FROM secrets ORDER BY name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], row_to_secret)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub fn get_secret_by_id(&self, id: &str) -> Result<Option<Secret>> {
        self.conn
            .query_row(
                "SELECT id, name, category, base_url, model_name, tags_json, description, dashboard_url, docs_url, login_url, notes, created_at, updated_at FROM secrets WHERE id = ?1",
                [id],
                row_to_secret,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn get_secret_by_name(&self, name: &str) -> Result<Option<Secret>> {
        self.conn
            .query_row(
                "SELECT id, name, category, base_url, model_name, tags_json, description, dashboard_url, docs_url, login_url, notes, created_at, updated_at FROM secrets WHERE name = ?1",
                [name],
                row_to_secret,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn delete_secret(&self, id_or_name: &str) -> Result<()> {
        let secret = self.resolve_secret(id_or_name)?;
        self.conn
            .execute("DELETE FROM secrets WHERE id = ?1", [secret.id.as_str()])?;
        self.audit("delete_secret", Some(&secret.id), None, None)?;
        Ok(())
    }

    pub fn create_api_key(&self, secret_id_or_name: &str, input: ApiKeyInput) -> Result<ApiKey> {
        if let Some(env_name) = input.env_name.as_deref() {
            validate_env_name(env_name)?;
        }
        let secret = self.resolve_secret(secret_id_or_name)?;
        let id = Uuid::new_v4().to_string();
        let now = now();
        let encrypted_value = encrypt_secret(&self.master_key, &input.value)?;
        self.conn.execute(
            "INSERT INTO api_keys (id, secret_id, name, encrypted_value, env_name, include_by_default, tags_json, description, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
            params![
                id,
                secret.id,
                input.name,
                encrypted_value,
                input.env_name,
                bool_to_i64(input.include_by_default),
                serde_json::to_string(&input.tags)?,
                input.description,
                now,
            ],
        )?;
        self.audit("create_api_key", Some(&id), None, None)?;
        self.get_api_key_by_id(&id)?
            .ok_or_else(|| anyhow!("created api key not found"))
    }

    pub fn list_api_keys(&self, secret_id_or_name: Option<&str>) -> Result<Vec<ApiKey>> {
        if let Some(secret_id_or_name) = secret_id_or_name {
            let secret = self.resolve_secret(secret_id_or_name)?;
            let mut stmt = self.conn.prepare(
                &(API_KEY_SELECT.to_owned()
                    + " WHERE k.secret_id = ?1 ORDER BY k.name COLLATE NOCASE"),
            )?;
            let rows = stmt.query_map([secret.id], row_to_api_key)?;
            rows.collect::<rusqlite::Result<Vec<_>>>()
                .map_err(Into::into)
        } else {
            let mut stmt = self.conn.prepare(
                &(API_KEY_SELECT.to_owned()
                    + " ORDER BY s.name COLLATE NOCASE, k.name COLLATE NOCASE"),
            )?;
            let rows = stmt.query_map([], row_to_api_key)?;
            rows.collect::<rusqlite::Result<Vec<_>>>()
                .map_err(Into::into)
        }
    }

    pub fn get_api_key_by_id(&self, id: &str) -> Result<Option<ApiKey>> {
        self.conn
            .query_row(
                &(API_KEY_SELECT.to_owned() + " WHERE k.id = ?1"),
                [id],
                row_to_api_key,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn resolve_api_key(&self, secret_and_key: &str) -> Result<ApiKey> {
        if let Some(api_key) = self.get_api_key_by_id(secret_and_key)? {
            return Ok(api_key);
        }
        let (secret_name, key_name) = secret_and_key.split_once('/').ok_or_else(|| {
            anyhow!("api key must be an id or secret/key-name: {secret_and_key}")
        })?;
        let secret = self.resolve_secret(secret_name)?;
        self.conn
            .query_row(
                &(API_KEY_SELECT.to_owned() + " WHERE k.secret_id = ?1 AND k.name = ?2"),
                params![secret.id, key_name],
                row_to_api_key,
            )
            .optional()?
            .ok_or_else(|| anyhow!("api key not found: {secret_and_key}"))
    }

    pub fn reveal_api_key(&self, id_or_path: &str) -> Result<String> {
        let api_key = self.resolve_api_key(id_or_path)?;
        let value = self.api_key_value(&api_key.id)?;
        self.audit(
            "reveal_api_key",
            Some(&api_key.id),
            None,
            api_key.env_name.as_deref(),
        )?;
        Ok(value)
    }

    pub fn delete_api_key(&self, id_or_path: &str) -> Result<()> {
        let api_key = self.resolve_api_key(id_or_path)?;
        self.conn
            .execute("DELETE FROM api_keys WHERE id = ?1", [api_key.id.as_str()])?;
        self.audit(
            "delete_api_key",
            Some(&api_key.id),
            None,
            api_key.env_name.as_deref(),
        )?;
        Ok(())
    }

    pub fn create_workspace(&self, name: &str, description: Option<&str>) -> Result<Workspace> {
        let id = Uuid::new_v4().to_string();
        let now = now();
        self.conn.execute(
            "INSERT INTO workspaces (id, name, description, tags_json, created_at, updated_at) VALUES (?1, ?2, ?3, '[]', ?4, ?4)",
            params![id, name, description, now],
        )?;
        self.get_workspace(&id)?
            .ok_or_else(|| anyhow!("created workspace not found"))
    }

    pub fn list_workspaces(&self) -> Result<Vec<Workspace>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, tags_json, created_at, updated_at FROM workspaces ORDER BY name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], row_to_workspace)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub fn get_workspace(&self, id_or_name: &str) -> Result<Option<Workspace>> {
        self.conn
            .query_row(
                "SELECT id, name, description, tags_json, created_at, updated_at FROM workspaces WHERE id = ?1 OR name = ?1",
                [id_or_name],
                row_to_workspace,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn delete_workspace(&self, id_or_name: &str) -> Result<()> {
        let workspace = self.resolve_workspace(id_or_name)?;
        self.conn.execute(
            "DELETE FROM workspaces WHERE id = ?1",
            [workspace.id.as_str()],
        )?;
        Ok(())
    }

    pub fn set_workspace_variable(
        &self,
        workspace_id_or_name: &str,
        env_name: Option<&str>,
        api_key_id_or_path: &str,
    ) -> Result<WorkspaceVariable> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        let api_key = self.resolve_api_key(api_key_id_or_path)?;
        let env_name = env_name
            .or(api_key.env_name.as_deref())
            .ok_or_else(|| anyhow!("api key has no default env name; provide one explicitly"))?;
        validate_env_name(env_name)?;
        let id = Uuid::new_v4().to_string();
        let now = now();
        let sort_order = self.next_workspace_sort_order(&workspace.id)?;
        self.conn.execute(
            "INSERT INTO workspace_variables (id, workspace_id, secret_id, api_key_id, env_name, enabled, required, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1, 0, ?6, ?7, ?7)
             ON CONFLICT(workspace_id, env_name) DO UPDATE SET secret_id = excluded.secret_id, api_key_id = excluded.api_key_id,
             enabled = 1, updated_at = excluded.updated_at",
            params![id, workspace.id, api_key.secret_id, api_key.id, env_name, sort_order, now],
        )?;
        self.audit(
            "edit_workspace",
            Some(&api_key.id),
            Some(&workspace.id),
            Some(env_name),
        )?;
        self.workspace_variable(&workspace.id, env_name)?
            .ok_or_else(|| anyhow!("workspace variable not found"))
    }

    pub fn add_secret_default_api_keys_to_workspace(
        &self,
        workspace_id_or_name: &str,
        secret_id_or_name: &str,
    ) -> Result<Vec<WorkspaceVariable>> {
        let secret = self.resolve_secret(secret_id_or_name)?;
        let api_keys = self
            .list_api_keys(Some(&secret.id))?
            .into_iter()
            .filter(|api_key| api_key.include_by_default && api_key.env_name.is_some())
            .collect::<Vec<_>>();
        let mut variables = Vec::new();
        for api_key in api_keys {
            variables.push(self.set_workspace_variable(
                workspace_id_or_name,
                api_key.env_name.as_deref(),
                &api_key.id,
            )?);
        }
        Ok(variables)
    }

    pub fn list_workspace_variables(
        &self,
        workspace_id_or_name: &str,
    ) -> Result<Vec<WorkspaceVariable>> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        let mut stmt = self.conn.prepare(
            "SELECT wv.id, wv.workspace_id, wv.secret_id, s.name, wv.api_key_id, k.name, wv.env_name, wv.enabled,
             wv.required, wv.sort_order, wv.created_at, wv.updated_at
             FROM workspace_variables wv
             JOIN secrets s ON s.id = wv.secret_id
             JOIN api_keys k ON k.id = wv.api_key_id
             WHERE wv.workspace_id = ?1
             ORDER BY wv.sort_order, wv.env_name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([workspace.id], row_to_workspace_variable)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub fn delete_workspace_variable(
        &self,
        workspace_id_or_name: &str,
        env_name: &str,
    ) -> Result<()> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        self.conn.execute(
            "DELETE FROM workspace_variables WHERE workspace_id = ?1 AND env_name = ?2",
            params![workspace.id, env_name],
        )?;
        self.audit("edit_workspace", None, Some(&workspace.id), Some(env_name))?;
        Ok(())
    }

    pub fn workspace_env(&self, workspace_id_or_name: &str) -> Result<Vec<WorkspaceEnv>> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        let mut stmt = self.conn.prepare(
            "SELECT wv.env_name, wv.secret_id, wv.api_key_id
             FROM workspace_variables wv
             WHERE wv.workspace_id = ?1 AND wv.enabled = 1
             ORDER BY wv.sort_order, wv.env_name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([workspace.id.as_str()], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?;
        let mut env = Vec::new();
        for row in rows {
            let (env_name, secret_id, api_key_id) = row?;
            env.push(WorkspaceEnv {
                env_name,
                value: self.api_key_value(&api_key_id)?,
                secret_id,
                api_key_id,
            });
        }
        Ok(env)
    }

    pub fn secret_env(&self, secret_id_or_name: &str) -> Result<Vec<WorkspaceEnv>> {
        let secret = self.resolve_secret(secret_id_or_name)?;
        let api_keys = self.list_api_keys(Some(&secret.id))?;
        let mut env = Vec::new();
        if let Some(base_url) = secret.base_url {
            env.push(WorkspaceEnv {
                env_name: "OPENAI_BASE_URL".into(),
                value: base_url,
                secret_id: secret.id.clone(),
                api_key_id: String::new(),
            });
        }
        if let Some(model_name) = secret.model_name {
            env.push(WorkspaceEnv {
                env_name: "MODEL_NAME".into(),
                value: model_name,
                secret_id: secret.id.clone(),
                api_key_id: String::new(),
            });
        }
        for api_key in api_keys {
            if !api_key.include_by_default {
                continue;
            }
            let Some(env_name) = api_key.env_name.clone() else {
                continue;
            };
            env.push(WorkspaceEnv {
                env_name,
                value: self.api_key_value(&api_key.id)?,
                secret_id: api_key.secret_id,
                api_key_id: api_key.id,
            });
        }
        Ok(env)
    }

    pub fn api_key_env(
        &self,
        api_key_id_or_path: &str,
        env_name: Option<&str>,
    ) -> Result<WorkspaceEnv> {
        let api_key = self.resolve_api_key(api_key_id_or_path)?;
        let env_name = env_name
            .or(api_key.env_name.as_deref())
            .ok_or_else(|| anyhow!("api key has no default env name; provide one explicitly"))?;
        validate_env_name(env_name)?;
        Ok(WorkspaceEnv {
            env_name: env_name.to_string(),
            value: self.api_key_value(&api_key.id)?,
            secret_id: api_key.secret_id,
            api_key_id: api_key.id,
        })
    }

    pub fn export_env_text(&self, workspace_id_or_name: &str) -> Result<String> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        let env = self.workspace_env(workspace_id_or_name)?;
        self.audit("export", None, Some(&workspace.id), None)?;
        Ok(format_env(env))
    }

    pub fn audit(
        &self,
        action: &str,
        target_id: Option<&str>,
        workspace_id: Option<&str>,
        env_name: Option<&str>,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO audit_logs (id, action, target_id, workspace_id, env_name, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![Uuid::new_v4().to_string(), action, target_id, workspace_id, env_name, now()],
        )?;
        Ok(())
    }

    pub fn list_audit_logs(&self, limit: u32) -> Result<Vec<AuditLog>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, action, target_id, workspace_id, env_name, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map([limit], |row| {
            Ok(AuditLog {
                id: row.get(0)?,
                action: row.get(1)?,
                target_id: row.get(2)?,
                workspace_id: row.get(3)?,
                env_name: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub fn resolve_secret(&self, id_or_name: &str) -> Result<Secret> {
        self.get_secret_by_id(id_or_name)?
            .or(self.get_secret_by_name(id_or_name)?)
            .ok_or_else(|| anyhow!("secret not found: {id_or_name}"))
    }

    pub fn resolve_workspace(&self, id_or_name: &str) -> Result<Workspace> {
        self.get_workspace(id_or_name)?
            .ok_or_else(|| anyhow!("workspace not found: {id_or_name}"))
    }

    fn api_key_value(&self, api_key_id: &str) -> Result<String> {
        let encrypted: String = self.conn.query_row(
            "SELECT encrypted_value FROM api_keys WHERE id = ?1",
            [api_key_id],
            |row| row.get(0),
        )?;
        decrypt_secret(&self.master_key, &encrypted)
    }

    fn workspace_variable(
        &self,
        workspace_id: &str,
        env_name: &str,
    ) -> Result<Option<WorkspaceVariable>> {
        self.conn
            .query_row(
                "SELECT wv.id, wv.workspace_id, wv.secret_id, s.name, wv.api_key_id, k.name, wv.env_name, wv.enabled,
                 wv.required, wv.sort_order, wv.created_at, wv.updated_at
                 FROM workspace_variables wv
                 JOIN secrets s ON s.id = wv.secret_id
                 JOIN api_keys k ON k.id = wv.api_key_id
                 WHERE wv.workspace_id = ?1 AND wv.env_name = ?2",
                params![workspace_id, env_name],
                row_to_workspace_variable,
            )
            .optional()
            .map_err(Into::into)
    }

    fn next_workspace_sort_order(&self, workspace_id: &str) -> Result<i64> {
        self.conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM workspace_variables WHERE workspace_id = ?1",
                [workspace_id],
                |row| row.get(0),
            )
            .map_err(Into::into)
    }
}

const API_KEY_SELECT: &str =
    "SELECT k.id, k.secret_id, s.name, k.name, k.env_name, k.include_by_default,
k.tags_json, k.description, k.created_at, k.updated_at
FROM api_keys k JOIN secrets s ON s.id = k.secret_id";

fn row_to_secret(row: &rusqlite::Row<'_>) -> rusqlite::Result<Secret> {
    let tags_json: String = row.get(5)?;
    Ok(Secret {
        id: row.get(0)?,
        name: row.get(1)?,
        category: SecretCategory::from_db(&row.get::<_, String>(2)?),
        base_url: row.get(3)?,
        model_name: row.get(4)?,
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
        description: row.get(6)?,
        dashboard_url: row.get(7)?,
        docs_url: row.get(8)?,
        login_url: row.get(9)?,
        notes: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn row_to_api_key(row: &rusqlite::Row<'_>) -> rusqlite::Result<ApiKey> {
    let tags_json: String = row.get(6)?;
    Ok(ApiKey {
        id: row.get(0)?,
        secret_id: row.get(1)?,
        secret_name: row.get(2)?,
        name: row.get(3)?,
        env_name: row.get(4)?,
        include_by_default: row.get::<_, i64>(5)? == 1,
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
        description: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn row_to_workspace(row: &rusqlite::Row<'_>) -> rusqlite::Result<Workspace> {
    let tags_json: String = row.get(3)?;
    Ok(Workspace {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn row_to_workspace_variable(row: &rusqlite::Row<'_>) -> rusqlite::Result<WorkspaceVariable> {
    Ok(WorkspaceVariable {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        secret_id: row.get(2)?,
        secret_name: row.get(3)?,
        api_key_id: row.get(4)?,
        api_key_name: row.get(5)?,
        env_name: row.get(6)?,
        enabled: row.get::<_, i64>(7)? == 1,
        required: row.get::<_, i64>(8)? == 1,
        sort_order: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

fn now() -> String {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .expect("format current time")
}

fn validate_env_name(name: &str) -> Result<()> {
    let valid = !name.is_empty()
        && name
            .chars()
            .enumerate()
            .all(|(i, c)| c == '_' || c.is_ascii_uppercase() || c.is_ascii_digit() && i > 0);
    if valid {
        Ok(())
    } else {
        Err(anyhow!("invalid env name: {name}"))
    }
}

fn shell_escape_env(value: &str) -> String {
    if value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.' | '/' | ':'))
    {
        value.to_string()
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

pub fn format_env(env: Vec<WorkspaceEnv>) -> String {
    env.into_iter()
        .map(|item| format!("{}={}", item.env_name, shell_escape_env(&item.value)))
        .collect::<Vec<_>>()
        .join("\n")
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

#[cfg(test)]
pub fn env_vec_to_map(env: Vec<WorkspaceEnv>) -> std::collections::BTreeMap<String, String> {
    env.into_iter()
        .map(|item| (item.env_name, item.value))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store() -> AppStore {
        let path = std::env::temp_dir().join(format!("keydock-test-{}.sqlite3", Uuid::new_v4()));
        AppStore::open(path, vec![3_u8; 32]).unwrap()
    }

    #[test]
    fn workspace_env_mapping_resolves_api_key_plaintext() {
        let store = store();
        store
            .create_secret(SecretInput {
                name: "openrouter".into(),
                category: SecretCategory::AI,
                base_url: Some("https://openrouter.ai/api/v1".into()),
                model_name: Some("openai/gpt-4.1".into()),
                tags: vec!["ai".into()],
                description: None,
                dashboard_url: None,
                docs_url: None,
                login_url: None,
                notes: None,
            })
            .unwrap();
        store
            .create_api_key(
                "openrouter",
                ApiKeyInput {
                    name: "client-a".into(),
                    value: "sk-test".into(),
                    env_name: Some("OPENAI_API_KEY".into()),
                    include_by_default: true,
                    tags: vec![],
                    description: None,
                },
            )
            .unwrap();
        store.create_workspace("startup", None).unwrap();
        store
            .set_workspace_variable("startup", None, "openrouter/client-a")
            .unwrap();
        let env = env_vec_to_map(store.workspace_env("startup").unwrap());
        assert_eq!(env.get("OPENAI_API_KEY").unwrap(), "sk-test");
    }

    #[test]
    fn deleting_secret_removes_workspace_reference() {
        let store = store();
        let secret = store
            .create_secret(SecretInput {
                name: "github".into(),
                category: SecretCategory::DevTool,
                base_url: None,
                model_name: None,
                tags: vec![],
                description: None,
                dashboard_url: None,
                docs_url: None,
                login_url: None,
                notes: None,
            })
            .unwrap();
        store
            .create_api_key(
                "github",
                ApiKeyInput {
                    name: "pat".into(),
                    value: "ghp_test".into(),
                    env_name: Some("GITHUB_TOKEN".into()),
                    include_by_default: true,
                    tags: vec![],
                    description: None,
                },
            )
            .unwrap();
        store.create_workspace("personal", None).unwrap();
        store
            .set_workspace_variable("personal", None, "github/pat")
            .unwrap();
        store.delete_secret(&secret.id).unwrap();
        assert!(store
            .list_workspace_variables("personal")
            .unwrap()
            .is_empty());
    }

    #[test]
    fn secret_env_exports_service_defaults_and_api_keys() {
        let store = store();
        store
            .create_secret(SecretInput {
                name: "openrouter".into(),
                category: SecretCategory::AI,
                base_url: Some("https://openrouter.ai/api/v1".into()),
                model_name: Some("anthropic/claude-sonnet-4".into()),
                tags: vec![],
                description: None,
                dashboard_url: None,
                docs_url: None,
                login_url: None,
                notes: None,
            })
            .unwrap();
        store
            .create_api_key(
                "openrouter",
                ApiKeyInput {
                    name: "default".into(),
                    value: "sk-test".into(),
                    env_name: Some("OPENAI_API_KEY".into()),
                    include_by_default: true,
                    tags: vec![],
                    description: None,
                },
            )
            .unwrap();
        let env = env_vec_to_map(store.secret_env("openrouter").unwrap());
        assert_eq!(
            env.get("OPENAI_BASE_URL").unwrap(),
            "https://openrouter.ai/api/v1"
        );
        assert_eq!(
            env.get("MODEL_NAME").unwrap(),
            "anthropic/claude-sonnet-4"
        );
        assert_eq!(env.get("OPENAI_API_KEY").unwrap(), "sk-test");
    }
}
