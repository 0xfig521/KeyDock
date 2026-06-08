mod crypto;
mod models;
mod storage;
mod vault;

pub use storage::presets;

pub use crypto::{
    decrypt_secret, derive_key_from_password, encrypt_secret, generate_key, generate_salt,
};
pub use models::*;
pub use storage::{
    active_env_path, active_preset_path, current_active_preset, deactivate_active_preset,
    default_database_path, format_env, format_shell_exports, install_shell_hook,
    keydock_config_dir, list_preset_templates, shell_hook, shell_integration_status, AppStore,
};
pub use vault::{initialize_vault, unlock_vault, vault_status, VaultStatus};
