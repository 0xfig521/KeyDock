import React, { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  DatabaseIcon,
  EyeIcon,
  KeyRoundIcon,
  LayersIcon,
  LockIcon,
  type LucideIcon,
  PlusIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from "lucide-react"
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import "./styles.css"

type SecretCategory =
  | "ai"
  | "cloud"
  | "search"
  | "database"
  | "devTool"
  | "payment"
  | "custom"

type Secret = {
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
}

type ApiKey = {
  id: string
  secretId: string
  secretName?: string | null
  name: string
  envName?: string | null
  includeByDefault: boolean
  tags: string[]
}

type Workspace = {
  id: string
  name: string
  description?: string | null
  tags: string[]
}

type WorkspaceVariable = {
  id: string
  workspaceId: string
  secretId: string
  secretName?: string | null
  apiKeyId: string
  apiKeyName?: string | null
  envName: string
  enabled: boolean
}

type SecretForm = {
  name: string
  category: SecretCategory
  baseUrl: string
  modelName: string
  tags: string
  description: string
  dashboardUrl: string
}

type ApiKeyForm = {
  name: string
  value: string
  envName: string
  includeByDefault: boolean
  tags: string
}

const emptySecretForm: SecretForm = {
  name: "",
  category: "ai",
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
    category: "ai" as SecretCategory,
    baseUrl: "https://openrouter.ai/api/v1",
    modelName: "",
    tags: "ai,llm",
    apiKey: {
      name: "default",
      env: "OPENAI_API_KEY",
    },
  },
  {
    name: "Cloudflare",
    category: "cloud" as SecretCategory,
    baseUrl: "https://api.cloudflare.com/client/v4",
    modelName: "",
    tags: "cloud",
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

const navItems: Array<{
  label: string
  icon: LucideIcon
  href: string
  active?: boolean
  count: (counts: {
    secrets: number
    entries: number
    workspaces: number
  }) => number
}> = [
  {
    label: "Secrets",
    icon: KeyRoundIcon,
    href: "#secrets",
    active: true,
    count: (counts) => counts.secrets,
  },
  {
    label: "Entries",
    icon: DatabaseIcon,
    href: "#entries",
    count: (counts) => counts.entries,
  },
  {
    label: "Workspaces",
    icon: LayersIcon,
    href: "#workspace",
    count: (counts) => counts.workspaces,
  },
]

function App() {
  const [vaultReady, setVaultReady] = useState(false)
  const [vaultInitialized, setVaultInitialized] = useState(false)
  const [masterPassword, setMasterPassword] = useState("")
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [variables, setVariables] = useState<WorkspaceVariable[]>([])
  const [selectedSecret, setSelectedSecret] = useState("")
  const [selectedWorkspace, setSelectedWorkspace] = useState("")
  const [secretForm, setSecretForm] = useState<SecretForm>(emptySecretForm)
  const [apiKeyForm, setApiKeyForm] = useState<ApiKeyForm>(emptyApiKeyForm)
  const [workspaceName, setWorkspaceName] = useState("")
  const [mappingEnv, setMappingEnv] = useState("")
  const [mappingApiKey, setMappingApiKey] = useState("")
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [exportedEnv, setExportedEnv] = useState("")
  const [message, setMessage] = useState("KeyDock ready")

  async function refresh(preferredSecret?: string, preferredWorkspace?: string) {
    const [nextSecrets, nextApiKeys, nextWorkspaces] = await Promise.all([
      invoke<Secret[]>("list_secrets"),
      invoke<ApiKey[]>("list_api_keys", { secret: null }),
      invoke<Workspace[]>("list_workspaces"),
    ])

    setSecrets(nextSecrets)
    setApiKeys(nextApiKeys)
    setWorkspaces(nextWorkspaces)

    const nextSecret = preferredSecret || selectedSecret || nextSecrets[0]?.id || ""
    const workspace = preferredWorkspace || selectedWorkspace || nextWorkspaces[0]?.id || ""
    setSelectedSecret(nextSecret)
    setSelectedWorkspace(workspace)
    setVariables(
      workspace ? await invoke("list_workspace_variables", { workspace }) : [],
    )
  }

  useEffect(() => {
    invoke<{ initialized: boolean }>("get_vault_status")
      .then((status) => {
        setVaultInitialized(status.initialized)
        setMessage(status.initialized ? "Vault locked" : "Create a master password")
      })
      .catch(showError)
  }, [])

  useEffect(() => {
    if (!vaultReady || !selectedWorkspace) return
    invoke<WorkspaceVariable[]>("list_workspace_variables", {
      workspace: selectedWorkspace,
    })
      .then(setVariables)
      .catch(showError)
  }, [selectedWorkspace, vaultReady])

  const selectedSecretModel = useMemo(
    () => secrets.find((secret) => secret.id === selectedSecret),
    [selectedSecret, secrets],
  )

  const selectedWorkspaceModel = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspace),
    [selectedWorkspace, workspaces],
  )

  const selectedApiKeys = useMemo(
    () => apiKeys.filter((apiKey) => apiKey.secretId === selectedSecret),
    [apiKeys, selectedSecret],
  )

  const secretCategoryCount = useMemo(
    () => new Set(secrets.map((secret) => secret.category)).size,
    [secrets],
  )

  async function submitMasterPassword(event: React.FormEvent) {
    event.preventDefault()
    if (vaultInitialized) {
      await invoke("unlock_master_password", { password: masterPassword })
      setMessage("Vault unlocked")
    } else {
      await invoke("setup_master_password", { password: masterPassword })
      setVaultInitialized(true)
      setMessage("Vault created and unlocked")
    }
    setMasterPassword("")
    setVaultReady(true)
    await refresh()
  }

  async function createSecret(event: React.FormEvent) {
    event.preventDefault()
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
    setMessage("Secret group created")
    await refresh(secret.id)
  }

  async function createApiKey(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedSecret) return
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
    setMessage(`API key ${apiKey.name} created`)
    await refresh(selectedSecret)
  }

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault()
    const workspace = await invoke<Workspace>("create_workspace", {
      name: workspaceName,
      description: null,
    })
    setWorkspaceName("")
    setMessage("Workspace created")
    await refresh(selectedSecret, workspace.id)
  }

  async function mapVariable(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedWorkspace || !mappingApiKey) return
    await invoke("set_workspace_variable", {
      workspace: selectedWorkspace,
      envName: mappingEnv || null,
      apiKey: mappingApiKey,
    })
    setMappingEnv("")
    setMappingApiKey("")
    setMessage("API key mapped into workspace")
    setVariables(await invoke("list_workspace_variables", { workspace: selectedWorkspace }))
  }

  async function addSelectedSecretDefaults() {
    if (!selectedWorkspace || !selectedSecret) return
    await invoke("add_secret_default_api_keys_to_workspace", {
      workspace: selectedWorkspace,
      secret: selectedSecret,
    })
    setMessage("Default API keys mapped")
    setVariables(await invoke("list_workspace_variables", { workspace: selectedWorkspace }))
  }

  async function reveal(apiKey: ApiKey) {
    const value = await invoke<string>("reveal_api_key", { apiKey: apiKey.id })
    setRevealed((current) => ({ ...current, [apiKey.id]: value }))
    window.setTimeout(() => {
      setRevealed((current) => {
        const next = { ...current }
        delete next[apiKey.id]
        return next
      })
    }, 30_000)
  }

  async function copy(text: string, label: string, targetId?: string, envName?: string) {
    await invoke("quick_copy_text", { text })
    await invoke("audit_copy", {
      targetId: targetId || null,
      workspaceId: selectedWorkspace || null,
      envName: envName || null,
    })
    setMessage(`${label} copied; clipboard clears in 30s if unchanged`)
    window.setTimeout(async () => {
      try {
        await invoke("clear_clipboard_if_matches", { expected: text })
      } catch {
        // Best-effort clipboard clearing.
      }
    }, 30_000)
  }

  async function exportWorkspace() {
    if (!selectedWorkspace) return
    const text = await invoke<string>("export_env", { workspace: selectedWorkspace })
    setExportedEnv(text)
    setMessage("Workspace env exported to preview")
  }

  function applyPreset(preset: (typeof presets)[number]) {
    setSecretForm({
      ...secretForm,
      name: secretForm.name || preset.name,
      category: preset.category,
      baseUrl: preset.baseUrl,
      modelName: preset.modelName,
      tags: secretForm.tags || preset.tags,
    })
    setApiKeyForm({
      ...emptyApiKeyForm,
      name: preset.apiKey.name,
      envName: preset.apiKey.env,
    })
  }

  function showError(error: unknown) {
    const nextMessage =
      typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error)
    setMessage(nextMessage)
  }

  if (!vaultReady) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl place-items-center">
          <Card className="w-full max-w-md">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-3">
                <img src="/icon.png" alt="" className="size-12 rounded-xl" />
                <Badge variant="secondary">Local vault</Badge>
              </div>
              <CardTitle className="text-3xl tracking-tight">
                {vaultInitialized ? "Unlock KeyDock." : "Create your vault."}
              </CardTitle>
              <CardDescription>
                Your master password unlocks the local data key. The decrypted key
                stays only in memory while the app is open.
              </CardDescription>
            </CardHeader>
            <form onSubmit={(event) => submitMasterPassword(event).catch(showError)}>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="master-password">Master password</FieldLabel>
                    <Input
                      id="master-password"
                      type="password"
                      value={masterPassword}
                      onChange={(event) => setMasterPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      autoFocus
                      required
                    />
                    <FieldDescription>{message}</FieldDescription>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit">
                  <LockIcon data-icon="inline-start" />
                  {vaultInitialized ? "Unlock" : "Create vault"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <div className="grid min-h-screen grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-r bg-background/95">
          <div className="flex h-full flex-col gap-4 p-4">
            <div className="flex items-center gap-3 px-2 py-2">
              <img src="/icon.png" alt="" className="size-10 rounded-xl" />
              <div className="min-w-0">
                <div className="font-semibold tracking-tight">KeyDock</div>
                <div className="truncate text-xs text-muted-foreground">
                  Services and API keys
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-1">
              {navItems.map(({ label, count, icon: Icon, href, active }) => (
                <a
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                    active && "bg-muted text-foreground"
                  )}
                  href={href}
                  key={label}
                >
                  <span className="flex items-center gap-2">
                    <Icon data-icon="inline-start" />
                    {label}
                  </span>
                  <Badge variant="secondary">
                    {count({
                      secrets: secrets.length,
                      entries: apiKeys.length,
                      workspaces: workspaces.length,
                    })}
                  </Badge>
                </a>
              ))}
            </div>

            <Card className="mt-auto">
              <CardHeader className="gap-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ShieldCheckIcon data-icon="inline-start" />
                  Vault status
                </CardTitle>
                <CardDescription>{message}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </aside>

        <section className="min-w-0 p-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="outline">Local-first secret manager</Badge>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                  Compose secrets into clean runtime environments.
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Manage one service with shared base URL/model settings and one or more
                  API keys, then compose keys into workspaces.
                </p>
              </div>
              <Button variant="outline" onClick={() => refresh().catch(showError)}>
                <RefreshCcwIcon data-icon="inline-start" />
                Refresh
              </Button>
            </header>

            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Secret groups" value={secrets.length} />
              <MetricCard label="API keys" value={apiKeys.length} />
              <MetricCard label="Categories" value={secretCategoryCount} />
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-6">
              <Tabs defaultValue="secrets" className="min-w-0">
                <TabsList>
                  <TabsTrigger value="secrets">Secrets</TabsTrigger>
                  <TabsTrigger value="entries">API Keys</TabsTrigger>
                </TabsList>

                <TabsContent value="secrets" id="secrets" className="mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle>Secret groups</CardTitle>
                          <CardDescription>
                            A service owns shared settings like base URL/model, plus one or more API keys.
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {presets.map((preset) => (
                            <Button
                              key={preset.name}
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() => applyPreset(preset)}
                            >
                              {preset.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                      <form onSubmit={(event) => createSecret(event).catch(showError)}>
                        <FieldGroup className="grid grid-cols-3 gap-4">
                          <Field>
                            <FieldLabel htmlFor="secret-name">Name</FieldLabel>
                            <Input
                              id="secret-name"
                              value={secretForm.name}
                              onChange={(event) =>
                                setSecretForm({ ...secretForm, name: event.target.value })
                              }
                              placeholder="OpenRouter"
                              required
                            />
                          </Field>
                          <Field>
                            <FieldLabel>Category</FieldLabel>
                            <Select
                              value={secretForm.category}
                              onValueChange={(value) =>
                                setSecretForm({
                                  ...secretForm,
                                  category: value as SecretCategory,
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {["ai", "cloud", "search", "database", "devTool", "payment", "custom"].map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="secret-tags">Tags</FieldLabel>
                            <Input
                              id="secret-tags"
                              value={secretForm.tags}
                              onChange={(event) =>
                                setSecretForm({ ...secretForm, tags: event.target.value })
                              }
                              placeholder="ai, client-a"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="secret-base-url">Base URL</FieldLabel>
                            <Input
                              id="secret-base-url"
                              value={secretForm.baseUrl}
                              onChange={(event) =>
                                setSecretForm({
                                  ...secretForm,
                                  baseUrl: event.target.value,
                                })
                              }
                              placeholder="https://openrouter.ai/api/v1"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="secret-model">Default model</FieldLabel>
                            <Input
                              id="secret-model"
                              value={secretForm.modelName}
                              onChange={(event) =>
                                setSecretForm({
                                  ...secretForm,
                                  modelName: event.target.value,
                                })
                              }
                              placeholder="anthropic/claude-sonnet-4"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="secret-dashboard">Dashboard URL</FieldLabel>
                            <Input
                              id="secret-dashboard"
                              value={secretForm.dashboardUrl}
                              onChange={(event) =>
                                setSecretForm({
                                  ...secretForm,
                                  dashboardUrl: event.target.value,
                                })
                              }
                              placeholder="https://openrouter.ai/settings/keys"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="secret-description">Description</FieldLabel>
                            <Input
                              id="secret-description"
                              value={secretForm.description}
                              onChange={(event) =>
                                setSecretForm({
                                  ...secretForm,
                                  description: event.target.value,
                                })
                              }
                              placeholder="Client A production"
                            />
                          </Field>
                          <Button className="w-fit" type="submit">
                            <PlusIcon data-icon="inline-start" />
                            Create group
                          </Button>
                        </FieldGroup>
                      </form>

                      <Separator />

                      <ScrollArea className="h-[460px] pr-3">
                        <div className="flex flex-col gap-3">
                          {secrets.length === 0 && (
                            <EmptyCard
                              title="No secret groups yet"
                              description="Create a service, then add one or more API keys under it."
                            />
                          )}
                          {secrets.map((secret) => (
                            <Card
                              key={secret.id}
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-muted/50",
                                secret.id === selectedSecret && "border-primary"
                              )}
                              onClick={() => setSelectedSecret(secret.id)}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <CardTitle className="text-base">{secret.name}</CardTitle>
                                    <CardDescription>
                                      {secret.description || "No description"}
                                    </CardDescription>
                                  </div>
                                  <Badge variant="secondary">{secret.category}</Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline">
                                  {apiKeys.filter((apiKey) => apiKey.secretId === secret.id).length} keys
                                </Badge>
                                {secret.baseUrl && (
                                  <Badge variant="outline" className="max-w-full truncate">
                                    {secret.baseUrl}
                                  </Badge>
                                )}
                                {secret.modelName && (
                                  <Badge variant="outline" className="max-w-full truncate">
                                    {secret.modelName}
                                  </Badge>
                                )}
                                {secret.tags.map((tag) => (
                                  <Badge key={tag} variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="entries" id="entries" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedSecretModel?.name || "Select a secret group"}</CardTitle>
                      <CardDescription>
                        Add one or more encrypted API keys for this service. Base URL/model live on the service.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                      <form onSubmit={(event) => createApiKey(event).catch(showError)}>
                        <FieldGroup className="grid grid-cols-3 gap-4">
                          <Field>
                            <FieldLabel htmlFor="api-key-name">Key name</FieldLabel>
                            <Input
                              id="api-key-name"
                              value={apiKeyForm.name}
                              onChange={(event) =>
                                setApiKeyForm({ ...apiKeyForm, name: event.target.value })
                              }
                              placeholder="default / client-a / backup"
                              required
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="api-key-env">Env name</FieldLabel>
                            <Input
                              id="api-key-env"
                              value={apiKeyForm.envName}
                              onChange={(event) =>
                                setApiKeyForm({
                                  ...apiKeyForm,
                                  envName: event.target.value.toUpperCase(),
                                })
                              }
                              placeholder="OPENAI_API_KEY"
                            />
                          </Field>
                          <Field className="col-span-2">
                            <FieldLabel htmlFor="api-key-value">API key value</FieldLabel>
                            <Input
                              id="api-key-value"
                              type="password"
                              value={apiKeyForm.value}
                              onChange={(event) =>
                                setApiKeyForm({ ...apiKeyForm, value: event.target.value })
                              }
                              placeholder="sk-..."
                              required
                            />
                          </Field>
                          <Field orientation="horizontal">
                            <input
                              type="checkbox"
                              checked={apiKeyForm.includeByDefault}
                              onChange={(event) =>
                                setApiKeyForm({
                                  ...apiKeyForm,
                                  includeByDefault: event.target.checked,
                                })
                              }
                              className="size-4"
                            />
                            <FieldContent>
                              <FieldTitle>Default export</FieldTitle>
                              <FieldDescription>Add when exporting this service.</FieldDescription>
                            </FieldContent>
                          </Field>
                          <Button className="w-fit" type="submit" disabled={!selectedSecret}>
                            <PlusIcon data-icon="inline-start" />
                            Add API key
                          </Button>
                        </FieldGroup>
                      </form>

                      <Separator />

                      <div className="flex flex-col gap-3">
                        {selectedApiKeys.length === 0 && (
                          <EmptyCard
                            title="No API keys in this service"
                            description="Add a default key, client-specific keys, or backup keys."
                          />
                        )}
                        {selectedApiKeys.map((apiKey) => (
                          <ApiKeyCard
                            key={apiKey.id}
                            apiKey={apiKey}
                            value={revealed[apiKey.id]}
                            onReveal={() => reveal(apiKey).catch(showError)}
                            onCopy={() => {
                              const value = revealed[apiKey.id]
                              if (value) {
                                copy(value, "API key", apiKey.id, apiKey.envName || undefined).catch(showError)
                              }
                            }}
                            onUse={() => {
                              setMappingApiKey(apiKey.id)
                              setMappingEnv(apiKey.envName || "")
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <aside className="flex flex-col gap-4" id="workspace">
                <Card>
                  <CardHeader>
                    <CardTitle>Workspaces</CardTitle>
                    <CardDescription>Named env bundles for projects or clients.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <form onSubmit={(event) => createWorkspace(event).catch(showError)}>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="workspace-name">New workspace</FieldLabel>
                          <div className="flex gap-2">
                            <Input
                              id="workspace-name"
                              value={workspaceName}
                              onChange={(event) => setWorkspaceName(event.target.value)}
                              placeholder="client-a"
                              required
                            />
                            <Button type="submit">
                              <PlusIcon data-icon="inline-start" />
                              Create
                            </Button>
                          </div>
                        </Field>
                      </FieldGroup>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      {workspaces.map((workspace) => (
                        <Button
                          key={workspace.id}
                          variant={workspace.id === selectedWorkspace ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedWorkspace(workspace.id)}
                        >
                          {workspace.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card id="export">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{selectedWorkspaceModel?.name || "Workspace composer"}</CardTitle>
                        <CardDescription>Map API keys to environment variables.</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => exportWorkspace().catch(showError)}>
                        <TerminalIcon data-icon="inline-start" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <Button
                      variant="secondary"
                      disabled={!selectedSecret || !selectedWorkspace}
                      onClick={() => addSelectedSecretDefaults().catch(showError)}
                    >
                      Add selected service defaults
                    </Button>

                    <form onSubmit={(event) => mapVariable(event).catch(showError)}>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="mapping-env">Env name</FieldLabel>
                          <Input
                            id="mapping-env"
                            value={mappingEnv}
                            onChange={(event) => setMappingEnv(event.target.value.toUpperCase())}
                            placeholder="ENV_OVERRIDE"
                          />
                        </Field>
                        <Field>
                          <FieldLabel>API key</FieldLabel>
                          <Select
                            value={mappingApiKey}
                            onValueChange={(value) => {
                              const apiKey = apiKeys.find((item) => item.id === value)
                              setMappingApiKey(value)
                              setMappingEnv(apiKey?.envName || "")
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose API key" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {apiKeys.map((apiKey) => (
                                  <SelectItem value={apiKey.id} key={apiKey.id}>
                                    {apiKey.secretName}/{apiKey.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Button type="submit" disabled={!selectedWorkspace || !mappingApiKey}>
                          Map API key
                        </Button>
                      </FieldGroup>
                    </form>

                    <Separator />

                    <div className="flex flex-col gap-2">
                      {variables.length === 0 && (
                        <EmptyCard
                          title="No mappings"
                          description="Map API keys only when you need env injection."
                        />
                      )}
                      {variables.map((variable) => (
                        <div
                          key={variable.id}
                          className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                        >
                          <div className="min-w-0">
                            <code className="block truncate text-sm font-medium">
                              {variable.envName}
                            </code>
                            <p className="truncate text-xs text-muted-foreground">
                              {variable.secretName || variable.secretId}/
                              {variable.apiKeyName || variable.apiKeyId}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await invoke("delete_workspace_variable", {
                                workspace: selectedWorkspace,
                                envName: variable.envName,
                              })
                              setVariables(
                                await invoke("list_workspace_variables", {
                                  workspace: selectedWorkspace,
                                }),
                              )
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>

                    {exportedEnv && (
                      <FieldSet>
                        <FieldLabel>Export preview</FieldLabel>
                        <Textarea readOnly value={exportedEnv} className="min-h-32 font-mono" />
                        <Button
                          variant="outline"
                          onClick={() => copy(exportedEnv, "Env export").catch(showError)}
                        >
                          Copy export
                        </Button>
                      </FieldSet>
                    )}
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function ApiKeyCard({
  apiKey,
  value,
  onReveal,
  onCopy,
  onUse,
}: {
  apiKey: ApiKey
  value?: string
  onReveal: () => void
  onCopy: () => void
  onUse: () => void
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{apiKey.name}</h3>
            <Badge variant="secondary">encrypted</Badge>
            {apiKey.includeByDefault && <Badge variant="outline">default</Badge>}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {apiKey.secretName || apiKey.secretId} · {apiKey.envName || "no env"}
          </p>
          <code className="mt-2 block truncate text-xs text-muted-foreground">
            {value || "••••••••••••••••"}
          </code>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={onReveal}>
            <EyeIcon data-icon="inline-start" />
            Reveal
          </Button>
          <Button variant="outline" size="sm" disabled={!value} onClick={onCopy}>
            Copy
          </Button>
          <Button size="sm" onClick={onUse}>
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function splitTags(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
