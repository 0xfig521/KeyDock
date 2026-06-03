use super::{bool_to_i64, now, validate_env_name, AppStore, KEY_SELECT};
use crate::{encrypt_secret, Key, KeyInput};
use anyhow::{anyhow, Result};
use rusqlite::{params, OptionalExtension};

impl AppStore {
    pub fn create_key(&self, secret_id_or_name: &str, input: KeyInput) -> Result<Key> {
        if let Some(env_name) = input.env_name.as_deref() {
            validate_env_name(env_name)?;
        }
        let secret = self.resolve_secret(secret_id_or_name)?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = now();
        let encrypted_value = encrypt_secret(&self.master_key, &input.value)?;
        self.conn.execute(
            "INSERT INTO keys (id, secret_id, name, encrypted_value, env_name, include_by_default, tags_json, description, created_at, updated_at)
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
        self.audit("create_key", Some(&id), None, None)?;
        self.get_key_by_id(&id)?
            .ok_or_else(|| anyhow!("created key not found"))
    }

    pub fn list_keys(&self, secret_id_or_name: Option<&str>) -> Result<Vec<Key>> {
        let keys = if let Some(secret_id_or_name) = secret_id_or_name {
            let secret = self.resolve_secret(secret_id_or_name)?;
            let mut stmt = self.conn.prepare(
                &(KEY_SELECT.to_owned() + " WHERE k.secret_id = ?1 ORDER BY k.name COLLATE NOCASE"),
            )?;
            let rows = stmt.query_map([secret.id], row_to_key)?;
            rows.collect::<rusqlite::Result<Vec<_>>>()?
        } else {
            let mut stmt = self.conn.prepare(
                &(KEY_SELECT.to_owned() + " ORDER BY s.name COLLATE NOCASE, k.name COLLATE NOCASE"),
            )?;
            let rows = stmt.query_map([], row_to_key)?;
            rows.collect::<rusqlite::Result<Vec<_>>>()?
        };
        // Preview is intentionally not set here — the UI must call
        // reveal_key() to obtain the plaintext.  This avoids decrypting
        // every key on every list refresh (security + performance).
        Ok(keys)
    }

    pub fn get_key_by_id(&self, id: &str) -> Result<Option<Key>> {
        self.conn
            .query_row(
                &(KEY_SELECT.to_owned() + " WHERE k.id = ?1"),
                [id],
                row_to_key,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn resolve_key(&self, secret_and_key: &str) -> Result<Key> {
        if let Some(key) = self.get_key_by_id(secret_and_key)? {
            return Ok(key);
        }
        let (secret_name, key_name) = secret_and_key
            .split_once('/')
            .ok_or_else(|| anyhow!("key must be an id or secret/key-name: {secret_and_key}"))?;
        let secret = self.resolve_secret(secret_name)?;
        self.conn
            .query_row(
                &(KEY_SELECT.to_owned() + " WHERE k.secret_id = ?1 AND k.name = ?2"),
                params![secret.id, key_name],
                row_to_key,
            )
            .optional()?
            .ok_or_else(|| anyhow!("key not found: {secret_and_key}"))
    }

    pub fn reveal_key(&self, id_or_path: &str, workspace_id: Option<&str>) -> Result<String> {
        let key = self.resolve_key(id_or_path)?;
        let value = self.key_value(&key.id)?;
        self.audit(
            "reveal_key",
            Some(&key.id),
            workspace_id,
            key.env_name.as_deref(),
        )?;
        Ok(value)
    }

    pub fn update_key(&self, id_or_path: &str, input: KeyInput) -> Result<Key> {
        if let Some(env_name) = input.env_name.as_deref() {
            validate_env_name(env_name)?;
        }
        let key = self.resolve_key(id_or_path)?;
        let now = now();
        if input.value.is_empty() {
            self.conn.execute(
                "UPDATE keys SET name = ?2, env_name = ?3, include_by_default = ?4, tags_json = ?5, description = ?6, updated_at = ?7 WHERE id = ?1",
                params![
                    key.id,
                    input.name,
                    input.env_name,
                    bool_to_i64(input.include_by_default),
                    serde_json::to_string(&input.tags)?,
                    input.description,
                    now,
                ],
            )?;
        } else {
            let encrypted_value = encrypt_secret(&self.master_key, &input.value)?;
            self.conn.execute(
                "UPDATE keys SET name = ?2, encrypted_value = ?3, env_name = ?4, include_by_default = ?5, tags_json = ?6, description = ?7, updated_at = ?8 WHERE id = ?1",
                params![
                    key.id,
                    input.name,
                    encrypted_value,
                    input.env_name,
                    bool_to_i64(input.include_by_default),
                    serde_json::to_string(&input.tags)?,
                    input.description,
                    now,
                ],
            )?;
        }
        self.audit("edit_key", Some(&key.id), None, None)?;
        self.get_key_by_id(&key.id)?
            .ok_or_else(|| anyhow!("key not found"))
    }

    pub fn delete_key(&self, id_or_path: &str) -> Result<()> {
        let key = self.resolve_key(id_or_path)?;
        self.conn
            .execute("DELETE FROM keys WHERE id = ?1", [key.id.as_str()])?;
        self.audit("delete_key", Some(&key.id), None, key.env_name.as_deref())?;
        Ok(())
    }
}

fn row_to_key(row: &rusqlite::Row<'_>) -> rusqlite::Result<Key> {
    let tags_json: String = row.get(6)?;
    Ok(Key {
        id: row.get(0)?,
        secret_id: row.get(1)?,
        secret_name: row.get(2)?,
        name: row.get(3)?,
        env_name: row.get(4)?,
        include_by_default: row.get::<_, i64>(5)? == 1,
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
        description: row.get(7)?,
        preview: None,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}
