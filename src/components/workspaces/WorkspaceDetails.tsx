import { CopyIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useClipboard } from "@/hooks/useClipboard"
import { useVariables } from "@/hooks/useVariables"
import { deleteWorkspace as deleteWorkspaceApi } from "@/lib/tauri"
import type { ApiKey, Workspace, WorkspaceVariable } from "@/types"
import { EnvExport } from "./EnvExport"
import { RunCommandCard } from "./RunCommandCard"
import { VariableList } from "./VariableList"
import { VariableMapper } from "./VariableMapper"

interface WorkspaceDetailsProps {
  workspace: Workspace
  apiKeys: ApiKey[]
  selectedSecretId: string
  variables: ReturnType<typeof useVariables>
}

export function WorkspaceDetails({
  workspace,
  apiKeys,
  selectedSecretId,
  variables,
}: WorkspaceDetailsProps) {
  const { copy } = useClipboard()
  const shellCmd = `keydock run -w ${workspace.name} -- bun run dev`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 pb-4 border-b border-zinc-900">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 font-mono">
            /{workspace.name}
          </h1>
          <p className="text-xs text-zinc-400">
            Compose and map environment variables for this runtime zone.
          </p>
        </div>

        <DeleteWorkspaceButton
          workspaceId={workspace.id}
          workspaceName={workspace.name}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-8">
        {/* Left: variable mappings */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Environment Mapping
              </h3>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedSecretId}
                onClick={() => variables.addDefaultsForSecret(selectedSecretId)}
                className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-400 disabled:opacity-30"
              >
                Add selected service defaults
              </Button>
            </div>

            <VariableMapper
              apiKeys={apiKeys}
              mappingApiKey={variables.mappingApiKey}
              mappingEnv={variables.mappingEnv}
              submitting={variables.submitting}
              onApiKeyChange={variables.setMappingApiKey}
              onEnvChange={variables.setMappingEnv}
              onSubmit={(event) => {
                event.preventDefault()
                variables.map({
                  apiKeyId: variables.mappingApiKey,
                  envName: variables.mappingEnv,
                })
              }}
            />

            <VariableList
              variables={variables.variables}
              onUnbind={(v: WorkspaceVariable) => variables.unmap(v.envName)}
            />
          </div>
        </div>

        {/* Right: run + export */}
        <div className="space-y-6">
          <RunCommandCard
            command={shellCmd}
            onCopy={() =>
              copy({ text: shellCmd, label: "Shell command" })
            }
          />
          <EnvExport
            text={variables.exportedEnv}
            onGenerate={variables.generateEnv}
            onCopy={() =>
              copy({
                text: variables.exportedEnv,
                label: ".env Configuration",
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

function DeleteWorkspaceButton({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string
  workspaceName: string
}) {
  function handleClick() {
    if (!confirm(`Delete workspace "${workspaceName}"?`)) return
    void deleteWorkspaceApi(workspaceId)
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="h-7 text-xs border-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
    >
      <Trash2Icon className="size-3 mr-1.5" />
      Delete Workspace
    </Button>
  )
}
