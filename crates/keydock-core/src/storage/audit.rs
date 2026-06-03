use super::{now, AppStore};
use crate::AuditLog;
use anyhow::Result;
use rusqlite::params;
use uuid::Uuid;

impl AppStore {
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
            "SELECT
               a.id, a.action, a.target_id, a.workspace_id, a.env_name, a.created_at,
               CASE WHEN k.name IS NOT NULL THEN k.name ELSE s.name END AS target_name,
               w.name AS workspace_name
             FROM audit_logs a
             LEFT JOIN secrets s ON a.target_id = s.id
             LEFT JOIN keys k ON a.target_id = k.id
             LEFT JOIN workspaces w ON a.workspace_id = w.id
             ORDER BY a.created_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map([limit], |row| {
            Ok(AuditLog {
                id: row.get(0)?,
                action: row.get(1)?,
                target_id: row.get(2)?,
                workspace_id: row.get(3)?,
                env_name: row.get(4)?,
                created_at: row.get(5)?,
                target_name: row.get(6)?,
                workspace_name: row.get(7)?,
            })
        })?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }
}
