import { PlusIcon, SettingsIcon, Trash2Icon } from "lucide-react"
import type { FormEvent } from "react"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { UseApiKeys } from "@/hooks/useApiKeys"
import { defaultEnvNameForSecret } from "@/constants"
import { ApiKeyCard } from "./ApiKeyCard"
import { ApiKeyForm } from "./ApiKeyForm"
import type { ApiKey, Secret } from "@/types"

interface SecretDetailsProps {
  secret: Secret
  apiKeys: UseApiKeys
  selectedWorkspaceId: string
  onEdit: () => void
  onDelete: () => void
}

export function SecretDetails({
  secret,
  apiKeys,
  selectedWorkspaceId,
  onEdit,
  onDelete,
}: SecretDetailsProps) {
  const selectedApiKeys = useMemo(
    () => apiKeys.apiKeys.filter((k) => k.secretId === secret.id),
    [apiKeys.apiKeys, secret.id],
  )

  function openCreateForm() {
    apiKeys.openForm({
      name: "default",
      value: "",
      envName: defaultEnvNameForSecret(secret.name),
      includeByDefault: true,
      tags: "",
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (apiKeys.submitting) return
    await apiKeys.save(secret.id)
  }

  async function handleDelete(key: ApiKey) {
    await apiKeys.remove(key.id, key.name)
  }

  return (
    <div className="space-y-6">
      {/* Service header */}
      <div className="flex items-start justify-between gap-6 pb-4 border-b border-zinc-900">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {secret.name}
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono border-zinc-800 text-zinc-400"
            >
              {secret.category}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            {secret.description || "No description provided for this group."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-7 text-xs border-zinc-850 text-zinc-400 hover:text-zinc-200"
          >
            <SettingsIcon className="size-3 mr-1.5" />
            Edit Group
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-7 text-xs border-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
          >
            <Trash2Icon className="size-3 mr-1.5" />
            Delete Group
          </Button>
        </div>
      </div>

      {/* Metadata block */}
      {(secret.baseUrl || secret.modelName) && (
        <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 border border-zinc-900 rounded-lg p-3 text-xs">
          {secret.baseUrl && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                Base URL
              </span>
              <code className="block font-mono text-[11px] text-zinc-300 truncate">
                {secret.baseUrl}
              </code>
            </div>
          )}
          {secret.modelName && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                Default Model
              </span>
              <code className="block text-zinc-300 font-mono text-[11px]">
                {secret.modelName}
              </code>
            </div>
          )}
        </div>
      )}

      {/* API keys block */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Credentials & API Keys
          </h3>
          {!apiKeys.showForm && (
            <Button
              size="sm"
              variant="ghost"
              onClick={openCreateForm}
              className="h-7 text-xs bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
            >
              <PlusIcon className="size-3 mr-1" />
              Add API Key
            </Button>
          )}
        </div>

        {apiKeys.showForm && (
          <ApiKeyForm
            form={apiKeys.form}
            onChange={apiKeys.setForm}
            onSubmit={handleSubmit}
            onCancel={apiKeys.closeForm}
            submitting={apiKeys.submitting}
          />
        )}

        <div className="space-y-2.5">
          {selectedApiKeys.length === 0 ? (
            <div className="p-8 border border-dashed rounded-lg border-zinc-800 text-center">
              <p className="text-xs text-zinc-500">
                No API Keys created yet for this service.
              </p>
            </div>
          ) : (
            selectedApiKeys.map((key) => (
              <ApiKeyCard
                key={key.id}
                apiKey={key}
                revealed={apiKeys.getRevealed(key.id)}
                onReveal={apiKeys.reveal}
                onDelete={handleDelete}
                workspaceIdForAudit={selectedWorkspaceId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
