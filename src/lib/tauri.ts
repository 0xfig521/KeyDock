import { invoke } from "@tauri-apps/api/core"
import { openUrl } from "@tauri-apps/plugin-opener"
import type {
  Key,
  KeyInput,
  ActiveWorkspace,
  AuditLog,
  Secret,
  SecretInput,
  ShellIntegrationStatus,
  VaultStatus,
  Workspace,
  WorkspaceVariable,
} from "@/types"

// Centralized, typed wrappers for all Tauri commands in src-tauri/src/lib.rs.
// Keep parameter naming exactly aligned with #[tauri::command] argument names.

// --- Vault ---

export const getVaultStatus = () =>
  invoke<VaultStatus>("get_vault_status")

export const setupMasterPassword = (password: string) =>
  invoke<void>("setup_master_password", { password })

export const unlockMasterPassword = (password: string) =>
  invoke<void>("unlock_master_password", { password })

export const lockVault = () => invoke<void>("lock_vault")

// --- Secrets ---

export const listSecrets = (limit?: number, offset?: number) =>
  invoke<Secret[]>("list_secrets", { limit, offset })

export const createSecret = (input: SecretInput) =>
  invoke<Secret>("create_secret", { input })

export const updateSecret = (id: string, input: SecretInput) =>
  invoke<Secret>("update_secret", { id, input })

export const deleteSecret = (idOrName: string) =>
  invoke<void>("delete_secret", { idOrName })

// --- Keys ---

export const listKeys = (secret: string | null) =>
  invoke<Key[]>("list_keys", { secret })

export const createKey = (secret: string, input: KeyInput) =>
  invoke<Key>("create_key", { secret, input })

export const updateKey = (key: string, input: KeyInput) =>
  invoke<Key>("update_key", { key, input })

export const deleteKey = (key: string) =>
  invoke<void>("delete_key", { key })

export const revealKey = (key: string, workspaceId: string | null = null) =>
  invoke<string>("reveal_key", { key, workspaceId })

// --- Workspaces ---

export const listWorkspaces = () => invoke<Workspace[]>("list_workspaces")

export const createWorkspace = (name: string, description: string | null) =>
  invoke<Workspace>("create_workspace", { name, description })

export const deleteWorkspace = (idOrName: string) =>
  invoke<void>("delete_workspace", { idOrName })

// --- Variables ---

export const listWorkspaceVariables = (workspace: string) =>
  invoke<WorkspaceVariable[]>("list_workspace_variables", { workspace })

export const setWorkspaceVariable = (
  workspace: string,
  envName: string | null,
  key: string,
) =>
  invoke<WorkspaceVariable>("set_workspace_variable", {
    workspace,
    envName,
    key,
  })

export const deleteWorkspaceVariable = (workspace: string, envName: string) =>
  invoke<void>("delete_workspace_variable", { workspace, envName })

export const addSecretDefaultKeysToWorkspace = (
  workspace: string,
  secret: string,
) =>
  invoke<WorkspaceVariable[]>(
    "add_secret_default_keys_to_workspace",
    { workspace, secret },
  )

// --- Export & Audit ---

export const exportEnv = (workspace: string) =>
  invoke<string>("export_env", { workspace })

export const activateWorkspace = (workspace: string) =>
  invoke<ActiveWorkspace>("activate_workspace", { workspace })

export const activateKey = (key: string) =>
  invoke<ActiveWorkspace>("activate_key", { key })

export const deactivateActiveWorkspace = () =>
  invoke<void>("deactivate_active_workspace")

export const getActiveWorkspace = () =>
  invoke<ActiveWorkspace | null>("get_active_workspace")

export const installShellIntegration = (shell: "zsh" | "bash") =>
  invoke<string>("install_shell_integration", { shell })

export const getShellIntegrationStatus = (shell: "zsh" | "bash") =>
  invoke<ShellIntegrationStatus>("get_shell_integration_status", { shell })

/** Auto-detect shell and install the hook if missing. */
export const ensureShellHook = () =>
  invoke<boolean>("ensure_shell_hook")

/** Ensure the `keydock` CLI binary is on PATH. */
export const ensureKeydockBinary = () =>
  invoke<boolean>("ensure_keydock_binary")

export const listAuditLogs = () =>
  invoke<AuditLog[]>("list_audit_logs")

// --- Clipboard ---

export const quickCopyText = (text: string) =>
  invoke<void>("quick_copy_text", { text })

export const clearClipboardIfMatches = (expected: string) =>
  invoke<void>("clear_clipboard_if_matches", { expected })

export const auditCopy = (params: {
  targetId: string | null
  workspaceId: string | null
  envName: string | null
}) => invoke<void>("audit_copy", params)

/** Single-IPC copy: writes to system clipboard AND writes audit log. */
export const copyWithAudit = (params: {
  text: string
  targetId: string | null
  workspaceId: string | null
  envName: string | null
}) => invoke<void>("copy_with_audit", params)

/** Open a URL in the system default browser. */
export const openExternal = (url: string) => openUrl(url)
