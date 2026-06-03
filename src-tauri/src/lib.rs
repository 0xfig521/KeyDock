use keydock_core::{
    active_workspace_path, current_active_workspace, deactivate_workspace, default_database_path,
    format_env, initialize_vault, install_shell_hook, shell_integration_status, unlock_vault,
    vault_status, ActiveWorkspace, AppStore, AuditLog, Key, KeyInput, Secret, SecretInput,
    ShellIntegrationStatus, VaultStatus, Workspace, WorkspaceVariable,
};
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::{path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Emitter, State};

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
    store: Mutex<Option<AppStore>>,
}

impl AppState {
    /// Acquire the store lock and run a closure against the cached AppStore.
    /// The AppStore is opened once on vault unlock and reused for all
    /// subsequent commands, avoiding a new SQLite connection + migration
    /// check on every IPC call.
    fn with_store<T>(&self, f: impl FnOnce(&AppStore) -> anyhow::Result<T>) -> anyhow::Result<T> {
        let guard = self
            .store
            .lock()
            .map_err(|_| anyhow::anyhow!("vault state is poisoned"))?;
        match guard.as_ref() {
            Some(store) => f(store),
            None => Err(anyhow::anyhow!("vault is locked")),
        }
    }
}

#[tauri::command]
fn get_vault_status(state: State<'_, AppState>) -> CommandResult<VaultStatus> {
    Ok(vault_status(&state.db_path)?)
}

#[tauri::command]
fn setup_master_password(state: State<'_, AppState>, password: String) -> CommandResult<()> {
    let dek = initialize_vault(&state.db_path, &password)?;
    let store = AppStore::open(state.db_path.clone(), dek)?;
    *state
        .store
        .lock()
        .map_err(|_| anyhow::anyhow!("vault state is poisoned"))? = Some(store);
    Ok(())
}

#[tauri::command]
fn unlock_master_password(state: State<'_, AppState>, password: String) -> CommandResult<()> {
    let dek = unlock_vault(&state.db_path, &password)?;
    let store = AppStore::open(state.db_path.clone(), dek)?;
    *state
        .store
        .lock()
        .map_err(|_| anyhow::anyhow!("vault state is poisoned"))? = Some(store);
    Ok(())
}

#[tauri::command]
fn lock_vault(state: State<'_, AppState>) -> CommandResult<()> {
    *state
        .store
        .lock()
        .map_err(|_| anyhow::anyhow!("vault state is poisoned"))? = None;
    Ok(())
}

#[tauri::command]
fn list_secrets(
    state: State<'_, AppState>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> CommandResult<Vec<Secret>> {
    Ok(state.with_store(|s| s.list_secrets(limit, offset))?)
}

#[tauri::command]
fn create_secret(state: State<'_, AppState>, input: SecretInput) -> CommandResult<Secret> {
    Ok(state.with_store(|s| s.create_secret(input))?)
}

#[tauri::command]
fn update_secret(
    state: State<'_, AppState>,
    id: String,
    input: SecretInput,
) -> CommandResult<Secret> {
    Ok(state.with_store(|s| s.update_secret(&id, input))?)
}

#[tauri::command]
fn delete_secret(state: State<'_, AppState>, id_or_name: String) -> CommandResult<()> {
    Ok(state.with_store(|s| s.delete_secret(&id_or_name))?)
}

#[tauri::command]
fn list_keys(state: State<'_, AppState>, secret: Option<String>) -> CommandResult<Vec<Key>> {
    Ok(state.with_store(|s| s.list_keys(secret.as_deref()))?)
}

#[tauri::command]
fn create_key(state: State<'_, AppState>, secret: String, input: KeyInput) -> CommandResult<Key> {
    Ok(state.with_store(|s| s.create_key(&secret, input))?)
}

#[tauri::command]
fn update_key(state: State<'_, AppState>, key: String, input: KeyInput) -> CommandResult<Key> {
    Ok(state.with_store(|s| s.update_key(&key, input))?)
}

#[tauri::command]
fn delete_key(state: State<'_, AppState>, key: String) -> CommandResult<()> {
    Ok(state.with_store(|s| s.delete_key(&key))?)
}

#[tauri::command]
fn reveal_key(
    state: State<'_, AppState>,
    key: String,
    workspace_id: Option<String>,
) -> CommandResult<String> {
    Ok(state.with_store(|s| s.reveal_key(&key, workspace_id.as_deref()))?)
}

#[tauri::command]
fn list_workspaces(state: State<'_, AppState>) -> CommandResult<Vec<Workspace>> {
    Ok(state.with_store(|s| s.list_workspaces())?)
}

