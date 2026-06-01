import { memo } from "react"
import { CheckIcon, CodeIcon, CopyIcon, EyeIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useClipboard } from "@/hooks/useClipboard"
import type { ApiKey } from "@/types"

interface ApiKeyCardProps {
  apiKey: ApiKey
  revealed: string | undefined
  onReveal: (key: ApiKey, workspaceId: string) => void
  onEdit?: (key: ApiKey) => void
  onDelete: (key: ApiKey) => void
  workspaceIdForAudit: string
}

const MASK = "••••••••••••••••••••••••••••••••"

/**
 * Single API key row. Renders the metadata + value (masked or revealed)
 * and the reveal/copy/delete action cluster. Memoized so keystrokes in
 * the create-secret form do not re-render every existing card.
 */
function ApiKeyCardImpl({
  apiKey,
  revealed,
  onReveal,
  onEdit,
  onDelete,
  workspaceIdForAudit,
}: ApiKeyCardProps) {
  const { copiedText, copy } = useClipboard()
  const displayValue = revealed ?? MASK
  const canCopy = Boolean(revealed)

  return (
    <Card className="bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 transition-colors">
      <CardContent className="p-4 flex items-center justify-between gap-4 text-xs">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-200">{apiKey.name}</span>
            {apiKey.includeByDefault && (
              <Badge
                variant="secondary"
                className="text-[9px] py-0 px-1 font-mono uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-900/30"
              >
                Default Export
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 font-mono uppercase border-zinc-800 text-zinc-500"
            >
              Encrypted
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-500">ENV:</span>
            <code className="text-[11px] text-zinc-400 font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800/60">
              {apiKey.envName || "NONE"}
            </code>
          </div>

          <div className="pt-1.5 flex items-center gap-1">
            <CodeIcon className="size-3.5 text-zinc-600 shrink-0" />
            <code className="font-mono text-[10px] text-zinc-500 truncate select-all">
              {displayValue}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReveal(apiKey, workspaceIdForAudit)}
            className="h-7 w-7 p-0 border-zinc-900 text-zinc-400 hover:text-zinc-200"
            title="Reveal Key"
          >
            <EyeIcon className="size-3.5" />
          </Button>

          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(apiKey)}
              className="h-7 w-7 p-0 border-zinc-900 text-zinc-400 hover:text-zinc-200"
              title="Edit Key"
            >
              <PencilIcon className="size-3.5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={!canCopy}
            onClick={() =>
              copy({
                text: revealed!,
                label: "API Key Value",
                targetId: apiKey.id,
                workspaceId: workspaceIdForAudit || null,
                envName: apiKey.envName ?? null,
              })
            }
            className="h-7 w-7 p-0 border-zinc-900 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
            title="Copy Value"
          >
            {copiedText === revealed && revealed ? (
              <CheckIcon className="size-3.5 text-emerald-400 animate-in zoom-in-50" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(apiKey)}
            className="h-7 w-7 p-0 border-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
            title="Delete Key"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export const ApiKeyCard = memo(ApiKeyCardImpl)
