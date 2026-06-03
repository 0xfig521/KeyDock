import { useEffect, useState } from "react"
import { LockScreen } from "@/components/layout/LockScreen"
import { Sidebar } from "@/components/layout/Sidebar"
import { ToastView } from "@/components/layout/ToastView"
import { AuditTab } from "@/components/audit/AuditTab"
import { DashboardTab } from "@/components/dashboard/DashboardTab"
import { SecretsTab } from "@/components/secrets/SecretsTab"
import { SettingsTab } from "@/components/settings/SettingsTab"
import { WorkspacesTab } from "@/components/workspaces/WorkspacesTab"
import { useKeys } from "@/hooks/useKeys"
import { useAudit } from "@/hooks/useAudit"
import { useSecrets } from "@/hooks/useSecrets"
import { useToast } from "@/hooks/useToast"
import { useVault } from "@/hooks/useVault"
import { useWorkspaces } from "@/hooks/useWorkspaces"
import { useTheme } from "@/hooks/useTheme"
import { ensureKeydockBinary, ensureShellHook, getActiveWorkspace } from "@/lib/tauri"
import type { ActiveWorkspace } from "@/types"

type Tab = "dashboard" | "secrets" | "workspaces" | "audit" | "settings"

export function App() {
  useTheme()

  const vault = useVault()
  const secrets = useSecrets()
  const keys = useKeys()
  const workspaces = useWorkspaces()
  const audit = useAudit()
  const { show } = useToast()

  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [selectedSecretId, setSelectedSecretId] = useState("")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("")
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace | null>(null)

  useEffect(() => {
    if (!vault.ready) return
    if (workspaces.workspaces.length === 0) return
    if (selectedWorkspaceId) return
    setSelectedWorkspaceId(workspaces.workspaces[0].id)
  }, [vault.ready, workspaces.workspaces, selectedWorkspaceId])

  // Fetch active workspace on vault ready and set up listener.
  useEffect(() => {
    if (!vault.ready) return
    const fetch = () =>
      getActiveWorkspace()
        .then(setActiveWorkspace)
        .catch(() => setActiveWorkspace(null))
    fetch()
    let unlisten: (() => void) | undefined
    import("@tauri-apps/api/event")
      .then(({ listen }) => listen("active-workspace-changed", fetch))
      .then((fn) => { unlisten = fn })
      .catch(() => {})
    return () => unlisten?.()
  }, [vault.ready])

  // Load lightweight metadata on vault ready.
  // Secrets and workspaces are loaded upfront (sidebar counts).
  // Keys are loaded upfront (now safe — no decryption after P0-1).
  // Audit logs are loaded lazily by AuditTab when the user visits it.
  useEffect(() => {
    if (!vault.ready) return
    void secrets.refresh()
    void keys.refresh()
    void workspaces.refresh()
    // Auto-install shell hook + keydock CLI binary (one-time check per session).
    ensureShellHook().catch(() => {})
    ensureKeydockBinary().catch(() => {})
  }, [
    vault.ready,
    secrets.refresh,
    keys.refresh,
    workspaces.refresh,
  ])

  async function handleLock() {
    try {
      await vault.lock()
      keys.clearRevealed()
      setActiveWorkspace(null)
      setActiveTab("dashboard")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }

  function handleTabChange(tab: Tab) {
    if (tab !== "secrets") {
      keys.closeForm()
    }
    if (tab !== "dashboard") {
      // Clear any leftover export text and revealed keys when leaving the dashboard.
    }
    setActiveTab(tab)
  }

  if (!vault.ready) {
    return (
      <>
        <LockScreen vault={vault} />
        <ToastView />
      </>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground font-sans flex antialiased">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        secretCount={secrets.secrets.length}
        workspaceCount={workspaces.workspaces.length}
        onLockClick={handleLock}
      />

      <main className="flex-1 min-w-0 h-screen overflow-hidden bg-background flex flex-col">
        {activeTab === "dashboard" && (
          <DashboardTab
            secrets={secrets}
            keys={keys}
            workspaces={workspaces}
            audit={audit}
            activeWorkspace={activeWorkspace}
            onSelectTab={setActiveTab}
            onSelectWorkspace={setSelectedWorkspaceId}
          />
        )}
        {activeTab === "secrets" && (
          <SecretsTab
            secrets={secrets}
            keys={keys}
            selectedSecretId={selectedSecretId}
            selectedWorkspaceId={selectedWorkspaceId}
            activeWorkspace={activeWorkspace}
            onSelectSecret={setSelectedSecretId}
          />
        )}
        {activeTab === "workspaces" && (
          <WorkspacesTab
            keys={keys}
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
            selectedSecretId={selectedSecretId}
            vaultReady={vault.ready}
            onSelectWorkspace={setSelectedWorkspaceId}
          />
        )}
        {activeTab === "audit" && (
          <AuditTab logs={audit.logs} onRefresh={audit.refresh} />
        )}
        {activeTab === "settings" && <SettingsTab />}
      </main>

      <ToastView />
    </div>
  )
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
