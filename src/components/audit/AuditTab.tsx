import { RefreshCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { AuditLog } from "@/types"

interface AuditTabProps {
  logs: AuditLog[]
  onRefresh: () => void
}

/**
 * Security audit tab. Color-codes the action so reveal/copy events pop
 * in amber while other actions render in emerald. No mutations; pure
 * read-only display fed by `useAudit`.
 */
export function AuditTab({ logs, onRefresh }: AuditTabProps) {
  return (
    <div className="flex-1 p-8 max-w-4xl overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Security Audit
          </h1>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Read-only trail of every operation on secrets, API keys, and
            workspace mappings — create, edit, delete, reveal, copy, map,
            unmap, and export. Each entry records the action, target,
            workspace, and timestamp; never the secret value itself.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-8 text-xs border-zinc-800 text-zinc-400 hover:text-zinc-200"
        >
          <RefreshCcwIcon className="size-3 mr-1.5" />
          Reload logs
        </Button>
      </div>

      <Card className="bg-zinc-900/20 border-zinc-900 p-0 overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            {logs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-zinc-500">No audit events yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-900">
                {logs.map((log) => {
                  const isSensitive =
                    log.action.includes("copy") ||
                    log.action.includes("reveal")
                  return (
                    <li
                      key={log.id}
                      className="flex items-center justify-between gap-4 px-5 py-3 text-xs hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                            isSensitive
                              ? "border-amber-700/40 text-amber-400 bg-amber-950/30"
                              : "border-emerald-700/40 text-emerald-400 bg-emerald-950/30",
                          )}
                        >
                          {log.action}
                        </span>
                        <span className="text-zinc-400 truncate font-mono text-[11px]">
                          {log.envName ?? log.workspaceId ?? log.targetId ?? "—"}
                        </span>
                      </div>
                      <time className="text-[10px] text-zinc-500 font-mono shrink-0">
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
