import { ExternalLinkIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import type { FormEvent } from "react"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { UseKeys } from "@/hooks/useKeys"
import { useToast } from "@/hooks/useToast"
import { openExternal } from "@/lib/tauri"
import { defaultEnvNameForSecret } from "@/constants"
import { KeyCard } from "./KeyCard"
import { KeyForm } from "./KeyForm"
import type { ActiveWorkspace, Key, Secret } from "@/types"

interface SecretDetailsProps {
  secret: Secret
  keys: UseKeys
  selectedWorkspaceId: string
  activeWorkspace: ActiveWorkspace | null
  onEdit: () => void
  onDelete: () => void
}

export function SecretDetails({
  secret,
  keys,
  selectedWorkspaceId,
  activeWorkspace,
  onEdit,
  onDelete,
}: SecretDetailsProps) {
  const { t } = useTranslation()
  const { show } = useToast()
  const selectedKeys = useMemo(
    () => keys.keys.filter((k) => k.secretId === secret.id),
    [keys.keys, secret.id],
  )

  function openCreateForm() {
    keys.openForm({
      name: "default",
      value: "",
      envName: defaultEnvNameForSecret(secret.name),
      includeByDefault: true,
      tags: "",
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (keys.submitting) return
    await keys.save(secret.id)
  }

  const handleDelete = useCallback(
    async (key: Key) => {
      await keys.remove(key.id, key.name)
    },
    [keys.remove],
  )

  const handleReveal = useCallback(
    async (key: Key, workspaceId: string): Promise<string | undefined> =>
      keys.reveal(key, workspaceId || null),
    [keys.reveal],
  )

  const handleEdit = useCallback(
    (key: Key) => keys.startEdit(key),
    [keys.startEdit],
  )

  const handleActivate = useCallback(
    async (key: Key) => {
      if (!activeWorkspace || activeWorkspace.sourceType !== "workspace") {
        show("No active workspace. Activate a workspace first.", "error")
        return
      }
      await keys.activate(key, activeWorkspace.id, activeWorkspace.envNames)
    },
    [keys.activate, activeWorkspace, show],
  )

  return (
    <div className="space-y-6">
      {/* Service header */}
      <div className="flex items-start justify-between gap-4 gap-y-2 pb-4 border-b border-border flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground break-all min-w-0">
              {secret.name}
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono border-border text-muted-foreground shrink-0"
            >
              {secret.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            {secret.description || t("secretDetails.noDescription")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-7 w-7 p-0 border-border text-muted-foreground hover:text-foreground"
            title={t("secretDetails.editService")}
          >
            <PencilIcon className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-7 w-7 p-0 border-border text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20"
            title={t("secretDetails.deleteService")}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Metadata block */}
      <div className="space-y-2 bg-muted/60 border border-border rounded-lg p-3 text-xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {secret.baseUrl && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {t("secretDetails.baseUrl")}
              </span>
              <code
                className="font-mono text-[11px] text-card-foreground truncate cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 min-w-0 underline decoration-dotted underline-offset-2 hover:decoration-solid"
                onClick={() => openExternal(secret.baseUrl!)}
                title={t("secretDetails.openUrl")}
              >
                <ExternalLinkIcon className="size-3 text-muted-foreground shrink-0" />
                {secret.baseUrl}
              </code>
            </div>
          )}
          {secret.dashboardUrl && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {t("secretDetails.dashboardUrl")}
              </span>
              <code
                className="font-mono text-[11px] text-card-foreground truncate cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 min-w-0 underline decoration-dotted underline-offset-2 hover:decoration-solid"
                onClick={() => openExternal(secret.dashboardUrl!)}
                title={t("secretDetails.openUrl")}
              >
                <ExternalLinkIcon className="size-3 text-muted-foreground shrink-0" />
                {secret.dashboardUrl}
              </code>
            </div>
          )}
          {secret.docsUrl && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {t("secretDetails.docsUrl")}
              </span>
              <code
                className="font-mono text-[11px] text-card-foreground truncate cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 min-w-0 underline decoration-dotted underline-offset-2 hover:decoration-solid"
                onClick={() => openExternal(secret.docsUrl!)}
                title={t("secretDetails.openUrl")}
              >
                <ExternalLinkIcon className="size-3 text-muted-foreground shrink-0" />
                {secret.docsUrl}
              </code>
            </div>
          )}
          {secret.loginUrl && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {t("secretDetails.loginUrl")}
              </span>
              <code
                className="font-mono text-[11px] text-card-foreground truncate cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 min-w-0 underline decoration-dotted underline-offset-2 hover:decoration-solid"
                onClick={() => openExternal(secret.loginUrl!)}
                title={t("secretDetails.openUrl")}
              >
                <ExternalLinkIcon className="size-3 text-muted-foreground shrink-0" />
                {secret.loginUrl}
              </code>
            </div>
          )}
        </div>
        {(secret.tags ?? []).length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {t("secretDetails.tags")}
            </span>
            {(secret.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Keys block */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("secretDetails.keys")}
          </h3>
          {!keys.showForm && (
            <Button
              size="sm"
              variant="ghost"
              onClick={openCreateForm}
              className="h-7 text-xs bg-muted/60 hover:bg-accent text-card-foreground border border-border"
            >
              <PlusIcon className="size-3 mr-1" />
              {t("secretDetails.addKey")}
            </Button>
          )}
        </div>

        {keys.showForm && (
          <KeyForm
            form={keys.form}
            onChange={keys.setForm}
            onSubmit={handleSubmit}
            onCancel={keys.closeForm}
            submitting={keys.submitting}
            editingKey={Boolean(keys.editingId)}
          />
        )}

        <div className="space-y-2.5">
          {selectedKeys.length === 0 ? (
            <div className="p-8 border border-dashed rounded-lg border-border text-center">
              <p className="text-xs text-muted-foreground">
                {t("secretDetails.noKeys")}
              </p>
            </div>
          ) : (
            selectedKeys.map((key) => (
              <KeyCard
                key={key.id}
                key_={key}
                revealed={keys.getRevealed(key.id)}
                onReveal={handleReveal}
                onEdit={handleEdit}
                onActivate={handleActivate}
                onDelete={handleDelete}
                workspaceIdForAudit={selectedWorkspaceId}
                activeWorkspace={activeWorkspace}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
