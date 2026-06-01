mod crypto;
mod keychain;
mod models;
mod storage;
mod vault;

pub use crypto::{
    decrypt_secret, derive_key_from_password, encrypt_secret, generate_key, generate_salt,
};
pub use keychain::load_or_create_master_key;
pub use models::*;
pub use storage::{default_database_path, format_env, AppStore};
pub use vault::{initialize_vault, unlock_vault, vault_status, VaultStatus};
