use keydock_core::{
    default_database_path, format_env, initialize_vault, unlock_vault, vault_status, AppStore,
    ApiKey, ApiKeyInput, AuditLog, Secret, SecretInput, VaultStatus, Workspace, WorkspaceVariable,
};
use serde::Serialize;
use std::{path::PathBuf, sync::Mutex};
use tauri::State;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandError {
    message: String,
}

impl From<anyhow::Error> for CommandError {
    fn from(value: anyhow::Error) -> Self {
        Self {
            message: value.to_string(),
        }
    }
}

type CommandResult<T> = Result<T, CommandError>;

struct AppState {
    db_path: PathBuf,
    dek: Mutex<Option<Vec<u8>>>,
}

impl AppState {
    fn store(&self) -> Result<AppStore, anyhow::Error> {
        let dek = self
            .dek
            .lock()
            .map_err(|_| anyhow::anyhow!("vault state is poisoned"))?
            .clone()
            .ok_or_else(|| anyhow::anyhow!("vault is locked"))?;
        AppStore::open(self.db_path.clone(), dek)
    }
}

#[tauri::command]
fn get_vault_status(state: State<'_, AppState>) -> CommandResult<VaultStatus> {
    Ok(vault_status(&state.db_path)?)
}

#[tauri::command]
fn setup_master_password(state: State<'_, AppState>, password: String) -> CommandResult<()> {
    let dek = initialize_vault(&state.db_path, &password)?;
    *state
        .dek
        .lock()
        .map_err(|_| anyhow::anyhow!("vault state is poisoned"))? = Some(dek);
    Ok(())
}

#[tauri::command]
fn unlock_master_password(state: State<'_, AppState>, password: String) -> CommandResult<()> {
    let dek = unlock_vault(&state.db_path, &password)?;
    *state
        .dek
        .lock()
        .map_err(|_| anyhow::anyhow!("vault state is poisoned"))? = Some(dek);
    Ok(())
}

#[tauri::command]
fn lock_vault(state: State<'_, AppState>) -> CommandResult<()> {
    *state
        .dek
        .lock()
        .map_err(|_| anyhow::anyhow!("vault state is poisoned"))? = None;
    Ok(())
}

#[tauri::command]
fn list_secrets(state: State<'_, AppState>) -> CommandResult<Vec<Secret>> {
    Ok(state.store()?.list_secrets()?)
}

#[tauri::command]
fn create_secret(state: State<'_, AppState>, input: SecretInput) -> CommandResult<Secret> {
    Ok(state.store()?.create_secret(input)?)
}

#[tauri::command]
fn update_secret(
    state: State<'_, AppState>,
    id: String,
    input: SecretInput,
) -> CommandResult<Secret> {
    Ok(state.store()?.update_secret(&id, input)?)
}

#[tauri::command]
fn delete_secret(state: State<'_, AppState>, id_or_name: String) -> CommandResult<()> {
    Ok(state.store()?.delete_secret(&id_or_name)?)
}

#[tauri::command]
fn list_api_keys(
    state: State<'_, AppState>,
    secret: Option<String>,
) -> CommandResult<Vec<ApiKey>> {
    Ok(state.store()?.list_api_keys(secret.as_deref())?)
}

#[tauri::command]
fn create_api_key(
    state: State<'_, AppState>,
    secret: String,
    input: ApiKeyInput,
) -> CommandResult<ApiKey> {
    Ok(state.store()?.create_api_key(&secret, input)?)
}

#[tauri::command]
fn delete_api_key(state: State<'_, AppState>, api_key: String) -> CommandResult<()> {
    Ok(state.store()?.delete_api_key(&api_key)?)
}

#[tauri::command]
fn reveal_api_key(state: State<'_, AppState>, api_key: String) -> CommandResult<String> {
    Ok(state.store()?.reveal_api_key(&api_key)?)
}

#[tauri::command]
fn list_workspaces(state: State<'_, AppState>) -> CommandResult<Vec<Workspace>> {
    Ok(state.store()?.list_workspaces()?)
}

