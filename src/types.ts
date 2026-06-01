// Domain types — mirror crates/keydock-core/src/models.rs (serde camelCase).
// Keep these aligned with the Rust structs; extra Rust fields are ignored at runtime.

// --- Secrets & API keys ---

export type SecretCategory =
  | "aI"
  | "cloud"
  | "search"
  | "database"
  | "devTool"
  | "payment"
  | "custom"

export const SECRET_CATEGORIES: SecretCategory[] = [
  "aI",
  "cloud",
  "search",
  "database",
  "devTool",
  "payment",
  "custom",
]

export interface Secret {
  id: string
  name: string
  category: SecretCategory
  baseUrl?: string | null
  modelName?: string | null
  tags: string[]
  description?: string | null
  dashboardUrl?: string | null
  docsUrl?: string | null
  loginUrl?: string | null
  notes?: string | null
}

export interface SecretInput {
  name: string
  category: SecretCategory
  baseUrl: string | null
  modelName: string | null
  tags: string[]
  description: string | null
  dashboardUrl: string | null
  docsUrl: string | null
  loginUrl: string | null
  notes: string | null
}

export interface ApiKey {
  id: string
  secretId: string
  secretName?: string | null
  name: string
  envName?: string | null
  includeByDefault: boolean
  tags: string[]
}

export interface ApiKeyInput {
  name: string
  value: string
  envName: string | null
  includeByDefault: boolean
  tags: string[]
  description: string | null
}

// --- Workspaces ---

export interface Workspace {
  id: string
  name: string
  description?: string | null
  tags: string[]
}

export interface WorkspaceVariable {
  id: string
  workspaceId: string
  secretId: string
  secretName?: string | null
  apiKeyId: string
  apiKeyName?: string | null
  envName: string
  enabled: boolean
}

// --- Audit ---

export interface AuditLog {
  id: string
  action: string
  targetId?: string | null
  workspaceId?: string | null
  envName?: string | null
  createdAt: string
}

export interface VaultStatus {
  initialized: boolean
}

// --- Forms (frontend-only state) ---

export interface SecretForm {
  name: string
  category: SecretCategory
  baseUrl: string
  modelName: string
  tags: string
  description: string
  dashboardUrl: string
}

export interface ApiKeyForm {
  name: string
  value: string
  envName: string
  includeByDefault: boolean
  tags: string
}

export interface PresetDef {
  name: string
  category: SecretCategory
  baseUrl: string
  modelName: string
  tags: string
  description?: string
  apiKey: { name: string; env: string }
}