#[tauri::command]
fn create_workspace(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
) -> CommandResult<Workspace> {
    Ok(state.with_store(|s| s.create_workspace(&name, description.as_deref()))?)
}

#[tauri::command]
fn delete_workspace(state: State<'_, AppState>, id_or_name: String) -> CommandResult<()> {
    Ok(state.with_store(|s| s.delete_workspace(&id_or_name))?)
}

#[tauri::command]
fn set_workspace_variable(
    state: State<'_, AppState>,
    workspace: String,
    env_name: Option<String>,
    key: String,
) -> CommandResult<WorkspaceVariable> {
    Ok(state.with_store(|s| s.set_workspace_variable(&workspace, env_name.as_deref(), &key))?)
}

#[tauri::command]
fn add_secret_default_keys_to_workspace(
    state: State<'_, AppState>,
    workspace: String,
    secret: String,
) -> CommandResult<Vec<WorkspaceVariable>> {
    Ok(state.with_store(|s| s.add_secret_default_keys_to_workspace(&workspace, &secret))?)
}

#[tauri::command]
fn list_workspace_variables(
    state: State<'_, AppState>,
    workspace: String,
) -> CommandResult<Vec<WorkspaceVariable>> {
    Ok(state.with_store(|s| s.list_workspace_variables(&workspace))?)
}

#[tauri::command]
fn delete_workspace_variable(
    state: State<'_, AppState>,
    workspace: String,
    env_name: String,
) -> CommandResult<()> {
    Ok(state.with_store(|s| s.delete_workspace_variable(&workspace, &env_name))?)
}

#[tauri::command]
fn export_env(state: State<'_, AppState>, workspace: String) -> CommandResult<String> {
    Ok(state.with_store(|s| s.export_env_text(&workspace))?)
}

#[tauri::command]
fn activate_workspace(
    app: AppHandle,
    state: State<'_, AppState>,
    workspace: String,
) -> CommandResult<ActiveWorkspace> {
    let active = state.with_store(|s| s.activate_workspace(&workspace))?;
    let _ = app.emit("active-workspace-changed", ());
    Ok(active)
}

#[tauri::command]
fn activate_key(
    app: AppHandle,
    state: State<'_, AppState>,
    key: String,
) -> CommandResult<ActiveWorkspace> {
    let active = state.with_store(|s| s.activate_key(&key))?;
    let _ = app.emit("active-workspace-changed", ());
    Ok(active)
}

#[tauri::command]
fn deactivate_active_workspace(app: AppHandle) -> CommandResult<()> {
    deactivate_workspace()?;
    let _ = app.emit("active-workspace-changed", ());
    Ok(())
}

#[tauri::command]
fn get_active_workspace() -> CommandResult<Option<ActiveWorkspace>> {
    Ok(current_active_workspace()?)
}

#[tauri::command]
fn install_shell_integration(shell: String) -> CommandResult<String> {
    Ok(install_shell_hook(&shell)?.display().to_string())
}

/// Auto-detect the user's shell and install the KeyDock hook if not
/// already present.  Returns `true` when the hook was freshly installed.
#[tauri::command]
fn ensure_shell_hook() -> CommandResult<bool> {
    let shell = if cfg!(target_os = "macos") {
        "zsh"
    } else {
        "bash"
    };
    let status = shell_integration_status(shell)?;
    if status.installed {
        return Ok(false);
    }
    install_shell_hook(shell)?;
    Ok(true)
}

/// Ensure the `keydock` CLI binary is on PATH by copying it to
/// `~/.local/bin/keydock` (XDG-standard user-bin directory).
/// Returns `true` when freshly installed.
#[tauri::command]
fn ensure_keydock_binary() -> CommandResult<bool> {
    // Already on PATH?
    let on_path = std::process::Command::new("which")
        .arg("keydock")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if on_path {
        return Ok(false);
    }

    let src = crate::cli_binary_source();
    if !src.exists() {
        return Err(CommandError {
            message: format!(
                "keydock binary not found at {}. Build it with `cargo build -p keydock-cli`",
                src.display()
            ),
        });
    }

    let local_bin = std::path::Path::new(&std::env::var("HOME").map_err(|_| CommandError {
        message: "cannot find home directory".into(),
    })?)
    .join(".local")
    .join("bin");
    std::fs::create_dir_all(&local_bin).map_err(|e| CommandError {
        message: format!("create ~/.local/bin: {e}"),
    })?;

    let dest = local_bin.join("keydock");
    std::fs::copy(&src, &dest).map_err(|e| CommandError {
        message: format!("copy keydock binary: {e}"),
    })?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&dest, std::fs::Permissions::from_mode(0o755)).map_err(|e| {
            CommandError {
                message: format!("chmod +x keydock: {e}"),
            }
        })?;
    }

    Ok(true)
}

