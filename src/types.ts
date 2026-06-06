// Domain types — mirror crates/keydock-core/src/models.rs (serde camelCase).
// Keep these aligned with the Rust structs; extra Rust fields are ignored at runtime.

// --- Secrets & Keys ---

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
  tags: string[]
  description: string | null
  dashboardUrl: string | null
  docsUrl: string | null
  loginUrl: string | null
  notes: string | null
}

export interface Key {
  id: string
  secretId: string
  secretName?: string | null
  name: string
  envName?: string | null
  includeByDefault: boolean
  tags: string[]
  preview?: string | null
  expiresAt?: string | null
}

export interface KeyInput {
  name: string
  value: string
  envName: string | null
  includeByDefault: boolean
  tags: string[]
  description: string | null
  expiresAt: string | null
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
  keyId: string
  keyName?: string | null
  envName: string
  preview?: string | null
  enabled: boolean
  required: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ActiveWorkspace {
  id: string
  name: string
  sourceType: "workspace" | "key" | string
  envCount: number
  envNames: string[]
}

export interface ShellIntegrationStatus {
  shell: string
  installed: boolean
  rcPath: string
}

// --- Audit ---

export interface AuditLog {
  id: string
  action: string
  targetId?: string | null
  targetName?: string | null
  workspaceId?: string | null
  workspaceName?: string | null
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
  tags: string
  description: string
  dashboardUrl: string
  docsUrl: string
  loginUrl: string
}

export interface KeyForm {
  name: string
  value: string
  envName: string
  includeByDefault: boolean
  tags: string
  expiresAt: string
}

export interface PresetDef {
  name: string
  category: SecretCategory
  baseUrl: string
  tags: string
  description?: string
  key: { name: string; env: string }
}
