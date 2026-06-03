import { memo, type RefObject } from "react"
import { PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
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
  loading: boolean
  onSelect: (id: string) => void
  onFormNameChange: (name: string) => void
  onCreate: (event: React.FormEvent) => void
  createInputRef?: RefObject<HTMLInputElement>
  activeWorkspaceId: string | null
}

export const WorkspaceList = memo(function WorkspaceList({
  workspaces,
  formName,
  submitting,
  selectedId,
  loading,
  onSelect,
  onFormNameChange,
  onCreate,
  createInputRef,
  activeWorkspaceId,
}: WorkspaceListProps) {
  const { t } = useTranslation()

  return (
    <div className="w-[280px] min-w-0 overflow-x-hidden border-r border-border flex flex-col sticky top-0 h-screen bg-card/10">
      <div className="p-4 space-y-3 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("workspaces.title")}
        </h2>
        <form onSubmit={onCreate} className="flex gap-2">
          <Input
            ref={createInputRef}
            value={formName}
            onChange={(e) => onFormNameChange(e.target.value)}
            placeholder={t("workspaces.createPlaceholder")}
            className="h-8 text-xs bg-background/50 border-border"
            disabled={submitting}
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 px-2 bg-card border border-border text-card-foreground hover:bg-accent"
            disabled={submitting}
            aria-label={t("workspaces.createAria")}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-grow border-t border-border">
        <div className="p-2.5 space-y-1">
          {loading && workspaces.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-md border border-transparent"
              >
                <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-1/3 bg-muted/60 rounded animate-pulse" />
              </div>
            ))
          ) : workspaces.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">{t("workspaces.noWorkspaces")}</p>
            </div>
          ) : (
            workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => onSelect(ws.id)}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-all border text-xs relative",
                  selectedId === ws.id
                    ? "bg-card border-border text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40",
                  activeWorkspaceId === ws.id && "border-emerald-300 dark:border-emerald-900/60",
                )}
              >
                {selectedId === ws.id && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="block truncate font-mono text-[11px]">
                    {ws.name}
                  </span>
                  {activeWorkspaceId === ws.id && (
                    <span className="shrink-0 flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                      {t("workspaces.active")}
                    </span>
                  )}
                </div>
                <span className="block text-[9px] text-muted-foreground mt-0.5">
                  {t("workspaces.envGroup")}
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
})
