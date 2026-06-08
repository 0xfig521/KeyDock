import { useEffect, useState } from "react"
import { RefreshCcwIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { AuditLog } from "@/types"

type Filter = "all" | "sensitive" | "mutations" | "export"

function matchFilter(log: AuditLog, filter: Filter): boolean {
  switch (filter) {
    case "all":
      return true
    case "sensitive":
      return log.action.includes("reveal") || log.action.includes("copy")
    case "mutations":
      return (
        log.action.includes("create") ||
        log.action.includes("edit") ||
        log.action.includes("delete") ||
        log.action.includes("map") ||
        log.action.includes("unmap")
      )
    case "export":
      return log.action.includes("export")
  }
}

interface AuditTabProps {
  logs: AuditLog[]
  onRefresh: () => void
}

export function AuditTab({ logs, onRefresh }: AuditTabProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>("all")

  // Lazy-load audit logs when the user visits this tab.
  useEffect(() => { onRefresh() }, [onRefresh])

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: t("audit.filterAll") },
    { key: "sensitive", label: t("audit.filterReveal") },
    { key: "mutations", label: t("audit.filterMutations") },
    { key: "export", label: t("audit.filterExport") },
  ]

  const filtered = logs.filter((log) => matchFilter(log, filter))

  return (
    <div className="flex-1 p-8 max-w-4xl overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("audit.title")}
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            {t("audit.description")}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="size-8 border-border text-muted-foreground hover:text-foreground"
          title={t("audit.reload")}
        >
          <RefreshCcwIcon className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-1.5 text-[10px] font-medium rounded-md border transition-all cursor-pointer",
              filter === key
                ? "bg-muted text-foreground border-border"
                : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="bg-muted/20 border-border p-0 overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-muted-foreground">
                  {logs.length === 0
                    ? t("audit.noEvents")
                    : t("audit.noMatching")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((log) => {
                  const isSensitive =
                    log.action.includes("copy") ||
                    log.action.includes("reveal")
                  return (
                    <li
                      key={log.id}
                      className="flex items-center justify-between gap-4 px-5 py-3 text-xs hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                            isSensitive
                              ? "border-amber-300 dark:border-amber-700/40 text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/30"
                              : "border-emerald-300 dark:border-emerald-700/40 text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30",
                          )}
                        >
                          {log.action}
                        </span>
                        <span className="text-muted-foreground truncate font-mono text-[11px]">
                          {log.envName ?? log.targetName ?? "—"}
                        </span>
                      </div>
                      <time className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {formatTimestamp(log.createdAt)}
                      </time>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}
