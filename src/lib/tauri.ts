import { invoke } from "@tauri-apps/api/core"
import { openUrl } from "@tauri-apps/plugin-opener"
import type {
  ActivePreset,
  AuditLog,
  Preset,
  PresetEntry,
  Secret,
  SecretField,
  SecretFieldInput,
  SecretInput,
  ShellIntegrationStatus,
  VaultStatus,
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

// --- Secret Fields ---

export const listSecretFields = (secret: string) =>
  invoke<SecretField[]>("list_secret_fields", { secret })

export const createSecretField = (secret: string, input: SecretFieldInput) =>
  invoke<SecretField>("create_secret_field", { secret, input })

export const updateSecretField = (id: string, input: SecretFieldInput) =>
  invoke<SecretField>("update_secret_field", { id, input })

export const deleteSecretField = (id: string) =>
  invoke<void>("delete_secret_field", { id })

export const revealSecretField = (id: string) =>
  invoke<string>("reveal_secret_field", { id })

export const reorderSecretFields = (secret: string, fieldIds: string[]) =>
  invoke<SecretField[]>("reorder_secret_fields", { secret, fieldIds })

// --- Preset Entries ---

export const addPresetEntry = (
  preset: string,
  fieldId: string,
  envName?: string | null,
) => invoke<PresetEntry>("add_preset_entry", { preset, fieldId, envName })

export const listPresetEntries = (preset: string) =>
  invoke<PresetEntry[]>("list_preset_entries", { preset })

export const removePresetEntry = (preset: string, envName: string) =>
  invoke<void>("remove_preset_entry", { preset, envName })

export const exportPresetEnv = (preset: string) =>
  invoke<string>("export_preset_env", { preset })

// --- Shell Integration & Audit ---

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

/** Single-IPC copy: writes to system clipboard AND writes audit log. */
export const copyWithAudit = (params: {
  text: string
  targetId: string | null
  envName: string | null
}) => invoke<void>("copy_with_audit", { ...params, presetId: null as string | null })

// --- Presets ---

export const listPresets = () => invoke<Preset[]>("list_presets")

export const createPreset = (name: string, description: string | null) =>
  invoke<Preset>("create_preset", { name, description })

export const deletePreset = (idOrName: string) =>
  invoke<void>("delete_preset", { idOrName })

export const includePreset = (preset: string, included: string) =>
  invoke<void>("include_preset", { preset, included })

export const removeIncludePreset = (preset: string, included: string) =>
  invoke<void>("remove_include_preset", { preset, included })

export const listPresetIncludes = (preset: string) =>
  invoke<string[]>("list_preset_includes", { preset })

export const activatePreset = (preset: string) =>
  invoke<ActivePreset>("activate_preset", { preset })

export const getActivePreset = () =>
  invoke<ActivePreset | null>("get_active_preset")

export const deactivateActivePreset = () =>
  invoke<void>("deactivate_active_preset")

export const openKeydockFolder = () =>
  invoke<void>("open_keydock_folder")

export const previewPreset = (preset: string) =>
  invoke<string[]>("preview_preset", { preset })

export const listPresetTemplates = () =>
  invoke<string[]>("list_preset_templates")

/** Open a URL in the system default browser. */
export const openExternal = (url: string) => openUrl(url)
