use anyhow::{anyhow, Context, Result};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::prelude::*;
use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;

const NONCE_LEN: usize = 24;
pub const KEY_LEN: usize = 32;

pub fn encrypt_secret(master_key: &[u8], value: &str) -> Result<String> {
    if master_key.len() != KEY_LEN {
        return Err(anyhow!("master key must be 32 bytes"));
    }

    let cipher = XChaCha20Poly1305::new_from_slice(master_key)?;
    let mut nonce = [0_u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce);
    let ciphertext = cipher
        .encrypt(XNonce::from_slice(&nonce), value.as_bytes())
        .context("encrypt secret")?;

    Ok(format!(
        "v1:{}:{}",
        BASE64_STANDARD.encode(nonce),
        BASE64_STANDARD.encode(ciphertext)
    ))
}

pub fn decrypt_secret(master_key: &[u8], encoded: &str) -> Result<String> {
    if master_key.len() != KEY_LEN {
        return Err(anyhow!("master key must be 32 bytes"));
    }

    let mut parts = encoded.splitn(3, ':');
    let version = parts.next().unwrap_or_default();
    let nonce = parts
        .next()
        .ok_or_else(|| anyhow!("missing encrypted secret nonce"))?;
    let ciphertext = parts
        .next()
        .ok_or_else(|| anyhow!("missing encrypted secret payload"))?;

    if version != "v1" {
        return Err(anyhow!("unsupported encrypted secret version"));
    }

    let nonce = BASE64_STANDARD.decode(nonce)?;
    let ciphertext = BASE64_STANDARD.decode(ciphertext)?;
    let cipher = XChaCha20Poly1305::new_from_slice(master_key)?;
    let plaintext = cipher
        .decrypt(XNonce::from_slice(&nonce), ciphertext.as_ref())
        .context("decrypt secret")?;

    String::from_utf8(plaintext).context("secret is not utf-8")
}

pub fn generate_key() -> Vec<u8> {
    let mut key = vec![0_u8; KEY_LEN];
    OsRng.fill_bytes(&mut key);
    key
}

pub fn generate_salt() -> Vec<u8> {
    let mut salt = vec![0_u8; 16];
    OsRng.fill_bytes(&mut salt);
    salt
}

pub fn derive_key_from_password(password: &str, salt: &[u8]) -> Result<Vec<u8>> {
    if password.len() < 8 {
        return Err(anyhow!("master password must be at least 8 characters"));
    }
    let params = Params::new(19 * 1024, 2, 1, Some(KEY_LEN))
        .map_err(|err| anyhow!("create argon2 params: {err}"))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = vec![0_u8; KEY_LEN];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|err| anyhow!("derive key from master password: {err}"))?;
    Ok(key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let key = [7_u8; 32];
        let encrypted = encrypt_secret(&key, "sk-test").unwrap();
        assert_ne!(encrypted, "sk-test");
        assert_eq!(decrypt_secret(&key, &encrypted).unwrap(), "sk-test");
    }

    #[test]
    fn password_kdf_is_stable() {
        let salt = [9_u8; 16];
        assert_eq!(
            derive_key_from_password("correct horse battery staple", &salt).unwrap(),
            derive_key_from_password("correct horse battery staple", &salt).unwrap()
        );
    }
}
