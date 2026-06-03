use super::AppStore;
use anyhow::Result;
use rusqlite::params;

impl AppStore {
    /// Versioned schema migration. Each version is tracked in
    /// `schema_migrations` and runs at most once per database.
    /// Destructive migrations (potential data loss) are explicitly
    /// marked — see `migrate_v0_legacy_cleanup`.
    pub(crate) fn migrate(&self) -> Result<()> {
        // V0: handle pre-versioning legacy schema before the tracking
        // table exists.  Only runs on databases that have no
        // schema_migrations table at all.
        self.migrate_v0_legacy_cleanup()?;

        // Ensure the migration tracking table exists.
        self.ensure_schema_migrations_table()?;

        // Run each versioned migration if not yet applied.
        self.run_migration(1, "initial_schema", |s| s.migrate_v1_initial_schema())?;
        self.run_migration(2, "rename_api_keys_to_keys", |s| {
            s.migrate_v2_rename_api_keys()
        })?;
        self.run_migration(3, "add_workspace_tags_json", |s| {
            s.migrate_v3_add_workspace_tags()
        })?;
        self.run_migration(4, "fix_workspace_variables_columns", |s| {
            s.migrate_v4_fix_workspace_variables()
        })?;

        Ok(())
    }

    // ── migration runner ────────────────────────────────────────────────

    fn ensure_schema_migrations_table(&self) -> Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            );",
        )?;
        Ok(())
    }

    fn run_migration(
        &self,
        version: i64,
        name: &str,
        f: impl FnOnce(&Self) -> Result<()>,
    ) -> Result<()> {
        let already_applied: bool = self.conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = ?1",
            [version],
            |row| row.get::<_, i64>(0),
        )? > 0;

        if already_applied {
            return Ok(());
        }

        f(self)?;

        self.conn.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
            params![version, name, super::now()],
        )?;

        Ok(())
    }

    // ── V0: legacy schema cleanup (destructive, pre-versioning) ──────────

    /// If the database has a `secrets` table that predates the `category`
    /// column, the schema is from an ancient prototype.  Drop and
    /// recreate everything — there is no way to backfill the missing
    /// column at this point.
    ///
    /// This only fires when the database has NOT yet been through the
    /// versioned migration system (no `schema_migrations` table).
    fn migrate_v0_legacy_cleanup(&self) -> Result<()> {
        if self.table_exists("schema_migrations")? {
            return Ok(());
        }
        let exists: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'secrets'",
            [],
            |row| row.get(0),
        )?;
        if exists == 0 {
            return Ok(());
        }
        if self.column_exists("secrets", "category")? {
            return Ok(());
        }
        // Destructive: drop legacy tables before recreating them.
        self.conn.execute_batch(
            "
            PRAGMA foreign_keys = OFF;
            DROP TABLE IF EXISTS workspace_variables;
            DROP TABLE IF EXISTS project_bindings;
            DROP TABLE IF EXISTS secret_entries;
            DROP TABLE IF EXISTS keys;
            DROP TABLE IF EXISTS secrets;
            PRAGMA foreign_keys = ON;
            ",
        )?;
        Ok(())
    }

    // ── V1: initial schema ──────────────────────────────────────────────

    fn migrate_v1_initial_schema(&self) -> Result<()> {
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
            CREATE TABLE IF NOT EXISTS keys (
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
                key_id TEXT NOT NULL,
                env_name TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                required INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(workspace_id, env_name),
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(secret_id) REFERENCES secrets(id) ON DELETE CASCADE,
                FOREIGN KEY(key_id) REFERENCES keys(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                action TEXT NOT NULL,
                target_id TEXT,
                workspace_id TEXT,
                env_name TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_secrets_name_nocase
                ON secrets(name COLLATE NOCASE);
            CREATE INDEX IF NOT EXISTS idx_keys_secret
                ON keys(secret_id, name COLLATE NOCASE);
            CREATE INDEX IF NOT EXISTS idx_workspace_variables_ws
                ON workspace_variables(workspace_id, sort_order, env_name COLLATE NOCASE);
            CREATE INDEX IF NOT EXISTS idx_workspace_variables_lookup
                ON workspace_variables(workspace_id, env_name);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created
                ON audit_logs(created_at DESC);
            ",
        )?;
        Ok(())
    }

    // ── V2: rename api_keys → keys ──────────────────────────────────────

    fn migrate_v2_rename_api_keys(&self) -> Result<()> {
        if self.table_exists("api_keys")? && !self.table_exists("keys")? {
            self.conn.execute_batch(
                "PRAGMA foreign_keys = OFF;
                 ALTER TABLE api_keys RENAME TO keys;
                 DROP INDEX IF EXISTS idx_api_keys_secret;
                 CREATE INDEX IF NOT EXISTS idx_keys_secret ON keys(secret_id, name COLLATE NOCASE);
                 PRAGMA foreign_keys = ON;
                 ",
            )?;
        }
        Ok(())
    }

    // ── V3: add tags_json to workspaces ─────────────────────────────────

    fn migrate_v3_add_workspace_tags(&self) -> Result<()> {
        if self.table_exists("workspaces")? && !self.column_exists("workspaces", "tags_json")? {
            self.conn.execute(
                "ALTER TABLE workspaces ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'",
                [],
            )?;
        }
        Ok(())
    }

    // ── V4: fix workspace_variables column changes ──────────────────────

    fn migrate_v4_fix_workspace_variables(&self) -> Result<()> {
        if self.table_exists("workspace_variables")? {
            // Old schema had `api_key_id` instead of `key_id`.
            if self.column_exists("workspace_variables", "api_key_id")? {
                self.conn.execute("DELETE FROM workspace_variables", [])?;
                self.conn
                    .execute_batch("ALTER TABLE workspace_variables DROP COLUMN api_key_id;")?;
            }
            if !self.column_exists("workspace_variables", "key_id")? {
                self.conn.execute("DELETE FROM workspace_variables", [])?;
                self.conn.execute_batch(
                    "ALTER TABLE workspace_variables ADD COLUMN key_id TEXT NOT NULL DEFAULT '';",
                )?;
            }
        }
        Ok(())
    }

    // ── helpers ─────────────────────────────────────────────────────────

    fn table_exists(&self, table: &str) -> Result<bool> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            [table],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    fn column_exists(&self, table: &str, column: &str) -> Result<bool> {
        let mut stmt = self
            .conn
            .prepare(&format!("PRAGMA table_info({})", table))?;
        let columns: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(columns.iter().any(|c| c == column))
    }
}
