import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { WorkspaceVariable } from "@/types"

interface VariableListProps {
  variables: WorkspaceVariable[]
  onUnbind: (variable: WorkspaceVariable) => void
}

export function VariableList({ variables, onUnbind }: VariableListProps) {
  if (variables.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-lg border-zinc-800 text-center">
        <p className="text-xs text-zinc-500">
          No variables mapped yet in this workspace.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {variables.map((variable) => (
        <Card
          key={variable.id}
          className="bg-zinc-900/10 border-zinc-900 hover:border-zinc-800/80 transition-colors"
        >
          <CardContent className="p-3 flex items-center justify-between gap-4 text-xs">
            <div className="min-w-0 flex-1">
              <code className="block font-mono text-[11px] text-zinc-200 truncate">
                {variable.envName}
              </code>
              <span className="block text-[10px] text-zinc-500 mt-0.5 truncate">
                Maps from: {variable.secretName ?? variable.secretId} /{" "}
                {variable.apiKeyName ?? variable.apiKeyId}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnbind(variable)}
              className="h-7 px-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 shrink-0"
            >
              Unbind
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