#[tauri::command]
fn create_workspace(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
) -> CommandResult<Workspace> {
    Ok(state
        .store()?
        .create_workspace(&name, description.as_deref())?)
}

#[tauri::command]
fn delete_workspace(state: State<'_, AppState>, id_or_name: String) -> CommandResult<()> {
    Ok(state.store()?.delete_workspace(&id_or_name)?)
}

#[tauri::command]
fn set_workspace_variable(
    state: State<'_, AppState>,
    workspace: String,
    env_name: Option<String>,
    api_key: String,
) -> CommandResult<WorkspaceVariable> {
    Ok(state
        .store()?
        .set_workspace_variable(&workspace, env_name.as_deref(), &api_key)?)
}

#[tauri::command]
fn add_secret_default_api_keys_to_workspace(
    state: State<'_, AppState>,
    workspace: String,
    secret: String,
) -> CommandResult<Vec<WorkspaceVariable>> {
    Ok(state
        .store()?
        .add_secret_default_api_keys_to_workspace(&workspace, &secret)?)
}

#[tauri::command]
fn list_workspace_variables(
    state: State<'_, AppState>,
    workspace: String,
) -> CommandResult<Vec<WorkspaceVariable>> {
    Ok(state.store()?.list_workspace_variables(&workspace)?)
}

#[tauri::command]
fn delete_workspace_variable(
    state: State<'_, AppState>,
    workspace: String,
    env_name: String,
) -> CommandResult<()> {
    Ok(state
        .store()?
        .delete_workspace_variable(&workspace, &env_name)?)
}

#[tauri::command]
fn export_env(state: State<'_, AppState>, workspace: String) -> CommandResult<String> {
    Ok(state.store()?.export_env_text(&workspace)?)
}

#[tauri::command]
fn export_secret_env(state: State<'_, AppState>, secret: String) -> CommandResult<String> {
    Ok(format_env(state.store()?.secret_env(&secret)?))
}

#[tauri::command]
fn list_audit_logs(state: State<'_, AppState>, limit: u32) -> CommandResult<Vec<AuditLog>> {
    Ok(state.store()?.list_audit_logs(limit)?)
}

#[tauri::command]
fn quick_copy_text(text: String) -> CommandResult<()> {
    let mut clipboard = arboard::Clipboard::new().map_err(anyhow::Error::from)?;
    clipboard.set_text(text).map_err(anyhow::Error::from)?;
    Ok(())
}

#[tauri::command]
fn clear_clipboard_if_matches(expected: String) -> CommandResult<()> {
    let mut clipboard = arboard::Clipboard::new().map_err(anyhow::Error::from)?;
    if clipboard.get_text().ok().as_deref() == Some(expected.as_str()) {
        clipboard.set_text("").map_err(anyhow::Error::from)?;
    }
    Ok(())
}

#[tauri::command]
fn audit_copy(
    state: State<'_, AppState>,
    target_id: Option<String>,
    workspace_id: Option<String>,
    env_name: Option<String>,
) -> CommandResult<()> {
    Ok(state.store()?.audit(
        "copy",
        target_id.as_deref(),
        workspace_id.as_deref(),
        env_name.as_deref(),
    )?)
}

pub fn run() {
    let db_path = default_database_path().expect("resolve KeyDock database path");
    tauri::Builder::default()
        .manage(AppState {
            db_path,
            dek: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_vault_status,
            setup_master_password,
            unlock_master_password,
            lock_vault,
            list_secrets,
            create_secret,
            update_secret,
            delete_secret,
            list_api_keys,
            create_api_key,
            delete_api_key,
            reveal_api_key,
            list_workspaces,
            create_workspace,
            delete_workspace,
            set_workspace_variable,
            add_secret_default_api_keys_to_workspace,
            list_workspace_variables,
            delete_workspace_variable,
            export_env,
            export_secret_env,
            list_audit_logs,
            quick_copy_text,
            clear_clipboard_if_matches,
            audit_copy
        ])
        .run(tauri::generate_context!())
        .expect("error while running KeyDock");
}
