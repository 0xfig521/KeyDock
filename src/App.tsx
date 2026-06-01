import { useEffect, useState } from "react"
import { LockScreen } from "@/components/layout/LockScreen"
import { Sidebar } from "@/components/layout/Sidebar"
import { ToastView } from "@/components/layout/ToastView"
import { AuditTab } from "@/components/audit/AuditTab"
import { SecretsTab } from "@/components/secrets/SecretsTab"
import { WorkspacesTab } from "@/components/workspaces/WorkspacesTab"
import { useApiKeys } from "@/hooks/useApiKeys"
import { useAudit } from "@/hooks/useAudit"
import { useSecrets } from "@/hooks/useSecrets"
import { useToast } from "@/hooks/useToast"
import { useVault } from "@/hooks/useVault"
import { useWorkspaces } from "@/hooks/useWorkspaces"

type Tab = "secrets" | "workspaces" | "audit"

export function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark")
  }, [])

  const vault = useVault()
  const secrets = useSecrets()
  const apiKeys = useApiKeys()
  const workspaces = useWorkspaces()
  const audit = useAudit()
  const { show } = useToast()

  const [activeTab, setActiveTab] = useState<Tab>("secrets")
  const [selectedSecretId, setSelectedSecretId] = useState("")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("")

  useEffect(() => {
    if (!vault.ready) return
    if (workspaces.workspaces.length === 0) return
    if (selectedWorkspaceId) return
    setSelectedWorkspaceId(workspaces.workspaces[0].id)
  }, [vault.ready, workspaces.workspaces, selectedWorkspaceId])

  useEffect(() => {
    if (!vault.ready) return
    void secrets.refresh()
    void apiKeys.refresh()
    void workspaces.refresh()
    void audit.refresh()
  }, [
    vault.ready,
    secrets.refresh,
    apiKeys.refresh,
    workspaces.refresh,
    audit.refresh,
  ])

  async function handleLock() {
    try {
      await vault.lock()
      apiKeys.clearRevealed()
      setActiveTab("secrets")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }

  function handleTabChange(tab: Tab) {
    if (tab === "secrets") {
      apiKeys.closeForm()
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
    <div className="min-h-screen bg-background text-foreground font-sans flex antialiased">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        secretCount={secrets.secrets.length}
        workspaceCount={workspaces.workspaces.length}
        onLockClick={handleLock}
      />

      <main className="flex-grow min-h-screen bg-zinc-950/40 flex flex-col">
        {activeTab === "secrets" && (
          <SecretsTab
            secrets={secrets}
            apiKeys={apiKeys}
            selectedSecretId={selectedSecretId}
            selectedWorkspaceId={selectedWorkspaceId}
            onSelectSecret={setSelectedSecretId}
          />
        )}
        {activeTab === "workspaces" && (
          <WorkspacesTab
            apiKeys={apiKeys}
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
