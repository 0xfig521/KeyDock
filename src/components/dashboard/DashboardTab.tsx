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
  PowerIcon,
  TerminalIcon,
  ClockIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { listen } from "@tauri-apps/api/event"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShellIntegrationCard } from "@/components/dashboard/ShellIntegrationCard"
import { useShellIntegration } from "@/hooks/useShellIntegration"
import { getActivePreset, listSecretFields } from "@/lib/tauri"
import type {
  ActivePreset,
  AuditLog,
  SecretField,
} from "@/types"
import type { UseSecrets } from "@/hooks/useSecrets"
import type { UseAudit } from "@/hooks/useAudit"
import type { SidebarTab } from "@/components/layout/Sidebar"

interface ExpiringField {
  field: SecretField
  secretName: string
  secretId: string
  daysLeft: number
  isExpired: boolean
}

interface DashboardTabProps {
  secrets: UseSecrets
  audit: UseAudit
  presetCount?: number
  onSelectTab: (tab: SidebarTab) => void
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
  audit,
  presetCount = 0,
  onSelectTab,
}: DashboardTabProps) {
  const { t } = useTranslation()
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [activePreset, setActivePreset] = useState<ActivePreset | null>(null)
  const shellIntegration = useShellIntegration()

  const [expiringFields, setExpiringFields] = useState<ExpiringField[]>([])

  useEffect(() => {
    const secretsList = secrets.secrets
    if (!secretsList.length) {
      setExpiringFields([])
      return
    }

    const secretMap = new Map(secretsList.map((s) => [s.id, s.name]))

    void Promise.all(secretsList.map((s) => listSecretFields(s.id).catch(() => [] as SecretField[])))
      .then((allFields) => {
        const now = Date.now()
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        const result: ExpiringField[] = []

        for (let i = 0; i < allFields.length; i++) {
          const secretId = secretsList[i].id
          const secretName = secretMap.get(secretId) ?? "Unknown"
          for (const field of allFields[i]) {
            if (!field.expiresAt) continue
            const expTime = new Date(field.expiresAt + "T23:59:59").getTime()
            const diff = expTime - now
            const daysLeft = Math.round(diff / (24 * 60 * 60 * 1000))
            const isExpired = diff < 0
            if (isExpired || diff <= sevenDays) {
              result.push({ field, secretName, secretId, daysLeft, isExpired })
            }
          }
        }

        result.sort((a, b) => {
          if (a.isExpired !== b.isExpired) return a.isExpired ? -1 : 1
          return a.daysLeft - b.daysLeft
        })
        setExpiringFields(result)
      })
      .catch(() => setExpiringFields([]))
  }, [secrets.secrets])

  useEffect(() => {
    void audit.refresh()
  }, [audit.refresh])

  useEffect(() => {
    void getActivePreset().then(setActivePreset).catch(() => setActivePreset(null))
  }, [])

  useEffect(() => {
    const unlisten = listen("active-preset-changed", () => {
      void getActivePreset().then(setActivePreset).catch(() => setActivePreset(null))
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [])

  useEffect(() => {
    setRecentLogs(audit.logs.slice(0, 5))
  }, [audit.logs])

  const stats = [
    {
      label: t("dashboard.statsSecrets"),
      value: secrets.secrets.length,
      icon: KeyRoundIcon,
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-100 dark:bg-blue-500/10",
      tab: "secrets" as SidebarTab,
    },
    {
      label: t("dashboard.statsPresets"),
      value: presetCount,
      icon: LayersIcon,
      color: "from-violet-500 to-violet-600",
      bg: "bg-violet-100 dark:bg-violet-500/10",
      tab: "presets" as SidebarTab,
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

      {!shellIntegration.status?.installed && (
        <ShellIntegrationCard
          status={shellIntegration.status}
          onInstall={shellIntegration.install}
          onRefresh={shellIntegration.refresh}
        />
      )}

      {/* Active Preset Status */}
      {activePreset ? (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                <PowerIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {activePreset.name}
                  </h3>
                  <Badge variant="secondary" className="text-[9px] font-mono uppercase bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20">
                    <span className="relative flex size-1.5 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
                    </span>
                    {t("dashboard.active")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <TerminalIcon className="size-3" />
                  {t("dashboard.activePresetDetail", { count: activePreset.envCount })}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("presets")}
              className="h-8 text-xs border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
            >
              {t("dashboard.manageInPresets")}
              <ChevronRightIcon className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-muted/50 flex items-center justify-center">
                <PowerIcon className="size-4 text-muted-foreground/60" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {t("dashboard.activePreset")}
                </h3>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("dashboard.noActivePreset")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("presets")}
              className="h-8 text-xs border-border text-muted-foreground hover:text-foreground"
            >
              {t("dashboard.goToPresets")}
              <ChevronRightIcon className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Expiring Secrets Alert */}
      {expiringFields.length > 0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
              <ClockIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {expiringFields.some((e) => e.isExpired)
                ? "Expired keys detected"
                : "Keys expiring soon"}
            </h3>
            <Badge variant="secondary" className="text-[9px] font-mono bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/20 ml-auto">
              {expiringFields.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {expiringFields.map(({ field, secretName, daysLeft, isExpired }) => (
              <div
                key={field.id}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/50 dark:bg-white/[0.02] hover:bg-amber-100/50 dark:hover:bg-amber-950/10 transition-colors cursor-pointer"
                onClick={() => onSelectTab("secrets")}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`size-2 rounded-full shrink-0 ${isExpired ? "bg-rose-500" : daysLeft <= 1 ? "bg-rose-400" : "bg-amber-400"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {secretName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">·</span>
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {field.label}
                      </span>
                    </div>
                    {field.envName && (
                      <code className="text-[9px] font-mono text-muted-foreground/60">
                        {field.envName}
                      </code>
                    )}
                  </div>
                </div>
                <div className={`text-[10px] font-mono shrink-0 ml-2 ${isExpired ? "text-rose-500 dark:text-rose-400 font-semibold" : "text-amber-600 dark:text-amber-400"}`}>
                  {isExpired ? "Expired" : `${daysLeft}d`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              onClick={() => onSelectTab("presets")}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-md bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                  <LayersIcon className="size-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="font-medium">{t("dashboard.managePresets")}</span>
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
