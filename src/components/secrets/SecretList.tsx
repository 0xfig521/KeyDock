import { PlusIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { ApiKey, Secret } from "@/types"

interface SecretListProps {
  secrets: Secret[]
  apiKeys: ApiKey[]
  selectedId: string
  search: string
  onSearchChange: (q: string) => void
  onSelect: (id: string) => void
  onAdd: () => void
}

/**
 * Left column inside the Secrets tab. Searchable, key-count annotated
 * list of service groups. Pure presentational.
 */
export function SecretList({
  secrets,
  apiKeys,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onAdd,
}: SecretListProps) {
  return (
    <div className="w-[300px] border-r border-border flex flex-col sticky top-0 h-screen bg-card/10 shrink-0">
      <div className="p-4 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Services
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAdd}
            className="h-6 w-6 p-0 rounded-md hover:bg-zinc-800 text-zinc-300"
            aria-label="Add service"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search services..."
            className="h-8 pl-8 text-xs bg-background/50 border-zinc-800"
          />
        </div>
      </div>

      <ScrollArea className="flex-grow border-t border-zinc-900">
        <div className="p-2.5 space-y-1">
          {secrets.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-zinc-500">No services found</p>
            </div>
          ) : (
            secrets.map((secret) => {
              const keysCount = apiKeys.filter(
                (k) => k.secretId === secret.id,
              ).length
              const tags = secret.tags ?? []
              return (
                <button
                  key={secret.id}
                  onClick={() => onSelect(secret.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-md transition-all border text-xs relative",
                    selectedId === secret.id
                      ? "bg-zinc-900 border-zinc-800 text-foreground font-medium"
                      : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40",
                  )}
                >
                  {selectedId === secret.id && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
                  )}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="truncate">{secret.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] py-0 px-1 font-mono shrink-0 uppercase border-zinc-800 text-zinc-500"
                    >
                      {secret.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <span>
                      {keysCount} key{keysCount !== 1 ? "s" : ""}
                    </span>
                    {tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          {tags.slice(0, 2).join(", ")}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
