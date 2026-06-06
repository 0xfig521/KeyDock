import { useState } from "react"
import { PowerIcon, PowerOffIcon, RefreshCwIcon, Trash2Icon, FileTextIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useClipboard } from "@/hooks/useClipboard"
import { useToast } from "@/hooks/useToast"
import { useVariables } from "@/hooks/useVariables"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { deleteWorkspace as deleteWorkspaceApi } from "@/lib/tauri"
import type { Key, Workspace, WorkspaceVariable } from "@/types"
import { EnvExport } from "./EnvExport"
import { RunCommandCard } from "./RunCommandCard"
import { VariableList } from "./VariableList"
import { VariableMapper } from "./VariableMapper"

interface WorkspaceDetailsProps {
  workspace: Workspace
  keys: Key[]
  selectedSecretId: string
  variables: ReturnType<typeof useVariables>
  onDeleteWorkspace?: (id: string) => void
}

export function WorkspaceDetails({
  workspace,
  keys,
  selectedSecretId,
  variables,
  onDeleteWorkspace,
}: WorkspaceDetailsProps) {
  const { t } = useTranslation()
  const { copy } = useClipboard()
  const shellCmd = `keydock run -- bun run dev`
  const isActive = variables.activeWorkspace?.id === workspace.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 gap-y-2 pb-4 border-b border-border flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground font-mono break-all min-w-0">
            {workspace.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("workspaces.detailsDesc")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1 shrink-0 flex-wrap">
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={variables.activate}
            className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-500 text-white"
            title={isActive ? t("workspaceDetails.reactivate") : t("workspaceDetails.activate")}
          >
            {isActive ? <RefreshCwIcon className="size-3.5" /> : <PowerIcon className="size-3.5" />}
          </Button>
          {variables.activeWorkspace && (
            <Button
              variant="outline"
              size="sm"
              onClick={variables.deactivate}
              className="h-7 w-7 p-0 border-border text-muted-foreground hover:text-foreground"
              title={t("workspaceDetails.deactivate")}
            >
              <PowerOffIcon className="size-3.5" />
            </Button>
          )}
          <DeleteWorkspaceButton
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            isActive={isActive}
            onDelete={onDeleteWorkspace}
            deactivate={variables.deactivate}
          />
        </div>
      </div>

      <div className="grid gap-8">
        {isActive && variables.variables.length > 0 && (
          <Card className="border-emerald-300 dark:border-emerald-900/40 bg-muted/60 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
              <FileTextIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t("workspaceDetails.activeEnvPreview")}
              </span>
              <span className="text-[9px] text-muted-foreground ml-auto">
                {t("workspaceDetails.varsCount", { count: variables.activeWorkspace?.envCount ?? variables.variables.length })}
              </span>
            </div>
            <ScrollArea className="max-h-48">
              <div className="p-3 pt-1 space-y-0.5 font-mono text-[11px] leading-relaxed">
                <div className="text-[10px] text-muted-foreground pb-1 select-none">
                  {t("workspaceDetails.generatedBy")}
                </div>
                {variables.variables.map((v) => (
                  <div key={v.envName} className="flex items-center gap-2">
                    <span className="text-emerald-700/90 dark:text-emerald-300/90 shrink-0">
                      {v.envName}
                    </span>
                    <span className="text-muted-foreground">=</span>
                    <span className="text-muted-foreground truncate font-mono">
                      {v.preview ?? "···"}
                    </span>
                    {v.secretName && (
                      <span className="text-[9px] text-muted-foreground shrink-0 ml-auto">
                        ← {v.secretName}/{v.keyName ?? "?"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("workspaceDetails.envMapping")}
            </h3>
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedSecretId}
              onClick={() => variables.addDefaultsForSecret(selectedSecretId)}
              className="h-7 text-xs border-border hover:bg-accent text-muted-foreground disabled:opacity-30"
              title={!selectedSecretId ? t("workspaceDetails.selectServiceTip") : undefined}
            >
              {t("workspaceDetails.importDefaults")}
            </Button>
          </div>

          <VariableMapper
            keys={keys}
            mappingKey={variables.mappingKey}
            mappingEnv={variables.mappingEnv}
            submitting={variables.submitting}
            existingEnvNames={variables.variables.map((v) => v.envName)}
            onKeyChange={variables.setMappingKey}
            onEnvChange={variables.setMappingEnv}
            onSubmit={(event) => {
              event.preventDefault()
              variables.map({
                keyId: variables.mappingKey,
                envName: variables.mappingEnv,
              })
            }}
          />

          <VariableList
            variables={variables.variables}
            onUnbind={(v: WorkspaceVariable) => variables.unmap(v.envName)}
          />
        </section>

        <RunCommandCard
          command={shellCmd}
          onCopy={() => copy({ text: shellCmd, label: "Shell command" })}
        />

        <EnvExport
          text={variables.exportedEnv}
          onGenerate={variables.generateEnv}
          onClear={variables.clearExport}
          onCopy={() =>
            copy({
              text: variables.exportedEnv,
              label: ".env Configuration",
            })
          }
        />
      </div>
    </div>
  )
}

function DeleteWorkspaceButton({
  workspaceId,
  workspaceName,
  onDelete,
  isActive,
  deactivate,
}: {
  workspaceId: string
  workspaceName: string
  onDelete?: (id: string) => void
  isActive?: boolean
  deactivate?: () => Promise<void>
}) {
  const { t } = useTranslation()
  const { show } = useToast()
  const confirm_ = useConfirm()
  const [deleting, setDeleting] = useState(false)

  async function handleClick() {
    const ok = await confirm_({
      title: t("workspaceDetails.deleteConfirmTitle"),
      message: isActive
        ? t("workspaceDetails.deleteConfirmActiveMsg", { name: workspaceName })
        : t("workspaceDetails.deleteConfirmMsg", { name: workspaceName }),
      confirmLabel: t("workspaceDetails.delete"),
      variant: "danger",
    })
    if (!ok) return
    try {
      setDeleting(true)
      // Deactivate first if this is the active workspace
      if (isActive && deactivate) {
        await deactivate()
      }
      await deleteWorkspaceApi(workspaceId)
      show(t("workspaceDetails.deletedMsg", { name: workspaceName }), "info")
      onDelete?.(workspaceId)
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), "error")
    } finally {
      setDeleting(false)
    }
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={deleting}
      className="h-7 w-7 p-0 border-border text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20"
      title={t("workspaceDetails.deleteWorkspace")}
    >
      <Trash2Icon className="size-3.5" />
    </Button>
  )
}
