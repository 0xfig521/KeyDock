import { memo, useMemo } from "react"
import { PlusIcon, SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Key, Secret } from "@/types"

interface SecretListProps {
  secrets: Secret[]
  keys: Key[]
  selectedId: string
  search: string
  loading: boolean
  onSearchChange: (q: string) => void
  onSelect: (id: string) => void
  onAdd: () => void
}

export function SecretList({
  secrets,
  keys,
  selectedId,
  search,
  loading,
  onSearchChange,
  onSelect,
  onAdd,
}: SecretListProps) {
  const { t } = useTranslation()

  const keysCountMap = useMemo(
    () => keys.reduce<Record<string, number>>(
      (m, k) => {
        m[k.secretId] = (m[k.secretId] ?? 0) + 1
        return m
      },
      {},
    ),
    [keys],
  )

  const isSearching = search.trim().length > 0

  return (
    <div className="w-[300px] min-w-0 overflow-x-hidden border-r border-border flex flex-col sticky top-0 h-screen bg-card/10">
      <div className="p-4 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("secrets.title")}
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAdd}
            className="h-6 w-6 p-0 rounded-md hover:bg-accent text-card-foreground"
            aria-label={t("secrets.createSecret")}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("secrets.searchPlaceholder")}
            className="h-8 pl-8 text-xs bg-background/50 border-border"
          />
        </div>
      </div>

      <ScrollArea className="flex-grow border-t border-border">
        <div className="p-2.5 space-y-1">
          {loading && secrets.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-md border border-transparent"
              >
                <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-1/3 bg-muted/60 rounded animate-pulse" />
              </div>
            ))
          ) : secrets.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">
                {isSearching ? t("secrets.noSecretsFound") : t("secrets.noSecrets")}
              </p>
            </div>
          ) : (
            secrets.map((secret) => (
              <SecretListItem
                key={secret.id}
                secret={secret}
                keysCount={keysCountMap[secret.id] ?? 0}
                isSelected={selectedId === secret.id}
                onSelect={onSelect}
                t={t}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface SecretListItemProps {
  secret: Secret
  keysCount: number
  isSelected: boolean
  onSelect: (id: string) => void
  t: (key: string, options?: Record<string, unknown>) => string
}

const SecretListItem = memo(function SecretListItem({
  secret,
  keysCount,
  isSelected,
  onSelect,
  t,
}: SecretListItemProps) {
  const tags = secret.tags ?? []
  return (
    <button
      onClick={() => onSelect(secret.id)}
      className={cn(
        "w-full text-left p-3 rounded-md transition-all border text-xs relative",
        isSelected
          ? "bg-card border-border text-foreground font-medium"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40",
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="truncate">{secret.name}</span>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1 font-mono shrink-0 uppercase border-border text-muted-foreground"
        >
          {secret.category}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>
          {t("secrets.keyCount", { count: keysCount })}
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
