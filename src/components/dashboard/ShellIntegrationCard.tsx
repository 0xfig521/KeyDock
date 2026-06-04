import { PlugIcon, RefreshCwIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ShellIntegrationStatus } from "@/types"

interface ShellIntegrationCardProps {
  status: ShellIntegrationStatus | null
  onInstall: () => void
  onRefresh?: () => void
}

export function ShellIntegrationCard({
  status,
  onInstall,
  onRefresh,
}: ShellIntegrationCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="bg-muted/70 border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("shellIntegration.title")}
            </h3>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title={t("shellIntegration.recheck")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCwIcon className="size-3" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("shellIntegration.description")}
          </p>
        </div>
        {status?.installed ? (
          <Badge
            variant="secondary"
            className="h-7 gap-1.5 rounded-md border-emerald-300 bg-emerald-100 px-3 text-xs text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            <PlugIcon className="size-3" />
            {t("shellIntegration.installed")}
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onInstall}
            className="h-7 text-xs border-border text-muted-foreground hover:bg-accent shrink-0"
          >
            <PlugIcon className="size-3 mr-1.5" />
            {t("shellIntegration.install")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px]">
        <span
          className={
            status?.installed
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          }
        >
          {status?.installed
            ? t("shellIntegration.detected", { path: status.rcPath })
            : status === null
              ? t("shellIntegration.checking")
              : t("shellIntegration.notInstalled")}
        </span>
      </div>

      <p className="text-[10px] leading-relaxed text-amber-700/70 dark:text-amber-300/70">
        {t("shellIntegration.warning")}
      </p>
    </Card>
  )
}
