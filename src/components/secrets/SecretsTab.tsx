import { useEffect } from "react"
import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"
import type { UseSecrets } from "@/hooks/useSecrets"
import { useToast } from "@/hooks/useToast"
import { SecretDetails } from "./SecretDetails"
import { SecretForm } from "./SecretForm"
import { SecretList } from "./SecretList"
import type { Secret } from "@/types"

interface SecretsTabProps {
  secrets: UseSecrets
  selectedSecretId: string
  onSelectSecret: (id: string) => void
}

export function SecretsTab({
  secrets,
  selectedSecretId,
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
    onSelectSecret(id)
  }

  return (
    <div className="flex flex-1 min-w-0 min-h-screen overflow-hidden">
      <SecretList
        secrets={secrets.filtered}
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
            editingSecretId={secrets.editingId}
            fieldDrafts={secrets.fieldDrafts}
            onFieldDraftsChange={secrets.setFieldDrafts}
            fieldService={secrets.fieldService}
          />
        ) : selectedSecret ? (
          <SecretDetails
            secret={selectedSecret}
            onEdit={() => secrets.startEdit(selectedSecret)}
            onDelete={() =>
              secrets.remove(selectedSecret.id, selectedSecret.name)
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              {t("secrets.selectSecret") || "Select a secret or create one to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
