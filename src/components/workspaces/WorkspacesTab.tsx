import { useEffect } from "react"
import type { FormEvent } from "react"
import { LayersIcon } from "lucide-react"
import type { UseApiKeys } from "@/hooks/useApiKeys"
import { useVariables } from "@/hooks/useVariables"
import type { UseWorkspaces } from "@/hooks/useWorkspaces"
import { WorkspaceDetails } from "./WorkspaceDetails"
import { WorkspaceList } from "./WorkspaceList"

interface WorkspacesTabProps {
  apiKeys: UseApiKeys
  workspaces: UseWorkspaces
  selectedWorkspaceId: string
  selectedSecretId: string
  vaultReady: boolean
  onSelectWorkspace: (id: string) => void
}

export function WorkspacesTab({
  apiKeys,
  workspaces,
  selectedWorkspaceId,
  selectedSecretId,
  vaultReady,
  onSelectWorkspace,
}: WorkspacesTabProps) {
  const variables = useVariables(selectedWorkspaceId, vaultReady)

  useEffect(() => {
    if (!vaultReady) return
    if (workspaces.workspaces.length === 0) return
    const exists = workspaces.workspaces.some(
      (w) => w.id === selectedWorkspaceId,
    )
    if (!exists) onSelectWorkspace(workspaces.workspaces[0].id)
  }, [
    vaultReady,
    workspaces.workspaces,
    selectedWorkspaceId,
    onSelectWorkspace,
  ])

  const selected = workspaces.workspaces.find(
    (w) => w.id === selectedWorkspaceId,
  )

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    const created = await workspaces.create()
    if (created) onSelectWorkspace(created.id)
  }

  return (
    <div className="flex flex-1 min-h-screen">
      <WorkspaceList
        workspaces={workspaces.workspaces}
        formName={workspaces.formName}
        submitting={workspaces.submitting}
        selectedId={selectedWorkspaceId}
        onSelect={onSelectWorkspace}
        onFormNameChange={workspaces.setFormName}
        onCreate={handleCreate}
      />

      <div className="flex-grow p-8 overflow-y-auto max-w-5xl">
        {selected ? (
          <WorkspaceDetails
            workspace={selected}
            apiKeys={apiKeys.apiKeys}
            selectedSecretId={selectedSecretId}
            variables={variables}
          />
        ) : (
          <WorkspacesTabEmpty />
        )}
      </div>
    </div>
  )
}

function WorkspacesTabEmpty() {
  return (
    <div className="space-y-4 py-8 text-center max-w-sm mx-auto">
      <LayersIcon className="size-10 text-zinc-700 mx-auto" />
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-300">
          Workspace Environment Composer
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Select or create a workspace zone in the sidebar panel to start
          mapping variables.
        </p>
      </div>
    </div>
  )
}
