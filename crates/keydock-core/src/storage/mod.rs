#[cfg(test)]
use crate::WorkspaceEnv;
use crate::{decrypt_secret, Secret, Workspace, WorkspaceVariable};
use anyhow::{anyhow, Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use time::OffsetDateTime;

pub mod audit;
pub mod keys;
pub mod schema;
pub mod secrets;
pub mod shell;
pub mod workspaces;

// Re-export public free functions from shell sub-module so the crate root can
// still re-export them via `pub use storage::{...}`.
pub use shell::{
    active_env_path, active_workspace_path, current_active_workspace, deactivate_workspace,
    format_env, format_shell_exports, install_shell_hook, shell_hook, shell_integration_status,
};

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

    pub fn resolve_secret(&self, id_or_name: &str) -> Result<Secret> {
        self.get_secret_by_id(id_or_name)?
            .or(self.get_secret_by_name(id_or_name)?)
            .ok_or_else(|| anyhow!("secret not found: {id_or_name}"))
    }

    pub fn resolve_workspace(&self, id_or_name: &str) -> Result<Workspace> {
        self.get_workspace(id_or_name)?
            .ok_or_else(|| anyhow!("workspace not found: {id_or_name}"))
    }

    pub(crate) fn key_value(&self, key_id: &str) -> Result<String> {
        let encrypted: String = self.conn.query_row(
            "SELECT encrypted_value FROM keys WHERE id = ?1",
            [key_id],
            |row| row.get(0),
        )?;
        decrypt_secret(&self.master_key, &encrypted)
    }

    pub(crate) fn workspace_variable(
        &self,
        workspace_id: &str,
        env_name: &str,
    ) -> Result<Option<WorkspaceVariable>> {
        use workspaces::row_to_workspace_variable;
        self.conn
            .query_row(
                "SELECT wv.id, wv.workspace_id, wv.secret_id, s.name, wv.key_id, k.name, wv.env_name, wv.enabled,
                 wv.required, wv.sort_order, wv.created_at, wv.updated_at
                 FROM workspace_variables wv
                 JOIN secrets s ON s.id = wv.secret_id
                 JOIN keys k ON k.id = wv.key_id
                 WHERE wv.workspace_id = ?1 AND wv.env_name = ?2",
                params![workspace_id, env_name],
                row_to_workspace_variable,
            )
            .optional()
            .map_err(Into::into)
    }

    pub(crate) fn next_workspace_sort_order(&self, workspace_id: &str) -> Result<i64> {
        self.conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM workspace_variables WHERE workspace_id = ?1",
                [workspace_id],
                |row| row.get(0),
            )
            .map_err(Into::into)
    }
}

pub(crate) const KEY_SELECT: &str =
    "SELECT k.id, k.secret_id, s.name, k.name, k.env_name, k.include_by_default,
k.tags_json, k.description, k.created_at, k.updated_at
FROM keys k JOIN secrets s ON s.id = k.secret_id";

#[allow(dead_code)]
/// Mask a value for display: show first 4 and last 4 characters,
/// with `••••` in between.  Values ≤ 8 characters are entirely
/// replaced with `••••` to prevent short tokens / PINs from leaking.
fn mask_value(value: &str) -> String {
    let len = value.len();
    if len <= 8 {
        return "••••".to_string();
    }
    format!("{}••••{}", &value[..4], &value[len - 4..])
}

pub(crate) fn now() -> String {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .expect("format current time")
}

pub(crate) fn validate_env_name(name: &str) -> Result<()> {
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

pub(crate) fn shell_escape_env(value: &str) -> String {
    if value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.' | '/' | ':'))
    {
        value.to_string()
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

pub(crate) fn bool_to_i64(value: bool) -> i64 {
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
    use crate::{KeyInput, SecretCategory, SecretInput};
    use uuid::Uuid;

    fn store() -> AppStore {
        let path = std::env::temp_dir().join(format!("keydock-test-{}.sqlite3", Uuid::new_v4()));
        AppStore::open(path, vec![3_u8; 32]).unwrap()
    }

    #[test]
    fn workspace_env_mapping_resolves_key_plaintext() {
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
            .create_key(
                "openrouter",
                KeyInput {
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
            .create_key(
                "github",
                KeyInput {
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
    fn migrate_adds_missing_tags_json_to_legacy_workspaces() {
        let path = std::env::temp_dir().join(format!("keydock-test-{}.sqlite3", Uuid::new_v4()));
        let conn = rusqlite::Connection::open(&path).unwrap();
        conn.execute_batch(
            "
            CREATE TABLE secrets (
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
            CREATE TABLE workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO workspaces (id, name, description, created_at, updated_at)
            VALUES ('ws-1', 'legacy', NULL, '2024-01-01', '2024-01-01');
            ",
        )
        .unwrap();
        drop(conn);

        let store = AppStore::open(path, vec![3_u8; 32]).unwrap();
        let workspaces = store.list_workspaces().unwrap();
        assert_eq!(workspaces.len(), 1);
        assert_eq!(workspaces[0].name, "legacy");
        assert!(workspaces[0].tags.is_empty());
    }

    #[test]
    fn secret_env_exports_service_defaults_and_keys() {
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
            .create_key(
                "openrouter",
                KeyInput {
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
        assert_eq!(env.get("MODEL_NAME").unwrap(), "anthropic/claude-sonnet-4");
        assert_eq!(env.get("OPENAI_API_KEY").unwrap(), "sk-test");
    }
}
