import { useEffect } from "react"
import type { FormEvent } from "react"
import type { UseApiKeys } from "@/hooks/useApiKeys"
import type { UseSecrets } from "@/hooks/useSecrets"
import { useToast } from "@/hooks/useToast"
import { SecretDetails } from "./SecretDetails"
import { SecretForm } from "./SecretForm"
import { SecretList } from "./SecretList"
import { PresetGrid } from "./PresetGrid"
import type { PresetDef, Secret } from "@/types"

interface SecretsTabProps {
  secrets: UseSecrets
  apiKeys: UseApiKeys
  selectedSecretId: string
  selectedWorkspaceId: string
  onSelectSecret: (id: string) => void
}

export function SecretsTab({
  secrets,
  apiKeys,
  selectedSecretId,
  selectedWorkspaceId,
  onSelectSecret,
}: SecretsTabProps) {
  const { show } = useToast()

  useEffect(() => {
    if (secrets.secrets.length === 0) return
    const exists = secrets.secrets.some((s) => s.id === selectedSecretId)
    if (!exists) onSelectSecret(secrets.secrets[0].id)
  }, [secrets.secrets, selectedSecretId, onSelectSecret])

  const selectedSecret: Secret | undefined = secrets.secrets.find(
    (s) => s.id === selectedSecretId,
  )

  async function handleSecretSubmit(event: FormEvent) {
    event.preventDefault()
    const saved = await secrets.save()
    if (saved) onSelectSecret(saved.id)
  }

  function handleServiceSelect(id: string) {
    secrets.cancelForm()
    apiKeys.closeForm()
    onSelectSecret(id)
  }

  function handlePresetApply(preset: PresetDef) {
    secrets.startCreate()
    secrets.setForm({
      name: preset.name,
      category: preset.category,
      baseUrl: preset.baseUrl,
      modelName: preset.modelName,
      tags: preset.tags,
      description: preset.description ?? "",
      dashboardUrl: "",
    })
    apiKeys.setForm({
      name: preset.apiKey.name,
      value: "",
      envName: preset.apiKey.env,
      includeByDefault: true,
      tags: "",
    })
    show(`Preset loaded for ${preset.name}`, "info")
  }

  return (
    <div className="flex flex-1 min-h-screen">
      <SecretList
        secrets={secrets.filtered}
        apiKeys={apiKeys.apiKeys}
        selectedId={selectedSecretId}
        search={secrets.search}
        onSearchChange={secrets.setSearch}
        onSelect={handleServiceSelect}
        onAdd={() => {
          secrets.startCreate()
        }}
      />

      <div className="flex-grow p-8 overflow-y-auto max-w-4xl">
        {secrets.showForm ? (
          <SecretForm
            form={secrets.form}
            onChange={secrets.setForm}
            onSubmit={handleSecretSubmit}
            onCancel={secrets.cancelForm}
            isEditing={Boolean(secrets.editingId)}
            submitting={secrets.submitting}
          />
        ) : selectedSecret ? (
          <SecretDetails
            secret={selectedSecret}
            apiKeys={apiKeys}
            selectedWorkspaceId={selectedWorkspaceId}
            onEdit={() => secrets.startEdit(selectedSecret)}
            onDelete={() =>
              secrets.remove(selectedSecret.id, selectedSecret.name)
            }
          />
        ) : (
          <PresetGrid onApply={handlePresetApply} />
        )}
      </div>
    </div>
  )
}
