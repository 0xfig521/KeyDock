mod crypto;
mod models;
mod storage;
mod vault;

pub use crypto::{
    decrypt_secret, derive_key_from_password, encrypt_secret, generate_key, generate_salt,
};
pub use models::*;
pub use storage::{
    active_env_path, active_workspace_path, current_active_workspace, deactivate_workspace,
    default_database_path, format_env, format_shell_exports, install_shell_hook, shell_hook,
    shell_integration_status, AppStore,
};
pub use vault::{initialize_vault, unlock_vault, vault_status, VaultStatus};
