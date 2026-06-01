import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Workspace } from "@/types"

interface WorkspaceListProps {
  workspaces: Workspace[]
  formName: string
  submitting: boolean
  selectedId: string
  onSelect: (id: string) => void
  onFormNameChange: (name: string) => void
  onCreate: (event: React.FormEvent) => void
}

export function WorkspaceList({
  workspaces,
  formName,
  submitting,
  selectedId,
  onSelect,
  onFormNameChange,
  onCreate,
}: WorkspaceListProps) {
  return (
    <div className="w-[280px] border-r border-border flex flex-col sticky top-0 h-screen bg-card/10 shrink-0">
      <div className="p-4 space-y-3 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Workspaces
        </h2>
        <form onSubmit={onCreate} className="flex gap-2">
          <Input
            value={formName}
            onChange={(e) => onFormNameChange(e.target.value)}
            placeholder="e.g. dev-env"
            className="h-8 text-xs bg-background/50 border-zinc-800"
            disabled={submitting}
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            disabled={submitting}
            aria-label="Create workspace"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-grow border-t border-zinc-900">
        <div className="p-2.5 space-y-1">
          {workspaces.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-zinc-500">No workspaces created</p>
            </div>
          ) : (
            workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => onSelect(ws.id)}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-all border text-xs relative",
                  selectedId === ws.id
                    ? "bg-zinc-900 border-zinc-800 text-foreground font-medium"
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40",
                )}
              >
                {selectedId === ws.id && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
                )}
                <span className="block truncate font-mono text-[11px]">
                  {ws.name}
                </span>
                <span className="block text-[9px] text-zinc-500 mt-0.5">
                  Local configuration pack
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
