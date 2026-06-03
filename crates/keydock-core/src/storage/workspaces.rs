use super::shell::{format_env, write_active_env};
use super::{now, validate_env_name, AppStore};
use crate::{ActiveWorkspace, Workspace, WorkspaceEnv, WorkspaceVariable};
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
        let now = now();
        // Explicit SELECT-then-INSERT-or-UPDATE: UPSERT silently discards
        // the new UUID and hides insert-vs-update from the reader.
        let existing: Option<String> = self
            .conn
            .query_row(
                "SELECT id FROM workspace_variables WHERE workspace_id = ?1 AND env_name = ?2",
                params![workspace.id, env_name],
                |row| row.get(0),
            )
            .optional()?;
        if let Some(existing_id) = existing {
            self.conn.execute(
                "UPDATE workspace_variables
                 SET secret_id = ?1, key_id = ?2, enabled = 1, updated_at = ?3
                 WHERE id = ?4",
                params![key.secret_id, key.id, now, existing_id],
            )?;
        } else {
            let id = Uuid::new_v4().to_string();
            let sort_order = self.next_workspace_sort_order(&workspace.id)?;
            self.conn.execute(
                "INSERT INTO workspace_variables (id, workspace_id, secret_id, key_id, env_name, enabled, required, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 1, 0, ?6, ?7, ?7)",
                params![id, workspace.id, key.secret_id, key.id, env_name, sort_order, now],
            )?;
        }
        self.audit(
            "map_workspace_variable",
            Some(&key.id),
            Some(&workspace.id),
            Some(env_name),
        )?;
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
        self.conn.execute(
            "DELETE FROM workspace_variables WHERE workspace_id = ?1 AND env_name = ?2",
            params![workspace.id, env_name],
        )?;
        self.audit(
            "unmap_workspace_variable",
            None,
            Some(&workspace.id),
            Some(env_name),
        )?;
        Ok(())
    }

    pub fn workspace_env(&self, workspace_id_or_name: &str) -> Result<Vec<WorkspaceEnv>> {
        let workspace = self.resolve_workspace(workspace_id_or_name)?;
        let mut stmt = self.conn.prepare(
            "SELECT wv.env_name, wv.secret_id, wv.key_id
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
            let (env_name, secret_id, key_id) = row?;
            env.push(WorkspaceEnv {
                env_name,
                value: self.key_value(&key_id)?,
                secret_id,
                key_id,
            });
        }
        Ok(env)
    }

    pub fn secret_env(&self, secret_id_or_name: &str) -> Result<Vec<WorkspaceEnv>> {
        let secret = self.resolve_secret(secret_id_or_name)?;
        let keys = self.list_keys(Some(&secret.id))?;
        let mut env = Vec::new();
        if let Some(base_url) = secret.base_url {
            env.push(WorkspaceEnv {
                env_name: "OPENAI_BASE_URL".into(),
                value: base_url,
                secret_id: secret.id.clone(),
                key_id: String::new(),
            });
        }
        if let Some(model_name) = secret.model_name {
            env.push(WorkspaceEnv {
                env_name: "MODEL_NAME".into(),
                value: model_name,
                secret_id: secret.id.clone(),
                key_id: String::new(),
            });
        }
        for key in keys {
            if !key.include_by_default {
                continue;
            }
            let Some(env_name) = key.env_name.clone() else {
                continue;
            };
            env.push(WorkspaceEnv {
                env_name,
                value: self.key_value(&key.id)?,
                secret_id: key.secret_id,
                key_id: key.id,
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
