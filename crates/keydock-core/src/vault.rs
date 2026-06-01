use crate::{
    decrypt_secret, derive_key_from_password, encrypt_secret, generate_key, generate_salt,
};
use anyhow::{anyhow, Result};
use base64::prelude::*;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

const KDF_SALT: &str = "kdf_salt";
const ENCRYPTED_DEK: &str = "encrypted_dek";

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultStatus {
    pub initialized: bool,
}

pub fn vault_status(path: &Path) -> Result<VaultStatus> {
    let conn = Connection::open(path)?;
    ensure_meta_table(&conn)?;
    Ok(VaultStatus {
        initialized: get_meta(&conn, ENCRYPTED_DEK)?.is_some(),
    })
}

pub fn initialize_vault(path: &Path, password: &str) -> Result<Vec<u8>> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(path)?;
    ensure_meta_table(&conn)?;
    if get_meta(&conn, ENCRYPTED_DEK)?.is_some() {
        return Err(anyhow!("vault is already initialized"));
    }

    let salt = generate_salt();
    let kek = derive_key_from_password(password, &salt)?;
    let dek = generate_key();
    let encoded_dek = BASE64_STANDARD.encode(&dek);
    let encrypted_dek = encrypt_secret(&kek, &encoded_dek)?;

    set_meta(&conn, KDF_SALT, &BASE64_STANDARD.encode(salt))?;
    set_meta(&conn, ENCRYPTED_DEK, &encrypted_dek)?;
    Ok(dek)
}

pub fn unlock_vault(path: &Path, password: &str) -> Result<Vec<u8>> {
    let conn = Connection::open(path)?;
    ensure_meta_table(&conn)?;
    let salt = get_meta(&conn, KDF_SALT)?.ok_or_else(|| anyhow!("vault is not initialized"))?;
    let encrypted_dek =
        get_meta(&conn, ENCRYPTED_DEK)?.ok_or_else(|| anyhow!("vault is not initialized"))?;
    let salt = BASE64_STANDARD.decode(salt)?;
    let kek = derive_key_from_password(password, &salt)?;
    let encoded_dek = decrypt_secret(&kek, &encrypted_dek)?;
    BASE64_STANDARD.decode(encoded_dek).map_err(Into::into)
}

fn ensure_meta_table(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS vault_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        [],
    )?;
    Ok(())
}

fn get_meta(conn: &Connection, key: &str) -> Result<Option<String>> {
    conn.query_row(
        "SELECT value FROM vault_meta WHERE key = ?1",
        [key],
        |row| row.get(0),
    )
    .optional()
    .map_err(Into::into)
}

fn set_meta(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO vault_meta (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}
