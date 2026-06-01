import React, { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { createRoot } from "react-dom/client"
import {
  KeyRoundIcon,
  LayersIcon,
  ShieldCheckIcon,
  RefreshCcwIcon,
  PlusIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  Trash2Icon,
  TerminalIcon,
  SearchIcon,
  ExternalLinkIcon,
  CheckIcon,
  CopyIcon,
  CodeIcon,
  ShieldIcon,
  CompassIcon,
  HelpCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import "./styles.css"

// --- TYPES ---
type SecretCategory =
  | "aI"
  | "cloud"
  | "search"
  | "database"
  | "devTool"
  | "payment"
  | "custom"

interface Secret {
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

interface ApiKey {
  id: string
  secretId: string
  secretName?: string | null
  name: string
  envName?: string | null
  includeByDefault: boolean
  tags: string[]
}

interface Workspace {
  id: string
  name: string
  description?: string | null
  tags: string[]
}

interface WorkspaceVariable {
  id: string
  workspaceId: string
  secretId: string
  secretName?: string | null
  apiKeyId: string
  apiKeyName?: string | null
  envName: string
  enabled: boolean
}

interface AuditLog {
  id: string
  action: string
  targetId?: string | null
  workspaceId?: string | null
  envName?: string | null
  createdAt: string
}

interface SecretForm {
  name: string
  category: SecretCategory
  baseUrl: string
  modelName: string
  tags: string
  description: string
  dashboardUrl: string
}

interface ApiKeyForm {
  name: string
  value: string
  envName: string
  includeByDefault: boolean
  tags: string
}

interface ToastMessage {
  message: string
  type: "info" | "success" | "error"
}

// --- CONSTANTS & PRESETS ---
const emptySecretForm: SecretForm = {
  name: "",
  category: "aI",
  baseUrl: "",
  modelName: "",
  tags: "",
  description: "",
  dashboardUrl: "",
}

const emptyApiKeyForm: ApiKeyForm = {
  name: "",
  value: "",
  envName: "",
  includeByDefault: true,
  tags: "",
}

const presets = [
  {
    name: "OpenRouter",
    category: "aI" as SecretCategory,
    baseUrl: "https://openrouter.ai/api/v1",
    modelName: "anthropic/claude-3.5-sonnet",
    tags: "ai,llm",
    apiKey: {
      name: "default",
      env: "OPENAI_API_KEY",
    },
  },
  {
    name: "DeepSeek",
    category: "aI" as SecretCategory,
    baseUrl: "https://api.deepseek.com/v1",
    modelName: "deepseek-chat",
    tags: "ai,llm",
    apiKey: {
      name: "default",
      env: "DEEPSEEK_API_KEY",
    },
  },
  {
    name: "Cloudflare",
    category: "cloud" as SecretCategory,
    baseUrl: "https://api.cloudflare.com/client/v4",
    modelName: "",
    tags: "cloud,cdn",
    apiKey: {
      name: "default",
      env: "CLOUDFLARE_API_TOKEN",
    },
  },
  {
    name: "Tavily",
    category: "search" as SecretCategory,
    baseUrl: "https://api.tavily.com",
    modelName: "",
    tags: "search",
    apiKey: {
      name: "default",
      env: "TAVILY_API_KEY",
    },
  },
]

// --- APP COMPONENT ---
function App() {
  // Vault state
  const [vaultReady, setVaultReady] = useState(false)
  const [vaultInitialized, setVaultInitialized] = useState(false)
  const [masterPassword, setMasterPassword] = useState("")

  // Master data
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [variables, setVariables] = useState<WorkspaceVariable[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  // Selected entities
  const [selectedSecret, setSelectedSecret] = useState("")
  const [selectedWorkspace, setSelectedWorkspace] = useState("")

  // Navigation and Filter state
  const [activeTab, setActiveTab] = useState<"secrets" | "workspaces" | "audit">("secrets")
  const [secretSearch, setSecretSearch] = useState("")
  const [copiedText, setCopiedText] = useState("") // Track active copied text for visual indicator

  // Inline forms toggles & binding states
  const [showSecretForm, setShowSecretForm] = useState(false)
  const [showApiKeyForm, setShowApiKeyForm] = useState(false)
  const [secretForm, setSecretForm] = useState<SecretForm>(emptySecretForm)
  const [apiKeyForm, setApiKeyForm] = useState<ApiKeyForm>(emptyApiKeyForm)
  const [workspaceFormName, setWorkspaceFormName] = useState("")

  // Workspace composition mappings
  const [mappingEnv, setMappingEnv] = useState("")
  const [mappingApiKey, setMappingApiKey] = useState("")
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [exportedEnv, setExportedEnv] = useState("")

  // Notifications
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Trigger floating toast
  const showToast = (message: string, type: "info" | "success" | "error" = "info") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Force dark mode on component load
  useEffect(() => {
    document.documentElement.classList.add("dark")
  }, [])

  // Check vault status initially
  useEffect(() => {
    invoke<{ initialized: boolean }>("get_vault_status")
      .then((status) => {
        setVaultInitialized(status.initialized)
      })
      .catch(showError)
  }, [])

  // Auto-refresh variables when workspace selection changes
  useEffect(() => {
    if (!vaultReady || !selectedWorkspace) return
    invoke<WorkspaceVariable[]>("list_workspace_variables", {
      workspace: selectedWorkspace,
    })
      .then(setVariables)
      .catch(showError)
  }, [selectedWorkspace, vaultReady])

  // Memoized lookups
  const selectedSecretModel = useMemo(
    () => secrets.find((s) => s.id === selectedSecret),
    [selectedSecret, secrets]
  )

  const selectedWorkspaceModel = useMemo(
    () => workspaces.find((w) => w.id === selectedWorkspace),
    [selectedWorkspace, workspaces]
  )

  const selectedApiKeys = useMemo(
    () => apiKeys.filter((k) => k.secretId === selectedSecret),
    [apiKeys, selectedSecret]
  )

  const filteredSecrets = useMemo(() => {
    return secrets.filter((s) =>
      s.name.toLowerCase().includes(secretSearch.toLowerCase()) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(secretSearch.toLowerCase())))
    )
  }, [secrets, secretSearch])

  // --- ACTIONS & API INVOKES ---
  async function refresh(preferredSecret?: string, preferredWorkspace?: string) {
    try {
      const [nextSecrets, nextApiKeys, nextWorkspaces, nextLogs] = await Promise.all([
        invoke<Secret[]>("list_secrets"),
        invoke<ApiKey[]>("list_api_keys", { secret: null }),
        invoke<Workspace[]>("list_workspaces"),
        invoke<AuditLog[]>("list_audit_logs", { limit: 50 }),
      ])

      setSecrets(nextSecrets)
      setApiKeys(nextApiKeys)
      setWorkspaces(nextWorkspaces)
      setAuditLogs(nextLogs)

      const nextSecret = preferredSecret || selectedSecret || nextSecrets[0]?.id || ""
      const workspace = preferredWorkspace || selectedWorkspace || nextWorkspaces[0]?.id || ""

      setSelectedSecret(nextSecret)
      setSelectedWorkspace(workspace)

      if (workspace) {
        setVariables(await invoke("list_workspace_variables", { workspace }))
      } else {
        setVariables([])
      }
    } catch (e) {
      showError(e)
    }
  }

  async function submitMasterPassword(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    try {
      setIsSubmitting(true)
      if (vaultInitialized) {
        await invoke("unlock_master_password", { password: masterPassword })
        showToast("Vault unlocked successfully", "success")
      } else {
        await invoke("setup_master_password", { password: masterPassword })
        setVaultInitialized(true)
        showToast("Vault initialized and unlocked", "success")
      }
      setMasterPassword("")
      setVaultReady(true)
      await refresh()
    } catch (e) {
      showError(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLockVault() {
    try {
      await invoke("lock_vault")
      setVaultReady(false)
      setRevealed({})
      setExportedEnv("")
      showToast("Vault locked", "info")
    } catch (e) {
      showError(e)
    }
  }

  async function handleCreateSecret(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    const exists = secrets.some((s) => s.name.toLowerCase() === secretForm.name.toLowerCase())
    if (exists) {
      showToast(`A service group with the name "${secretForm.name}" already exists.`, "error")
      return
    }
    try {
      setIsSubmitting(true)
      const secret = await invoke<Secret>("create_secret", {
        input: {
          name: secretForm.name,
          category: secretForm.category,
          baseUrl: secretForm.baseUrl || null,
          modelName: secretForm.modelName || null,
          tags: splitTags(secretForm.tags),
          description: secretForm.description || null,
          dashboardUrl: secretForm.dashboardUrl || null,
          docsUrl: null,
          loginUrl: null,
          notes: null,
        },
      })
      setSecretForm(emptySecretForm)
      setShowSecretForm(false)
      showToast(`Created service group: ${secret.name}`, "success")
      await refresh(secret.id)
    } catch (e) {
      showError(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSecret(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the service "${name}"? This deletes all associated keys.`)) return
    try {
      await invoke("delete_secret", { idOrName: id })
      showToast(`Deleted service group: ${name}`, "info")
      setSelectedSecret("")
      await refresh()
    } catch (e) {
      showError(e)
    }
  }

  async function handleCreateApiKey(event: FormEvent) {
    event.preventDefault()
    if (!selectedSecret) return
    if (isSubmitting) return
    const exists = selectedApiKeys.some((k) => k.name.toLowerCase() === apiKeyForm.name.toLowerCase())
    if (exists) {
      showToast(`An API key with the name "${apiKeyForm.name}" already exists in this service.`, "error")
      return
    }
    try {
      setIsSubmitting(true)
      const apiKey = await invoke<ApiKey>("create_api_key", {
        secret: selectedSecret,
        input: {
          name: apiKeyForm.name,
          value: apiKeyForm.value,
          envName: apiKeyForm.envName || null,
          includeByDefault: apiKeyForm.includeByDefault,
          tags: splitTags(apiKeyForm.tags),
          description: null,
        },
      })
      setApiKeyForm(emptyApiKeyForm)
      setShowApiKeyForm(false)
      showToast(`Added API Key: ${apiKey.name}`, "success")
      await refresh(selectedSecret)
    } catch (e) {
      showError(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteApiKey(keyId: string, name: string) {
    if (!confirm(`Delete API Key "${name}"?`)) return
    try {
      await invoke("delete_api_key", { apiKey: keyId })
      showToast(`Deleted API Key: ${name}`, "info")
      await refresh(selectedSecret)
    } catch (e) {
      showError(e)
    }
  }

  async function handleRevealKey(apiKey: ApiKey) {
    try {
      const value = await invoke<string>("reveal_api_key", { apiKey: apiKey.id })
      setRevealed((curr) => ({ ...curr, [apiKey.id]: value }))
      showToast(`Revealed: ${apiKey.name}`, "info")
      
      // Auto-lock revealed field after 30s
      setTimeout(() => {
        setRevealed((curr) => {
          const next = { ...curr }
          delete next[apiKey.id]
          return next
        })
      }, 30000)
    } catch (e) {
      showError(e)
    }
  }

  async function handleCreateWorkspace(event: FormEvent) {
    event.preventDefault()
    if (!workspaceFormName.trim()) return
    if (isSubmitting) return
    const exists = workspaces.some((w) => w.name.toLowerCase() === workspaceFormName.toLowerCase())
    if (exists) {
      showToast(`A workspace with the name "${workspaceFormName}" already exists.`, "error")
      return
    }
    try {
      setIsSubmitting(true)
      const ws = await invoke<Workspace>("create_workspace", {
        name: workspaceFormName,
        description: null,
      })
      setWorkspaceFormName("")
      showToast(`Workspace created: ${ws.name}`, "success")
      await refresh(selectedSecret, ws.id)
    } catch (e) {
      showError(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteWorkspace(wsId: string, name: string) {
    if (!confirm(`Delete workspace "${name}"?`)) return
    try {
      await invoke("delete_workspace", { idOrName: wsId })
      setSelectedWorkspace("")
      showToast(`Deleted workspace: ${name}`, "info")
      await refresh()
    } catch (e) {
      showError(e)
    }
  }

  async function handleMapVariable(event: FormEvent) {
    event.preventDefault()
    if (!selectedWorkspace || !mappingApiKey) return
    if (isSubmitting) return
    try {
      setIsSubmitting(true)
      await invoke("set_workspace_variable", {
        workspace: selectedWorkspace,
        envName: mappingEnv || null,
        apiKey: mappingApiKey,
      })
      setMappingEnv("")
      setMappingApiKey("")
      showToast("Key mapped to workspace", "success")
      setVariables(await invoke("list_workspace_variables", { workspace: selectedWorkspace }))
      await refresh(selectedSecret, selectedWorkspace)
    } catch (e) {
      showError(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddSelectedSecretDefaults() {
    if (!selectedWorkspace || !selectedSecret) return
    try {
      const vars = await invoke<WorkspaceVariable[]>(
        "add_secret_default_api_keys_to_workspace",
        { workspace: selectedWorkspace, secret: selectedSecret }
      )
      showToast(`Mapped ${vars.length} default keys to workspace`, "success")
      setVariables(await invoke("list_workspace_variables", { workspace: selectedWorkspace }))
      await refresh(selectedSecret, selectedWorkspace)
    } catch (e) {
      showError(e)
    }
  }

  async function handleRemoveVariable(envName: string) {
    if (!selectedWorkspace) return
    try {
      await invoke("delete_workspace_variable", {
        workspace: selectedWorkspace,
        envName,
      })
      showToast(`Removed mapping for: ${envName}`, "info")
      setVariables(await invoke("list_workspace_variables", { workspace: selectedWorkspace }))
      await refresh(selectedSecret, selectedWorkspace)
    } catch (e) {
      showError(e)
    }
  }

  async function handleExportWorkspace() {
    if (!selectedWorkspace) return
    try {
      const text = await invoke<string>("export_env", { workspace: selectedWorkspace })
      setExportedEnv(text)
      showToast("Workspace environment generated", "success")
    } catch (e) {
      showError(e)
    }
  }

  async function handleCopyText(text: string, label: string, targetId?: string, envName?: string) {
    try {
      await invoke("quick_copy_text", { text })
      await invoke("audit_copy", {
        targetId: targetId || null,
        workspaceId: selectedWorkspace || null,
        envName: envName || null,
      })
      setCopiedText(text)
      showToast(`${label} copied to clipboard (clears in 30s)`, "success")
      
      // Clear local visual state indicator
      setTimeout(() => setCopiedText(""), 4000)

      // Clear clipboard after 30s
      setTimeout(async () => {
        try {
          await invoke("clear_clipboard_if_matches", { expected: text })
        } catch {
          // Best-effort
        }
      }, 30000)
    } catch (e) {
      showError(e)
    }
  }

  function handleApplyPreset(preset: typeof presets[number]) {
    setSecretForm({
      name: preset.name,
      category: preset.category,
      baseUrl: preset.baseUrl,
      modelName: preset.modelName,
      tags: preset.tags,
      description: `Managed ${preset.name} secrets`,
      dashboardUrl: "",
    })
    setApiKeyForm({
      name: preset.apiKey.name,
      value: "",
      envName: preset.apiKey.env,
      includeByDefault: true,
      tags: "",
    })
    setShowSecretForm(true)
    showToast(`Preset loaded for ${preset.name}`, "info")
  }

  function showError(error: unknown) {
    const msg =
      typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error)
    showToast(msg, "error")
  }

  function splitTags(tags: string) {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  // --- RENDERING ---

  // 1. LOCK SCREEN
  if (!vaultReady) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground font-sans relative overflow-hidden">
        {/* Subtle, beautiful minimalist ambient highlights */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />

        <div className="w-full max-w-sm px-6 py-12 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl font-extrabold tracking-tighter bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              keydock<span className="text-emerald-500">.</span>
            </span>
            <Badge variant="outline" className="text-emerald-500/80 border-emerald-500/20 text-[10px] uppercase font-mono py-0 px-1.5 h-4">
              Local Vault
            </Badge>
          </div>

          <Card className="w-full border-border bg-card/60 backdrop-blur-md shadow-2xl shadow-emerald-950/20">
            <CardHeader className="text-center pb-4 pt-6 px-6 gap-2.5">
              <CardTitle className="text-lg font-semibold tracking-tight">
                {vaultInitialized ? "Unlock Insurance Vault" : "Create Master Vault"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed px-2">
                {vaultInitialized
                  ? "Enter master password to unlock your secure key database."
                  : "Setup a strong master password to derive secure encryption keys."}
              </CardDescription>
            </CardHeader>
            <form onSubmit={submitMasterPassword}>
              <CardContent className="space-y-4 px-6 py-2">
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter password..."
                    autoFocus
                    required
                    className="h-10 text-center tracking-widest text-sm bg-background/50 border-zinc-800"
                  />
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-4 border-t border-zinc-900 bg-muted/20">
                <Button className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-md shadow-lg shadow-emerald-900/30" type="submit" disabled={isSubmitting}>
                  <LockIcon className="size-3.5 mr-2" />
                  {vaultInitialized ? "Unlock Vault" : "Initialize Vault"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {toast && (
            <div className={cn(
              "mt-4 p-3 rounded-lg border text-xs max-w-full text-center animate-in fade-in slide-in-from-bottom-2",
              toast.type === "error" ? "bg-destructive/15 border-destructive/20 text-destructive-foreground" : "bg-muted/80 border-border text-muted-foreground"
            )}>
              {toast.message}
            </div>
          )}
        </div>
      </main>
    )
  }

  // 2. MAIN LAYOUT
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex antialiased">
      {/* Toast Notification Container */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-xl text-xs max-w-sm animate-in fade-in slide-in-from-bottom-5",
          toast.type === "success" && "bg-emerald-950/90 border-emerald-500/30 text-emerald-300",
          toast.type === "error" && "bg-rose-950/90 border-rose-500/30 text-rose-300",
          toast.type === "info" && "bg-zinc-900/90 border-zinc-700/50 text-zinc-300"
        )}>
          {toast.type === "success" && <CheckIcon className="size-4 text-emerald-400 shrink-0" />}
          {toast.type === "error" && <AlertCircleIcon className="size-4 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* FIXED LEFT SIDEBAR */}
      <aside className="w-[260px] h-screen border-r border-border bg-card/20 backdrop-blur-md flex flex-col justify-between p-4 sticky top-0 shrink-0 z-40">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tighter bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                keydock<span className="text-emerald-500">.</span>
              </span>
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
            </div>
            <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono uppercase bg-zinc-800 text-zinc-400">
              v0.1
            </Badge>
          </div>

          <Separator className="bg-border/60" />

          {/* Navigation Stack */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab("secrets"); setShowApiKeyForm(false); }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all",
                activeTab === "secrets"
                  ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
              )}
            >
              <div className="flex items-center gap-2.5">
                <KeyRoundIcon className="size-4 shrink-0" />
                <span>Secrets & Keys</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1 bg-zinc-900 border text-zinc-400">
                {secrets.length}
              </Badge>
            </button>

            <button
              onClick={() => { setActiveTab("workspaces"); setExportedEnv(""); }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all",
                activeTab === "workspaces"
                  ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
              )}
            >
              <div className="flex items-center gap-2.5">
                <LayersIcon className="size-4 shrink-0" />
                <span>Workspaces</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1 bg-zinc-900 border text-zinc-400">
                {workspaces.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all",
                activeTab === "audit"
                  ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
              )}
            >
              <div className="flex items-center gap-2.5">
                <ShieldIcon className="size-4 shrink-0" />
                <span>Security Audit</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3">
          <Card className="bg-zinc-900/60 border-zinc-800 p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheckIcon className="size-3.5 text-emerald-500" />
              <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">Vault Safe</span>
            </div>
            <p className="text-[9px] leading-relaxed text-zinc-500">
              Your cryptographic keys are locked in local device memory. Closing the app wipes key access.
            </p>
          </Card>

          <Button
            onClick={handleLockVault}
            variant="outline"
            className="w-full h-8 text-[11px] font-medium border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-900/30 hover:bg-rose-950/20 rounded-md transition-colors"
          >
            <LockIcon className="size-3 mr-2" />
            Lock Database
          </Button>
        </div>
      </aside>

      {/* DYNAMIC CONTENT SPACE */}
      <main className="flex-grow min-h-screen bg-zinc-950/40 flex flex-col">
        {/* --- TABS 1: SECRETS --- */}
        {activeTab === "secrets" && (
          <div className="flex flex-1 min-h-screen">
            {/* Split Column 1: Services List */}
            <div className="w-[300px] border-r border-border flex flex-col sticky top-0 h-screen bg-card/10 shrink-0">
              <div className="p-4 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Services</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSecretForm(emptySecretForm);
                      setShowSecretForm(!showSecretForm);
                    }}
                    className="h-6 w-6 p-0 rounded-md hover:bg-zinc-800 text-zinc-300"
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                </div>
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-zinc-500" />
                  <Input
                    value={secretSearch}
                    onChange={(e) => setSecretSearch(e.target.value)}
                    placeholder="Search services..."
                    className="h-8 pl-8 text-xs bg-background/50 border-zinc-800"
                  />
                </div>
              </div>

              <ScrollArea className="flex-grow border-t border-zinc-900">
                <div className="p-2.5 space-y-1">
                  {filteredSecrets.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-xs text-zinc-500">No services found</p>
                    </div>
                  ) : (
                    filteredSecrets.map((secret) => {
                      const keysCount = apiKeys.filter(k => k.secretId === secret.id).length
                      return (
                        <button
                          key={secret.id}
                          onClick={() => {
                            setSelectedSecret(secret.id)
                            setShowApiKeyForm(false)
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-md transition-all border text-xs relative",
                            selectedSecret === secret.id
                              ? "bg-zinc-900 border-zinc-800 text-foreground font-medium"
                              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                          )}
                        >
                          {selectedSecret === secret.id && (
                            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
                          )}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="truncate">{secret.name}</span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono shrink-0 uppercase border-zinc-800 text-zinc-500">
                              {secret.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <span>{keysCount} key{keysCount !== 1 && "s"}</span>
                            {secret.tags && secret.tags.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate">{secret.tags.slice(0, 2).join(", ")}</span>
                              </>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Split Column 2: Service Detail Pane */}
            <div className="flex-grow p-8 overflow-y-auto max-w-4xl">
              {showSecretForm ? (
                // Add / Edit Secret Group Form
                <Card className="bg-zinc-900/40 border-zinc-800 max-w-xl shadow-lg p-0 overflow-hidden">
                  <CardHeader className="p-6 pb-4 border-b border-zinc-900 gap-2">
                    <CardTitle className="text-sm font-semibold">Register Service Group</CardTitle>
                    <CardDescription className="text-xs">
                      Group endpoints, URLs, default models, and map multiple API credentials under a service.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleCreateSecret}>
                    <CardContent className="space-y-4 p-6 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-zinc-500">Service Name *</label>
                          <Input
                            value={secretForm.name}
                            onChange={(e) => setSecretForm({ ...secretForm, name: e.target.value })}
                            placeholder="e.g. OpenRouter"
                            required
                            className="h-8 text-xs bg-background/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-zinc-500">Category</label>
                          <Select
                            value={secretForm.category}
                            onValueChange={(val) => setSecretForm({ ...secretForm, category: val as SecretCategory })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectGroup>
                                {["aI", "cloud", "search", "database", "devTool", "payment", "custom"].map((cat) => (
                                  <SelectItem key={cat} value={cat} className="text-xs">
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono text-zinc-500">API Base URL (Optional)</label>
                        <Input
                          value={secretForm.baseUrl}
                          onChange={(e) => setSecretForm({ ...secretForm, baseUrl: e.target.value })}
                          placeholder="e.g. https://api.openrouter.ai/api/v1"
                          className="h-8 text-xs font-mono bg-background/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-zinc-500">Default Model Name (Optional)</label>
                          <Input
                            value={secretForm.modelName}
                            onChange={(e) => setSecretForm({ ...secretForm, modelName: e.target.value })}
                            placeholder="e.g. gpt-4o"
                            className="h-8 text-xs bg-background/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-zinc-500">Tags (Comma-separated)</label>
                          <Input
                            value={secretForm.tags}
                            onChange={(e) => setSecretForm({ ...secretForm, tags: e.target.value })}
                            placeholder="e.g. ai, production"
                            className="h-8 text-xs bg-background/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono text-zinc-500">Description</label>
                        <Input
                          value={secretForm.description}
                          onChange={(e) => setSecretForm({ ...secretForm, description: e.target.value })}
                          placeholder="Brief description about the workspace target..."
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="p-6 py-4 flex justify-end gap-2 border-t border-zinc-900 bg-muted/10">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowSecretForm(false)}
                        className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isSubmitting}>
                        Create Group
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              ) : selectedSecretModel ? (
                // Selected Secret Group Details
                <div className="space-y-6">
                  {/* Service Header Info */}
                  <div className="flex items-start justify-between gap-6 pb-4 border-b border-zinc-900">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{selectedSecretModel.name}</h1>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-zinc-800 text-zinc-400">
                          {selectedSecretModel.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-400 max-w-xl">
                        {selectedSecretModel.description || "No description provided for this group."}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSecret(selectedSecretModel.id, selectedSecretModel.name)}
                      className="h-7 text-xs border-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                    >
                      <Trash2Icon className="size-3 mr-1.5" />
                      Delete Group
                    </Button>
                  </div>

                  {/* Metadata fields (only if exists) */}
                  {(selectedSecretModel.baseUrl || selectedSecretModel.modelName) && (
                    <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 border border-zinc-900 rounded-lg p-3 text-xs">
                      {selectedSecretModel.baseUrl && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Base URL</span>
                          <code className="block font-mono text-[11px] text-zinc-300 truncate">{selectedSecretModel.baseUrl}</code>
                        </div>
                      )}
                      {selectedSecretModel.modelName && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Default Model</span>
                          <code className="block text-zinc-300 font-mono text-[11px]">{selectedSecretModel.modelName}</code>
                        </div>
                      )}
                    </div>
                  )}

                  {/* API Keys Table Block */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Credentials & API Keys</h3>
                      {!showApiKeyForm && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setApiKeyForm({
                              name: "default",
                              value: "",
                              envName: selectedSecretModel.name.toUpperCase().replace(/[^A-Z0-9]/g, "_") + "_API_KEY",
                              includeByDefault: true,
                              tags: "",
                            });
                            setShowApiKeyForm(true);
                          }}
                          className="h-7 text-xs bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                        >
                          <PlusIcon className="size-3 mr-1" />
                          Add API Key
                        </Button>
                      )}
                    </div>

                    {showApiKeyForm && (
                      <Card className="bg-zinc-900/40 border-zinc-800 p-4 animate-in fade-in slide-in-from-top-3">
                        <form onSubmit={handleCreateApiKey} className="space-y-3.5 text-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                            <span className="font-semibold text-zinc-300">Add API Key entry</span>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setShowApiKeyForm(false)}
                              className="h-5 p-1 text-[10px] hover:bg-zinc-800 text-zinc-400"
                            >
                              Cancel
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono text-zinc-500">Key Name</label>
                              <Input
                                value={apiKeyForm.name}
                                onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
                                placeholder="e.g. prod-default, client-a"
                                required
                                className="h-8 text-xs bg-zinc-950/60"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono text-zinc-500">Default Environment Variable</label>
                              <Input
                                value={apiKeyForm.envName}
                                onChange={(e) => setApiKeyForm({ ...apiKeyForm, envName: e.target.value.toUpperCase() })}
                                placeholder="e.g. OPENAI_API_KEY"
                                className="h-8 text-xs bg-zinc-950/60 font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-mono text-zinc-500">API Key Secret Value *</label>
                            <Input
                              type="password"
                              value={apiKeyForm.value}
                              onChange={(e) => setApiKeyForm({ ...apiKeyForm, value: e.target.value })}
                              placeholder="sk-..."
                              required
                              className="h-8 text-xs bg-zinc-950/60 font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="checkbox"
                              checked={apiKeyForm.includeByDefault}
                              onChange={(e) => setApiKeyForm({ ...apiKeyForm, includeByDefault: e.target.checked })}
                              className="size-3.5 rounded border-zinc-800 bg-background accent-emerald-600 cursor-pointer"
                              id="include-by-default-chk"
                            />
                            <label htmlFor="include-by-default-chk" className="text-xs text-zinc-400 cursor-pointer select-none">
                              Include by default when mapping or exporting this service.
                            </label>
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button type="submit" size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isSubmitting}>
                              Add Key
                            </Button>
                          </div>
                        </form>
                      </Card>
                    )}

                    <div className="space-y-2.5">
                      {selectedApiKeys.length === 0 ? (
                        <div className="p-8 border border-dashed rounded-lg border-zinc-800 text-center">
                          <p className="text-xs text-zinc-500">No API Keys created yet for this service.</p>
                        </div>
                      ) : (
                        selectedApiKeys.map((key) => {
                          const val = revealed[key.id]
                          return (
                            <Card key={key.id} className="bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 transition-colors">
                              <CardContent className="p-4 flex items-center justify-between gap-4 text-xs">
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-zinc-200">{key.name}</span>
                                    {key.includeByDefault && (
                                      <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-900/30">
                                        Default Export
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase border-zinc-800 text-zinc-500">
                                      Encrypted
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-zinc-500">ENV:</span>
                                    <code className="text-[11px] text-zinc-400 font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800/60">{key.envName || "NONE"}</code>
                                  </div>

                                  <div className="pt-1.5 flex items-center gap-1">
                                    <CodeIcon className="size-3.5 text-zinc-600 shrink-0" />
                                    <code className="font-mono text-[10px] text-zinc-500 truncate select-all">
                                      {val ? val : "••••••••••••••••••••••••••••••••"}
                                    </code>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRevealKey(key)}
                                    className="h-7 w-7 p-0 border-zinc-900 text-zinc-400 hover:text-zinc-200"
                                    title="Reveal Key"
                                  >
                                    <EyeIcon className="size-3.5" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!val}
                                    onClick={() => handleCopyText(val!, "API Key Value", key.id, key.envName || undefined)}
                                    className="h-7 w-7 p-0 border-zinc-900 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                                    title="Copy Value"
                                  >
                                    {copiedText === val && val ? (
                                      <CheckIcon className="size-3.5 text-emerald-400 animate-in zoom-in-50" />
                                    ) : (
                                      <CopyIcon className="size-3.5" />
                                    )}
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteApiKey(key.id, key.name)}
                                    className="h-7 w-7 p-0 border-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                                    title="Delete Key"
                                  >
                                    <Trash2Icon className="size-3.5" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Dashboard Welcome & Quick Start presets
                <div className="space-y-8 py-4">
                  <div className="space-y-2">
                    <h1 className="text-xl font-bold tracking-tight text-zinc-200">Local Secrets Vault</h1>
                    <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                      Secure key manager powered by local AES-256 equivalent XChaCha20Poly1305 encryption. Integrate and inject local environment keys directly into your development shell.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">Quick-start Config Presets</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {presets.map((preset) => (
                        <Card
                          key={preset.name}
                          onClick={() => handleApplyPreset(preset)}
                          className="bg-zinc-900/10 border-zinc-900 hover:border-zinc-800 cursor-pointer p-4 transition-all hover:bg-zinc-900/40 group flex flex-col justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-zinc-300 group-hover:text-emerald-400 transition-colors">{preset.name}</span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase bg-zinc-900 text-zinc-500 shrink-0">
                                {preset.category}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">{preset.baseUrl}</p>
                          </div>
                          <div className="pt-4 flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-900/50 mt-3">
                            <span>Includes 1 default key</span>
                            <ArrowRightIcon className="size-3 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border border-dashed rounded-lg border-zinc-800 bg-zinc-950/10 flex items-start gap-3">
                    <SparklesIcon className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-zinc-300">How Env Injection Works</span>
                      <p className="text-zinc-500 leading-relaxed">
                        Rather than loading raw text from <code className="text-zinc-400">.env</code> files, use our CLI in your terminals:
                      </p>
                      <code className="block mt-2 font-mono text-[10px] text-emerald-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 w-fit">
                        keydock run -w development -- bun run dev
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TABS 2: WORKSPACES --- */}
        {activeTab === "workspaces" && (
          <div className="flex flex-1 min-h-screen">
            {/* Split Column 1: Workspaces List */}
            <div className="w-[280px] border-r border-border flex flex-col sticky top-0 h-screen bg-card/10 shrink-0">
              <div className="p-4 space-y-3 shrink-0">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Workspaces</h2>
                <form onSubmit={handleCreateWorkspace} className="flex gap-2">
                  <Input
                    value={workspaceFormName}
                    onChange={(e) => setWorkspaceFormName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="e.g. dev-env"
                    className="h-8 text-xs bg-background/50 border-zinc-800"
                    disabled={isSubmitting}
                  />
                  <Button type="submit" size="sm" className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800" disabled={isSubmitting}>
                    <PlusIcon className="size-3.5" />
                  </Button>
                </form>
              </div>

              <ScrollArea className="flex-grow border-t border-zinc-900">
                <div className="p-2.5 space-y-1">
                  {workspaces.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-xs text-zinc-500">No workspaces created</p>
                    </div>
                  ) : (
                    workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setSelectedWorkspace(ws.id)
                          setExportedEnv("")
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-md transition-all border text-xs relative",
                          selectedWorkspace === ws.id
                            ? "bg-zinc-900 border-zinc-800 text-foreground font-medium"
                            : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                        )}
                      >
                        {selectedWorkspace === ws.id && (
                          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
                        )}
                        <span className="block truncate font-mono text-[11px]">{ws.name}</span>
                        <span className="block text-[9px] text-zinc-500 mt-0.5">Local configuration pack</span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Split Column 2: Workspace Composer Detail */}
            <div className="flex-grow p-8 overflow-y-auto max-w-5xl">
              {selectedWorkspaceModel ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-6 pb-4 border-b border-zinc-900">
                    <div className="space-y-1">
                      <h1 className="text-xl font-bold tracking-tight text-zinc-100 font-mono">/{selectedWorkspaceModel.name}</h1>
                      <p className="text-xs text-zinc-400">Compose and map environment variables for this runtime zone.</p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWorkspace(selectedWorkspaceModel.id, selectedWorkspaceModel.name)}
                      className="h-7 text-xs border-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                    >
                      <Trash2Icon className="size-3 mr-1.5" />
                      Delete Workspace
                    </Button>
                  </div>

                  {/* Core Composition Grid */}
                  <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-8">
                    {/* Left Panel: Variable Mappings */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Environment Mapping</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!selectedSecret || !selectedWorkspace}
                            onClick={handleAddSelectedSecretDefaults}
                            className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-400 disabled:opacity-30"
                          >
                            Add selected service defaults
                          </Button>
                        </div>

                        {/* Inline Mapper Form */}
                        <Card className="bg-zinc-900/20 border-zinc-900 p-4">
                          <form onSubmit={handleMapVariable} className="space-y-3.5 text-xs">
                            <span className="font-semibold text-zinc-300 block">Map Key to Environment Variable</span>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono text-zinc-500">API Key Source</label>
                                <Select
                                  value={mappingApiKey}
                                  onValueChange={(val) => {
                                    const key = apiKeys.find(k => k.id === val)
                                    setMappingApiKey(val)
                                    setMappingEnv(key?.envName || "")
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-zinc-950/60">
                                    <SelectValue placeholder="Choose credential..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectGroup>
                                      {apiKeys.map((key) => (
                                        <SelectItem key={key.id} value={key.id} className="text-xs">
                                          {key.secretName}/{key.name}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono text-zinc-500">Export Environment Name</label>
                                <Input
                                  value={mappingEnv}
                                  onChange={(e) => setMappingEnv(e.target.value.toUpperCase())}
                                  placeholder="e.g. DEEPSEEK_API_KEY"
                                  className="h-8 text-xs bg-zinc-950/60 font-mono"
                                  required
                                />
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={!selectedWorkspace || !mappingApiKey || isSubmitting}
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
                              >
                                Bind Variable
                              </Button>
                            </div>
                          </form>
                        </Card>

                        {/* Mapped Variables list */}
                        <div className="space-y-2">
                          {variables.length === 0 ? (
                            <div className="p-8 border border-dashed rounded-lg border-zinc-800 text-center">
                              <p className="text-xs text-zinc-500">No variables mapped yet in this workspace.</p>
                            </div>
                          ) : (
                            variables.map((variable) => (
                              <Card key={variable.id} className="bg-zinc-900/10 border-zinc-900 hover:border-zinc-800/80 transition-colors">
                                <CardContent className="p-3 flex items-center justify-between gap-4 text-xs">
                                  <div className="min-w-0 flex-1">
                                    <code className="block font-mono text-[11px] text-zinc-200 truncate">{variable.envName}</code>
                                    <span className="block text-[10px] text-zinc-500 mt-0.5 truncate">
                                      Maps from: {variable.secretName || variable.secretId} / {variable.apiKeyName || variable.apiKeyId}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveVariable(variable.envName)}
                                    className="h-7 px-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 shrink-0"
                                  >
                                    Unbind
                                  </Button>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: CLI Run & Raw Export */}
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Terminal Shell Execution</h3>
                        <Card className="bg-zinc-950/60 border-zinc-900 p-4 space-y-3 shadow-sm">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Terminal Inject Command</span>
                          
                          <div
                            onClick={() => handleCopyText(`keydock run -w ${selectedWorkspaceModel.name} -- bun run dev`, "Shell command")}
                            className="bg-black/80 rounded-md border border-zinc-900 p-2.5 font-mono text-[11px] text-emerald-400 cursor-pointer hover:border-emerald-500/20 hover:bg-black/90 transition-all flex items-center justify-between gap-2 group w-full"
                          >
                            <span className="truncate block">$ keydock run -w {selectedWorkspaceModel.name} -- bun run dev</span>
                            <CopyIcon className="size-3 text-zinc-500 group-hover:text-emerald-400 shrink-0 transition-colors" />
                          </div>

                          <p className="text-[10px] text-zinc-500 leading-normal">
                            Runs your local development pipelines without hardcoding secrets to file scripts. The database injects variables straight to the processes environment.
                          </p>
                        </Card>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Raw Export</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportWorkspace}
                            className="h-7 text-xs border-zinc-900 text-zinc-400 hover:text-zinc-200"
                          >
                            Generate .env
                          </Button>
                        </div>

                        {exportedEnv && (
                          <Card className="bg-zinc-950/40 border-zinc-900 p-4 space-y-3">
                            <Textarea
                              readOnly
                              value={exportedEnv}
                              className="font-mono text-[10px] min-h-32 bg-zinc-950/80 border-zinc-800 text-zinc-300 resize-none leading-relaxed"
                            />
                            <Button
                              variant="outline"
                              onClick={() => handleCopyText(exportedEnv, ".env Configuration")}
                              className="w-full h-8 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                            >
                              Copy .env parameters
                            </Button>
                          </Card>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-8 text-center max-w-sm mx-auto">
                  <LayersIcon className="size-10 text-zinc-700 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-300">Workspace Environment Composer</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Select or create a workspace zone in the sidebar panel to start mapping variables.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TABS 3: AUDIT --- */}
        {activeTab === "audit" && (
          <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-zinc-200">Security Audit Logs</h1>
                <p className="text-xs text-zinc-400">Complete immutable record of local database decryption, copying, and reveal executions.</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refresh()}
                className="h-8 text-xs border-zinc-900 text-zinc-400 hover:text-zinc-200"
              >
                <RefreshCcwIcon className="size-3 mr-2 animate-hover-spin" />
                Reload logs
              </Button>
            </div>

            <Card className="bg-zinc-900/10 border-zinc-900 shadow-sm overflow-hidden">
              <ScrollArea className="h-[550px]">
                <div className="divide-y divide-zinc-900 text-xs">
                  {auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                      No security audit records logged.
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-900/25 transition-colors">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn(
                              "text-[9px] py-0 px-1 font-mono uppercase tracking-wider",
                              log.action.includes("copy") || log.action.includes("reveal")
                                ? "border-amber-500/20 bg-amber-950/20 text-amber-400"
                                : "border-emerald-500/20 bg-emerald-950/20 text-emerald-400"
                            )}>
                              {log.action}
                            </Badge>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ID: {log.id.slice(0, 8)}...
                            </span>
                          </div>
                          <div className="text-zinc-400 leading-normal">
                            Target: <span className="text-zinc-300 font-mono text-[10.5px]">{log.targetId || "Vault Engine"}</span>
                            {log.workspaceId && (
                              <span> · Workspace: <span className="text-zinc-300 font-mono">{log.workspaceId}</span></span>
                            )}
                            {log.envName && (
                              <span> · Parameter: <code className="text-emerald-500 font-mono text-[11px]">{log.envName}</code></span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
