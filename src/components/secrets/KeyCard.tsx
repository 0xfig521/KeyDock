import { memo } from "react"
import { CheckIcon, CodeIcon, CopyIcon, EyeIcon, PencilIcon, PowerIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useClipboard } from "@/hooks/useClipboard"
import type { ActiveWorkspace, Key } from "@/types"

interface KeyCardProps {
  key_: Key
  revealed: string | undefined
  onReveal: (key: Key, workspaceId: string) => Promise<string | undefined>
  onEdit?: (key: Key) => void
  onActivate: (key: Key) => void
  onDelete: (key: Key) => void
  workspaceIdForAudit: string
  activeWorkspace: ActiveWorkspace | null
}

function KeyCardImpl({
  key_,
  revealed,
  onReveal,
  onEdit,
  onActivate,
  onDelete,
  workspaceIdForAudit,
  activeWorkspace,
}: KeyCardProps) {
  const { t } = useTranslation()
  const { copiedText, copy } = useClipboard()
  const displayValue = revealed ?? key_.preview ?? "••••"
  const isMappedInWorkspace =
    activeWorkspace?.sourceType === "workspace" &&
    (activeWorkspace.envNames ?? []).includes(key_.envName ?? "")

  async function handleCopy() {
    let value = revealed
    if (!value) {
      value = await onReveal(key_, workspaceIdForAudit)
    }
    if (value) {
      await copy({
        text: value,
        label: "Key value",
        targetId: key_.id,
        workspaceId: workspaceIdForAudit || null,
        envName: key_.envName ?? null,
      })
    }
  }

  return (
    <Card className="bg-muted/20 border-border hover:border-border transition-colors">
      <CardContent className="p-3 space-y-3 text-xs">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">{key_.name}</span>
            {key_.includeByDefault && (
              <Badge
                variant="secondary"
                className="text-[9px] py-0 px-1 font-mono uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-900/30"
              >
                {t("keyCard.autoInclude")}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 font-mono uppercase border-border text-muted-foreground"
            >
              {t("keyCard.encrypted")}
            </Badge>
          </div>

          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{t("keyCard.envLabel")}</span>
            <code
              className="w-fit max-w-full text-[11px] text-muted-foreground font-mono bg-muted/80 px-1.5 py-0.5 rounded border border-border/60 cursor-pointer hover:text-foreground hover:bg-muted/90 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                if (key_.envName) {
                  void copy({
                    text: key_.envName,
                    label: "ENV name",
                    targetId: key_.id,
                    workspaceId: workspaceIdForAudit || null,
                    envName: key_.envName,
                  })
                }
              }}
              title={t("keyCard.copyEnvName")}
            >
              <span className="truncate">{key_.envName || "—"}</span>
            </code>
          </div>

          {key_.expiresAt && (
            <div className="flex items-center gap-1">
              <span
                className={
                  new Date(key_.expiresAt) < new Date()
                    ? "text-[9px] font-mono text-rose-500 dark:text-rose-400"
                    : "text-[9px] font-mono text-amber-600 dark:text-amber-400"
                }
              >
                {new Date(key_.expiresAt) < new Date()
                  ? t("keyCard.expired")
                  : t("keyCard.expires", { date: key_.expiresAt })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 min-w-0">
            {revealed && copiedText === revealed ? (
              <CheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <CodeIcon className="size-3.5 text-muted-foreground/70 shrink-0" />
            )}
            <code
              className="font-mono text-[10px] text-muted-foreground break-all select-all cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 min-w-0"
              onClick={handleCopy}
              title={t("keyCard.clickToCopy")}
            >
              {displayValue}
            </code>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReveal(key_, workspaceIdForAudit)}
            className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-foreground"
            title={t("keyCard.reveal")}
          >
            <EyeIcon className="size-3" />
          </Button>

          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(key_)}
              className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-foreground"
              title={t("keyCard.edit")}
            >
              <PencilIcon className="size-3" />
            </Button>
          )}

          <Button
            variant={isMappedInWorkspace ? "default" : "outline"}
            size="sm"
            disabled={!key_.envName || !activeWorkspace}
            onClick={() => onActivate(key_)}
            className={
              isMappedInWorkspace
                ? "h-6 w-6 p-0 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30"
                : "h-6 w-6 p-0 border-border text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/20 disabled:opacity-30"
            }
            title={
              !key_.envName
                ? t("keyCard.setEnvFirst")
                : !activeWorkspace
                  ? t("keyCard.noActiveWorkspace")
                  : isMappedInWorkspace
                    ? t("keyCard.mappedInWorkspace", { envName: key_.envName })
                    : t("keyCard.addToWorkspace", { envName: key_.envName })
            }
          >
            <PowerIcon className="size-3" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-foreground"
            title={t("keyCard.copyValue")}
          >
            {copiedText && revealed && copiedText === revealed ? (
              <CheckIcon className="size-3 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50" />
            ) : (
              <CopyIcon className="size-3" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(key_)}
            className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20"
            title={t("keyCard.delete")}
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export const KeyCard = memo(KeyCardImpl)
