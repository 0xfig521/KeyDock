use super::shell::{format_env, write_active_env};
use super::{log_audit, now, validate_env_name, with_tx, AppStore};
use crate::{decrypt_secret, ActiveWorkspace, Workspace, WorkspaceEnv, WorkspaceVariable};
use anyhow::{anyhow, Result};
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

impl AppStore {
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
        key_id_or_path: &str,
    ) -> Result<WorkspaceVariable> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        let key = self.resolve_key(key_id_or_path)?;
        let env_name = env_name
            .or(key.env_name.as_deref())
            .ok_or_else(|| anyhow!("key has no default env name; provide one explicitly"))?;
        validate_env_name(env_name)?;
        let now_ts = now();
        let ws_id = workspace.id.clone();
        let key_secret_id = key.secret_id.clone();
        let key_id = key.id.clone();
        with_tx(&self.conn, |conn| {
            let existing: Option<String> = conn
                .query_row(
                    "SELECT id FROM workspace_variables WHERE workspace_id = ?1 AND env_name = ?2",
                    params![&ws_id, env_name],
                    |row| row.get(0),
                )
                .optional()?;
            if let Some(existing_id) = existing {
                conn.execute(
                    "UPDATE workspace_variables
                     SET secret_id = ?1, key_id = ?2, enabled = 1, updated_at = ?3
                     WHERE id = ?4",
                    params![&key_secret_id, &key_id, &now_ts, &existing_id],
                )?;
            } else {
                let id = Uuid::new_v4().to_string();
                let sort_order: i64 = conn.query_row(
                    "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM workspace_variables WHERE workspace_id = ?1",
                    [&ws_id],
                    |row| row.get(0),
                )?;
                conn.execute(
                    "INSERT INTO workspace_variables (id, workspace_id, secret_id, key_id, env_name, enabled, required, sort_order, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 1, 0, ?6, ?7, ?7)",
                    params![id, &ws_id, &key_secret_id, &key_id, env_name, sort_order, &now_ts],
                )?;
            }
            log_audit(
                conn,
                "map_workspace_variable",
                Some(&key_id),
                Some(&ws_id),
                Some(env_name),
            )
        })?;
        self.workspace_variable(&workspace.id, env_name)?
            .ok_or_else(|| anyhow!("workspace variable not found"))
    }

    pub fn add_secret_default_keys_to_workspace(
        &self,
        workspace_id_or_name: &str,
        secret_id_or_name: &str,
    ) -> Result<Vec<WorkspaceVariable>> {
        let secret = self.resolve_secret(secret_id_or_name)?;
        let keys = self
            .list_keys(Some(&secret.id))?
            .into_iter()
            .filter(|k| k.include_by_default && k.env_name.is_some())
            .collect::<Vec<_>>();
        let mut variables = Vec::new();
        for key in keys {
            variables.push(self.set_workspace_variable(
                workspace_id_or_name,
                key.env_name.as_deref(),
                &key.id,
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
            "SELECT wv.id, wv.workspace_id, wv.secret_id, s.name, wv.key_id, k.name, wv.env_name, wv.enabled,
             wv.required, wv.sort_order, wv.created_at, wv.updated_at
             FROM workspace_variables wv
             JOIN secrets s ON s.id = wv.secret_id
             JOIN keys k ON k.id = wv.key_id
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
        let ws_id = workspace.id.clone();
        with_tx(&self.conn, |conn| {
            conn.execute(
                "DELETE FROM workspace_variables WHERE workspace_id = ?1 AND env_name = ?2",
                params![&ws_id, env_name],
            )?;
            log_audit(
                conn,
                "unmap_workspace_variable",
                None,
                Some(&ws_id),
                Some(env_name),
            )
        })
    }

    pub fn workspace_env(&self, workspace_id_or_name: &str) -> Result<Vec<WorkspaceEnv>> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        // Single JOIN query fetches encrypted_value alongside each variable,
        // eliminating the N+1 pattern where every variable called key_value()
        // (another SQL query + XChaCha20 decrypt) individually.
        let mut stmt = self.conn.prepare(
            "SELECT wv.env_name, wv.secret_id, wv.key_id, k.encrypted_value
             FROM workspace_variables wv
             JOIN keys k ON k.id = wv.key_id
             WHERE wv.workspace_id = ?1 AND wv.enabled = 1
             ORDER BY wv.sort_order, wv.env_name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([workspace.id.as_str()], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })?;
        let mut env = Vec::with_capacity(rows.size_hint().0);
        for row in rows {
            let (env_name, secret_id, key_id, encrypted_value) = row?;
            env.push(WorkspaceEnv {
                env_name,
                value: decrypt_secret(&self.master_key, &encrypted_value)?,
                secret_id,
                key_id,
            });
        }
        Ok(env)
    }

    pub fn secret_env(&self, secret_id_or_name: &str) -> Result<Vec<WorkspaceEnv>> {
        let secret = self.resolve_secret(secret_id_or_name)?;
        let mut env = Vec::new();
        if let Some(base_url) = secret.base_url {
            env.push(WorkspaceEnv {
                env_name: "OPENAI_BASE_URL".into(),
                value: base_url,
                secret_id: secret.id.clone(),
                key_id: String::new(),
            });
        }
        // Single query fetches encrypted_value for all default keys,
        // eliminating the N+1 pattern from the old list_keys + key_value loop.
        let mut stmt = self.conn.prepare(
            "SELECT k.id, k.env_name, k.encrypted_value
             FROM keys k
             WHERE k.secret_id = ?1 AND k.include_by_default = 1 AND k.env_name IS NOT NULL",
        )?;
        let rows = stmt.query_map([secret.id.as_str()], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?;
        for row in rows {
            let (key_id, env_name, encrypted_value) = row?;
            env.push(WorkspaceEnv {
                env_name,
                value: decrypt_secret(&self.master_key, &encrypted_value)?,
                secret_id: secret.id.clone(),
                key_id,
            });
        }
        Ok(env)
    }

    pub fn key_env(&self, key_id_or_path: &str, env_name: Option<&str>) -> Result<WorkspaceEnv> {
        let key = self.resolve_key(key_id_or_path)?;
        let env_name = env_name
            .or(key.env_name.as_deref())
            .ok_or_else(|| anyhow!("key has no default env name; provide one explicitly"))?;
        validate_env_name(env_name)?;
        Ok(WorkspaceEnv {
            env_name: env_name.to_string(),
            value: self.key_value(&key.id)?,
            secret_id: key.secret_id,
            key_id: key.id,
        })
    }

    pub fn export_env_text(&self, workspace_id_or_name: &str) -> Result<String> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        let env = self.workspace_env(workspace_id_or_name)?;
        self.audit("export", None, Some(&workspace.id), None)?;
        Ok(format_env(env))
    }

    pub fn activate_workspace(&self, workspace_id_or_name: &str) -> Result<ActiveWorkspace> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        let env = self.workspace_env(&workspace.id)?;
        write_active_env("workspace", &workspace.id, &workspace.name, &env)?;
        self.audit("activate_workspace", None, Some(&workspace.id), None)?;
        Ok(ActiveWorkspace {
            id: workspace.id,
            name: workspace.name,
            source_type: "workspace".into(),
            env_count: env.len(),
            env_names: env.iter().map(|item| item.env_name.clone()).collect(),
        })
    }

    pub fn activate_key(&self, key_id_or_path: &str) -> Result<ActiveWorkspace> {
        let key = self.resolve_key(key_id_or_path)?;
        let env = vec![self.key_env(&key.id, None)?];
        let name = format!(
            "{}/{}",
            key.secret_name.clone().unwrap_or(key.secret_id.clone()),
            key.name
        );
        write_active_env("key", &key.id, &name, &env)?;
        self.audit("activate_key", Some(&key.id), None, key.env_name.as_deref())?;
        Ok(ActiveWorkspace {
            id: key.id,
            name,
            source_type: "key".into(),
            env_count: env.len(),
            env_names: env.iter().map(|item| item.env_name.clone()).collect(),
        })
    }
}

pub(crate) fn row_to_workspace_variable(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<WorkspaceVariable> {
    Ok(WorkspaceVariable {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        secret_id: row.get(2)?,
        secret_name: row.get(3)?,
        key_id: row.get(4)?,
        key_name: row.get(5)?,
        env_name: row.get(6)?,
        enabled: row.get::<_, i64>(7)? == 1,
        required: row.get::<_, i64>(8)? == 1,
        sort_order: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
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
