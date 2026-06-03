import { useCallback, useEffect, useRef } from "react"
import type { FormEvent } from "react"
import { LayersIcon, PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import type { UseKeys } from "@/hooks/useKeys"
import { useVariables } from "@/hooks/useVariables"
import type { UseWorkspaces } from "@/hooks/useWorkspaces"
import { WorkspaceDetails } from "./WorkspaceDetails"
import { WorkspaceList } from "./WorkspaceList"

interface WorkspacesTabProps {
  keys: UseKeys
  workspaces: UseWorkspaces
  selectedWorkspaceId: string
  selectedSecretId: string
  vaultReady: boolean
  onSelectWorkspace: (id: string) => void
}

export function WorkspacesTab({
  keys,
  workspaces,
  selectedWorkspaceId,
  selectedSecretId,
  vaultReady,
  onSelectWorkspace,
}: WorkspacesTabProps) {
  const { t } = useTranslation()
  const variables = useVariables(selectedWorkspaceId, vaultReady)
  const createInputRef = useRef<HTMLInputElement>(null)
  const focusCreateInput = useCallback(() => {
    createInputRef.current?.focus()
  }, [])

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
    <div className="flex flex-1 min-w-0 min-h-screen overflow-hidden">
      <WorkspaceList
        workspaces={workspaces.workspaces}
        formName={workspaces.formName}
        submitting={workspaces.submitting}
        selectedId={selectedWorkspaceId}
        loading={workspaces.loading}
        onSelect={onSelectWorkspace}
        onFormNameChange={workspaces.setFormName}
        onCreate={handleCreate}
        createInputRef={createInputRef}
        activeWorkspaceId={variables.activeWorkspace?.id ?? null}
      />

      <div className="flex-1 min-w-0 p-8 overflow-y-auto overflow-x-hidden">
        {selected ? (
          <WorkspaceDetails
            workspace={selected}
            keys={keys.keys}
            selectedSecretId={selectedSecretId}
            variables={variables}
          />
        ) : (
          <WorkspacesTabEmpty onCreate={focusCreateInput} />
        )}
      </div>
    </div>
  )
}

interface WorkspacesTabEmptyProps {
  onCreate: () => void
}

function WorkspacesTabEmpty({ onCreate }: WorkspacesTabEmptyProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5 py-10 text-center max-w-sm mx-auto">
      <LayersIcon className="size-10 text-muted-foreground mx-auto" />
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-card-foreground">
          {t("workspaces.workspaceComposer")}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("workspaces.composerDesc")}
        </p>
      </div>
      <Button
        onClick={onCreate}
        size="sm"
        className="bg-card border border-border text-card-foreground hover:bg-accent"
      >
        <PlusIcon className="size-3.5 mr-1.5" />
        {t("workspaces.createFirst")}
      </Button>
    </div>
  )
}