#[tauri::command]
fn get_shell_integration_status(shell: String) -> CommandResult<ShellIntegrationStatus> {
    Ok(shell_integration_status(&shell)?)
}

#[tauri::command]
fn export_secret_env(state: State<'_, AppState>, secret: String) -> CommandResult<String> {
    let env = state.with_store(|s| s.secret_env(&secret))?;
    Ok(format_env(env))
}

#[tauri::command]
fn list_audit_logs(state: State<'_, AppState>) -> CommandResult<Vec<AuditLog>> {
    Ok(state.with_store(|s| s.list_audit_logs(50))?)
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

/// Single-IPC copy: writes to system clipboard AND writes audit log in one
/// Tauri round-trip. Replaces the two-call pattern (quick_copy_text + audit_copy).
#[tauri::command]
fn copy_with_audit(
    state: State<'_, AppState>,
    text: String,
    target_id: Option<String>,
    workspace_id: Option<String>,
    env_name: Option<String>,
) -> CommandResult<()> {
    let mut clipboard = arboard::Clipboard::new().map_err(anyhow::Error::from)?;
    clipboard.set_text(text).map_err(anyhow::Error::from)?;
    state.with_store(|s| {
        s.audit(
            "copy",
            target_id.as_deref(),
            workspace_id.as_deref(),
            env_name.as_deref(),
        )
    })?;
    Ok(())
}

#[tauri::command]
fn audit_copy(
    state: State<'_, AppState>,
    target_id: Option<String>,
    workspace_id: Option<String>,
    env_name: Option<String>,
) -> CommandResult<()> {
    Ok(state.with_store(|s| {
        s.audit(
            "copy",
            target_id.as_deref(),
            workspace_id.as_deref(),
            env_name.as_deref(),
        )
    })?)
}

/// Resolve the `keydock` CLI binary path at compile time.
/// In debug builds → `target/debug/keydock`; release → `target/release/keydock`.
fn cli_binary_source() -> std::path::PathBuf {
    let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let profile = if cfg!(debug_assertions) {
        "debug"
    } else {
        "release"
    };
    manifest
        .parent()
        .expect("src-tauri is inside project root")
        .join("target")
        .join(profile)
        .join("keydock")
}

/// Watch active_workspace.json for changes from CLI and notify the frontend.
fn spawn_active_workspace_watcher(app: tauri::AppHandle) {
    let path = match active_workspace_path() {
        Ok(p) => p,
        Err(_) => return,
    };
    let Some(dir) = path.parent() else { return };
    if !dir.exists() {
        return;
    }

    let (tx, rx) = std::sync::mpsc::channel::<Result<notify::Event, notify::Error>>();

    let Ok(mut watcher) = RecommendedWatcher::new(tx, Config::default()) else {
        return;
    };
    if watcher.watch(dir, RecursiveMode::NonRecursive).is_err() {
        return;
    }

    std::thread::spawn(move || {
        let _watcher = watcher;
        for event in rx {
            let Ok(event) = event else { continue };
            if !event.paths.iter().any(|p| p == &path) {
                continue;
            }
            let _ = app.emit("active-workspace-changed", ());
        }
    });
}

pub fn run() {
    let db_path = default_database_path().expect("resolve KeyDock database path");
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            db_path,
            store: Mutex::new(None),
        })
        .setup(|app| {
            spawn_active_workspace_watcher(app.handle().clone());
            Ok(())
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
            list_keys,
            create_key,
            update_key,
            delete_key,
            reveal_key,
            list_workspaces,
            create_workspace,
            delete_workspace,
            set_workspace_variable,
            add_secret_default_keys_to_workspace,
            list_workspace_variables,
            delete_workspace_variable,
            export_env,
            activate_workspace,
            activate_key,
            deactivate_active_workspace,
            get_active_workspace,
            ensure_shell_hook,
            ensure_keydock_binary,
            install_shell_integration,
            get_shell_integration_status,
            export_secret_env,
            list_audit_logs,
            quick_copy_text,
            clear_clipboard_if_matches,
            copy_with_audit,
            audit_copy
        ])
        .run(tauri::generate_context!())
        .expect("error while running KeyDock");
}
