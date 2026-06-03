use super::{log_audit, now, with_tx, AppStore};
use crate::{Secret, SecretCategory, SecretInput};
use anyhow::{anyhow, Result};
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

impl AppStore {
    pub fn create_secret(&self, input: SecretInput) -> Result<Secret> {
        let id = Uuid::new_v4().to_string();
        let now_ts = now();
        let tags_json = serde_json::to_string(&input.tags)?;
        with_tx(&self.conn, |conn| {
            conn.execute(
                "INSERT INTO secrets (id, name, category, base_url, tags_json, description, dashboard_url, docs_url, login_url, notes, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
                params![
                    &id,
                    &input.name,
                    input.category.as_str(),
                    &input.base_url,
                    &tags_json,
                    &input.description,
                    &input.dashboard_url,
                    &input.docs_url,
                    &input.login_url,
                    &input.notes,
                    &now_ts,
                ],
            )?;
            log_audit(conn, "create_secret", Some(&id), None, None)
        })?;
        self.get_secret_by_id(&id)?
            .ok_or_else(|| anyhow!("created secret not found"))
    }

    pub fn update_secret(&self, id: &str, input: SecretInput) -> Result<Secret> {
        let now_ts = now();
        let tags_json = serde_json::to_string(&input.tags)?;
        with_tx(&self.conn, |conn| {
            conn.execute(
                "UPDATE secrets SET name = ?2, category = ?3, base_url = ?4, tags_json = ?5,
                 description = ?6, dashboard_url = ?7, docs_url = ?8, login_url = ?9, notes = ?10, updated_at = ?11 WHERE id = ?1",
                params![
                    id,
                    &input.name,
                    input.category.as_str(),
                    &input.base_url,
                    &tags_json,
                    &input.description,
                    &input.dashboard_url,
                    &input.docs_url,
                    &input.login_url,
                    &input.notes,
                    &now_ts,
                ],
            )?;
            log_audit(conn, "edit_secret", Some(id), None, None)
        })?;
        self.get_secret_by_id(id)?
            .ok_or_else(|| anyhow!("secret not found"))
    }

    pub fn list_secrets(&self, limit: Option<usize>, offset: Option<usize>) -> Result<Vec<Secret>> {
        // idx_secrets_name_nocase is used by the ORDER BY so the sort
        // does not fall back to a temp B-tree once the table grows.
        // Default limit guards against unbounded reads as the table grows.
        let effective_limit = limit.unwrap_or(1000);
        let effective_offset = offset.unwrap_or(0);
        let mut stmt = self.conn.prepare(
            "SELECT id, name, category, base_url, tags_json, description, dashboard_url, docs_url, login_url, notes, created_at, updated_at
             FROM secrets ORDER BY name COLLATE NOCASE LIMIT ?1 OFFSET ?2",
        )?;
        let rows = stmt.query_map(
            rusqlite::params![effective_limit as i64, effective_offset as i64],
            row_to_secret,
        )?;
        let mapped = rows.collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(mapped)
    }

    pub fn get_secret_by_id(&self, id: &str) -> Result<Option<Secret>> {
        self.conn
            .query_row(
                "SELECT id, name, category, base_url, tags_json, description, dashboard_url, docs_url, login_url, notes, created_at, updated_at FROM secrets WHERE id = ?1",
                [id],
                row_to_secret,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn get_secret_by_name(&self, name: &str) -> Result<Option<Secret>> {
        self.conn
            .query_row(
                "SELECT id, name, category, base_url, tags_json, description, dashboard_url, docs_url, login_url, notes, created_at, updated_at FROM secrets WHERE name = ?1",
                [name],
                row_to_secret,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn delete_secret(&self, id_or_name: &str) -> Result<()> {
        let secret = self.resolve_secret(id_or_name)?;
        with_tx(&self.conn, |conn| {
            conn.execute("DELETE FROM secrets WHERE id = ?1", [&secret.id])?;
            log_audit(conn, "delete_secret", Some(&secret.id), None, None)
        })
    }
}

fn row_to_secret(row: &rusqlite::Row<'_>) -> rusqlite::Result<Secret> {
    let tags_json: String = row.get(4)?;
    Ok(Secret {
        id: row.get(0)?,
        name: row.get(1)?,
        category: SecretCategory::from_db(&row.get::<_, String>(2)?),
        base_url: row.get(3)?,
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
        description: row.get(5)?,
        dashboard_url: row.get(6)?,
        docs_url: row.get(7)?,
        login_url: row.get(8)?,
        notes: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}
