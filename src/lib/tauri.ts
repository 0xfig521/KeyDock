import { invoke } from "@tauri-apps/api/core"
import type {
  ApiKey,
  ApiKeyInput,
  AuditLog,
  Secret,
  SecretInput,
  VaultStatus,
  Workspace,
  WorkspaceVariable,
} from "@/types"

// Centralized, typed wrappers for all 24 Tauri commands in src-tauri/src/lib.rs.
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

export const listSecrets = () => invoke<Secret[]>("list_secrets")

export const createSecret = (input: SecretInput) =>
  invoke<Secret>("create_secret", { input })

export const updateSecret = (id: string, input: SecretInput) =>
  invoke<Secret>("update_secret", { id, input })

export const deleteSecret = (idOrName: string) =>
  invoke<void>("delete_secret", { idOrName })

// --- API keys ---

export const listApiKeys = (secret: string | null) =>
  invoke<ApiKey[]>("list_api_keys", { secret })

export const createApiKey = (secret: string, input: ApiKeyInput) =>
  invoke<ApiKey>("create_api_key", { secret, input })

export const deleteApiKey = (apiKey: string) =>
  invoke<void>("delete_api_key", { apiKey })

export const revealApiKey = (apiKey: string) =>
  invoke<string>("reveal_api_key", { apiKey })

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
  apiKey: string,
) =>
  invoke<WorkspaceVariable>("set_workspace_variable", {
    workspace,
    envName,
    apiKey,
  })

export const deleteWorkspaceVariable = (workspace: string, envName: string) =>
  invoke<void>("delete_workspace_variable", { workspace, envName })

export const addSecretDefaultApiKeysToWorkspace = (
  workspace: string,
  secret: string,
) =>
  invoke<WorkspaceVariable[]>(
    "add_secret_default_api_keys_to_workspace",
    { workspace, secret },
  )

// --- Export & Audit ---

export const exportEnv = (workspace: string) =>
  invoke<string>("export_env", { workspace })

export const listAuditLogs = (limit: number) =>
  invoke<AuditLog[]>("list_audit_logs", { limit })

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
