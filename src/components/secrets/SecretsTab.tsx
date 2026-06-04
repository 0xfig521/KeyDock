import { useEffect } from "react"
import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"
import type { UseKeys } from "@/hooks/useKeys"
import type { UseSecrets } from "@/hooks/useSecrets"
import { useToast } from "@/hooks/useToast"
import { SecretDetails } from "./SecretDetails"
import { SecretForm } from "./SecretForm"
import { SecretList } from "./SecretList"
import { PresetGrid } from "./PresetGrid"
import type { ActiveWorkspace, PresetDef, Secret } from "@/types"

interface SecretsTabProps {
  secrets: UseSecrets
  keys: UseKeys
  selectedSecretId: string
  selectedWorkspaceId: string
  activeWorkspace: ActiveWorkspace | null
  onSelectSecret: (id: string) => void
}

export function SecretsTab({
  secrets,
  keys,
  selectedSecretId,
  selectedWorkspaceId,
  activeWorkspace,
  onSelectSecret,
}: SecretsTabProps) {
  const { t } = useTranslation()
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
    keys.closeForm()
    onSelectSecret(id)
  }

  async function handlePresetApply(preset: PresetDef) {
    if (
      secrets.secrets.some(
        (s) => s.name.toLowerCase() === preset.name.toLowerCase(),
      )
    ) {
      secrets.startCreate()
      secrets.setForm({
        name: preset.name,
        category: preset.category,
        baseUrl: preset.baseUrl,
        tags: preset.tags,
        description: preset.description ?? "",
        dashboardUrl: "",
        docsUrl: "",
        loginUrl: "",
      })
      keys.setForm({
        name: preset.key.name,
        value: "",
        envName: preset.key.env,
        includeByDefault: true,
        tags: "",
        expiresAt: "",
      })
      show(
        t("toast.serviceExists", { name: preset.name }),
        "info",
      )
      return
    }

    const created = await secrets.createFromPreset(preset)
    if (!created) return
    onSelectSecret(created.id)
    keys.openForm({
      name: preset.key.name,
      envName: preset.key.env,
      includeByDefault: true,
      tags: "",
    })
    show(t("toast.serviceCreated"), "info")
  }

  return (
    <div className="flex flex-1 min-w-0 min-h-screen overflow-hidden">
      <SecretList
        secrets={secrets.filtered}
        keys={keys.keys}
        selectedId={selectedSecretId}
        search={secrets.search}
        loading={secrets.loading}
        onSearchChange={secrets.setSearch}
        onSelect={handleServiceSelect}
        onAdd={() => {
          secrets.startCreate()
        }}
      />

      <div className="flex-1 min-w-0 p-8 overflow-y-auto overflow-x-hidden">
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
            keys={keys}
            selectedWorkspaceId={selectedWorkspaceId}
            activeWorkspace={activeWorkspace}
            onEdit={() => secrets.startEdit(selectedSecret)}
            onDelete={() =>
              secrets.remove(selectedSecret.id, selectedSecret.name)
            }
          />
        ) : (
          <div className="space-y-8">
            <PresetGrid onApply={handlePresetApply} />
          </div>
        )}
      </div>
    </div>
  )
}
