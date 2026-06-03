import { HomeIcon, KeyRoundIcon, LayersIcon, LockIcon, SettingsIcon, ShieldCheckIcon, ShieldIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

export type SidebarTab = "dashboard" | "secrets" | "workspaces" | "audit" | "settings"

interface SidebarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  secretCount: number
  workspaceCount: number
  onLockClick: () => void
}

export function Sidebar({
  activeTab,
  onTabChange,
  secretCount,
  workspaceCount,
  onLockClick,
}: SidebarProps) {
  const { t } = useTranslation()

  const TAB_DEFS: {
    id: SidebarTab
    label: string
    icon: typeof HomeIcon
  }[] = [
    { id: "dashboard", label: t("sidebar.dashboard"), icon: HomeIcon },
    { id: "secrets", label: t("sidebar.secrets"), icon: KeyRoundIcon },
    { id: "workspaces", label: t("sidebar.workspaces"), icon: LayersIcon },
    { id: "audit", label: t("sidebar.audit"), icon: ShieldIcon },
    { id: "settings", label: t("sidebar.settings"), icon: SettingsIcon },
  ]

  return (
    <aside className="w-[260px] h-screen overflow-x-hidden border-r border-border bg-card/20 backdrop-blur-md flex flex-col justify-between p-4 sticky top-0 shrink-0 z-40">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-extrabold tracking-tighter bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              KeyDock<span className="text-emerald-500">.</span>
            </span>
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
          </div>
          <Badge
            variant="secondary"
            className="text-[9px] py-0 px-1 font-mono uppercase bg-muted text-muted-foreground"
          >
            v0.1
          </Badge>
        </div>

        <Separator className="bg-border/60" />

        <nav className="space-y-1">
          {TAB_DEFS.map(({ id, label, icon: Icon }) => {
            const count =
              id === "secrets"
                ? secretCount
                : id === "workspaces"
                  ? workspaceCount
                  : null
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all",
                  activeTab === id
                    ? "bg-emerald-100 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-transparent",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </div>
                {count !== null && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono py-0 px-1 bg-card border text-muted-foreground"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="space-y-3">
        <div className="bg-muted/60 border border-border p-2.5 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheckIcon className="size-3.5 text-emerald-500" />
            <span className="text-[10px] font-semibold text-card-foreground uppercase tracking-wider">
              {t("sidebar.vaultStatus")}
            </span>
          </div>
          <p className="text-[9px] leading-relaxed text-muted-foreground">
            {t("sidebar.vaultDesc")}
          </p>
        </div>

        <Button
          onClick={onLockClick}
          variant="outline"
          className="w-full h-8 text-[11px] font-medium border-border text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-950/20 rounded-md transition-colors"
        >
          <LockIcon className="size-3 mr-2" />
          {t("sidebar.lockVault")}
        </Button>
      </div>
    </aside>
  )
}
