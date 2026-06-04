import { useEffect, useMemo, useState } from "react"
import {
  ArrowRightIcon,
  KeyRoundIcon,
  LayersIcon,
  ActivityIcon,
  ShieldIcon,
  ZapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShellIntegrationCard } from "@/components/dashboard/ShellIntegrationCard"
import { useShellIntegration } from "@/hooks/useShellIntegration"
import type {
  Key,
  ActiveWorkspace,
  AuditLog,
} from "@/types"
import type { UseSecrets } from "@/hooks/useSecrets"
import type { UseKeys } from "@/hooks/useKeys"
import type { UseWorkspaces } from "@/hooks/useWorkspaces"
import type { UseAudit } from "@/hooks/useAudit"
import type { SidebarTab } from "@/components/layout/Sidebar"

const EXPIRING_SOON_DAYS = 7

interface DashboardTabProps {
  secrets: UseSecrets
  keys: UseKeys
  workspaces: UseWorkspaces
  audit: UseAudit
  activeWorkspace: ActiveWorkspace | null
  onSelectTab: (tab: SidebarTab) => void
  onSelectWorkspace: (id: string) => void
}

function formatTimeAgo(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t("dashboard.timeJustNow")
  if (mins < 60) return t("dashboard.timeMinutesAgo", { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t("dashboard.timeHoursAgo", { count: hours })
  const days = Math.floor(hours / 24)
  return t("dashboard.timeDaysAgo", { count: days })
}

function actionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function actionBadgeClasses(action: string): string {
  if (action.includes("copy") || action.includes("reveal")) {
    return "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/20"
  }
  return "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20"
}

export function DashboardTab({
  secrets,
  keys,
  workspaces,
  audit,
  activeWorkspace,
  onSelectTab,
  onSelectWorkspace,
}: DashboardTabProps) {
  const { t } = useTranslation()
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const shellIntegration = useShellIntegration()

  useEffect(() => {
    void audit.refresh()
  }, [audit.refresh])

  const expiringEntries = useMemo(() => {
    const now = Date.now()
    return keys.keys
      .filter((k): k is Key & { expiresAt: string } => !!k.expiresAt)
      .map((k) => {
        const expiry = new Date(k.expiresAt).getTime()
        const diffMs = expiry - now
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        let status: "expired" | "expiring-soon" | "healthy"
        if (diffDays <= 0) {
          status = "expired"
        } else if (diffDays <= EXPIRING_SOON_DAYS) {
          status = "expiring-soon"
        } else {
          status = "healthy"
        }
        return { ...k, diffDays, status }
      })
      .filter((k) => k.status !== "healthy")
      .sort((a, b) => a.diffDays - b.diffDays)
  }, [keys.keys])

  useEffect(() => {
    setRecentLogs(audit.logs.slice(0, 5))
  }, [audit.logs])

  const stats = [
    {
      label: t("dashboard.statsApiKeys"),
      value: keys.keys.length,
      icon: KeyRoundIcon,
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-100 dark:bg-blue-500/10",
      tab: "secrets" as SidebarTab,
    },
    {
      label: t("dashboard.statsWorkspaces"),
      value: workspaces.workspaces.length,
      icon: LayersIcon,
      color: "from-violet-500 to-violet-600",
      bg: "bg-violet-100 dark:bg-violet-500/10",
      tab: "workspaces" as SidebarTab,
    },
  ]

  const hasData = secrets.secrets.length > 0

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("dashboard.heading")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20"
        >
          <span className="relative flex size-1.5 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
          </span>
          {t("dashboard.vaultUnlocked")}
        </Badge>
      </div>

      {/* Active Workspace Card */}
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ZapIcon className="size-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">
                {t("dashboard.activeWorkspace")}
              </h2>
            </div>
            {activeWorkspace ? (
              <Badge className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20 text-[10px] font-mono">
                <CheckCircleIcon className="size-3 mr-1" />
                {t("dashboard.active")}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground border-border text-[10px] font-mono"
              >
                <XCircleIcon className="size-3 mr-1" />
                {t("dashboard.inactive")}
              </Badge>
            )}
          </div>

          {activeWorkspace ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-foreground">
                  {activeWorkspace.name}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {activeWorkspace.sourceType}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {activeWorkspace.envCount}
                  </span>{" "}
                  {t("dashboard.envVariables")}
                </span>
                {activeWorkspace.envNames.length > 0 && (
                  <span className="text-muted-foreground/70">·</span>
                )}
                {activeWorkspace.envNames.slice(0, 4).map((name) => (
                  <code
                    key={name}
                    className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-card-foreground"
                  >
                    {name}
                  </code>
                ))}
                {activeWorkspace.envNames.length > 4 && (
                  <span className="text-[10px] text-muted-foreground/70">
                    {t("dashboard.moreItems", { count: activeWorkspace.envNames.length - 4 })}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectTab("workspaces")
                  onSelectWorkspace(activeWorkspace.id)
                }}
                className="h-7 text-[11px] border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                {t("dashboard.manageInWorkspaces")}
                <ArrowRightIcon className="size-3 ml-1.5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("dashboard.noActiveWorkspace")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectTab("workspaces")}
                className="h-7 text-[11px] border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                {t("dashboard.goToWorkspaces")}
                <ArrowRightIcon className="size-3 ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <ShellIntegrationCard
        status={shellIntegration.status}
        onInstall={shellIntegration.install}
        onRefresh={shellIntegration.refresh}
      />

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-5">
        {stats.map(({ label, value, icon: Icon, color, bg, tab }) => (
          <button
            key={label}
            onClick={() => onSelectTab(tab)}
            className="rounded-xl border border-border bg-card/50 p-5 text-left transition-all hover:bg-accent/50 hover:border-border group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`size-9 rounded-lg ${bg} flex items-center justify-center`}
              >
                <Icon className="size-4 text-card-foreground" />
              </div>
              <ChevronRightIcon className="size-3.5 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {value}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* Expiring Keys */}
      {expiringEntries.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("dashboard.expiringKeys")}
                </h2>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] font-mono bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/20"
              >
                {t("dashboard.expireCount", { count: expiringEntries.length })}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t("dashboard.expiringKeysDesc")}
            </p>
            <div className="space-y-1">
              {expiringEntries.slice(0, 8).map((entry) => {
                const label =
                  entry.status === "expired"
                    ? t("dashboard.expiredDaysAgo", { days: Math.abs(entry.diffDays) })
                    : entry.diffDays === 0
                      ? t("dashboard.expiresToday")
                      : t("dashboard.expiresIn", { days: entry.diffDays })
                const badgeClass =
                  entry.status === "expired"
                    ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/20"
                    : "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/20"
                const badgeLabel =
                  entry.status === "expired"
                    ? t("dashboard.expired")
                    : t("dashboard.expiringSoon")
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
                    onClick={() => onSelectTab("secrets")}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`size-2 rounded-full shrink-0 ${
                          entry.status === "expired"
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground truncate">
                            {entry.name}
                          </span>
                          {entry.secretName && (
                            <span className="text-[10px] text-muted-foreground/60 truncate">
                              · {entry.secretName}
                            </span>
                          )}
                        </div>
                        {entry.envName && (
                          <code className="text-[10px] font-mono text-muted-foreground/70">
                            {entry.envName}
                          </code>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge
                        variant="secondary"
                        className={`text-[9px] font-mono py-0 px-1.5 uppercase ${badgeClass}`}
                      >
                        {badgeLabel}
                      </Badge>
                      <span
                        className={`text-[10px] font-mono ${
                          entry.status === "expired"
                            ? "text-red-500/80"
                            : "text-muted-foreground/70"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {expiringEntries.length > 8 && (
              <button
                onClick={() => onSelectTab("secrets")}
                className="w-full mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors py-1"
              >
                {t("dashboard.showExpiringKeys")}
                <ArrowRightIcon className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-2 gap-5">
        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ZapIcon className="size-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("dashboard.quickActions")}
            </h2>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => onSelectTab("secrets")}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-md bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                  <KeyRoundIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-medium">{t("dashboard.browseSecrets")}</span>
              </div>
              <ArrowRightIcon className="size-3.5" />
            </button>
            <button
              onClick={() => onSelectTab("workspaces")}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-md bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                  <LayersIcon className="size-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="font-medium">{t("dashboard.manageWorkspaces")}</span>
              </div>
              <ArrowRightIcon className="size-3.5" />
            </button>
            <button
              onClick={() => onSelectTab("audit")}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-md bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                  <ShieldIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="font-medium">{t("dashboard.viewAuditLog")}</span>
              </div>
              <ArrowRightIcon className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ActivityIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                {t("dashboard.recentActivity")}
              </h2>
            </div>
            {audit.logs.length > 5 && (
              <button
                onClick={() => onSelectTab("audit")}
                className="text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                {t("dashboard.viewAll")}
              </button>
            )}
          </div>

          {recentLogs.length > 0 ? (
            <div className="space-y-1">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="secondary"
                      className={`text-[9px] font-mono py-0 px-1.5 uppercase shrink-0 ${actionBadgeClasses(log.action)}`}
                    >
                      {actionLabel(log.action)}
                    </Badge>
                    {log.envName && (
                      <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                        {log.envName}
                      </code>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0 ml-2">
                    {formatTimeAgo(log.createdAt, t)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ActivityIcon className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground/70">
                {t("dashboard.noActivity")}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                {t("dashboard.activityHint")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <KeyRoundIcon className="size-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-card-foreground mb-1">
            {t("dashboard.getStarted")}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            {t("dashboard.getStartedDesc")}
          </p>
          <Button
            onClick={() => onSelectTab("secrets")}
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <KeyRoundIcon className="size-3.5 mr-1.5" />
            {t("dashboard.createServiceGroup")}
          </Button>
        </div>
      )}
    </div>
  )
}
