import { useCallback, useMemo, useState } from "react"
import { useToast } from "@/hooks/useToast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useSecretFields, type UseSecretFields } from "@/hooks/useSecretFields"
import {
  createSecret,
  createSecretField as createFieldApi,
  deleteSecret as deleteSecretApi,
  listSecrets,
  updateSecret as updateSecretApi,
} from "@/lib/tauri"
import { createSecretFieldDrafts, emptySecretForm, splitTags } from "@/constants"
import type { Secret, SecretCategory, SecretFieldDraft, SecretForm, SecretInput } from "@/types"

function isSecretNameConflict(message: string): boolean {
  return message.includes("UNIQUE constraint failed: secrets.name")
}

export interface UseSecrets {
  secrets: Secret[]
  filtered: Secret[]
  search: string
  setSearch: (q: string) => void
  form: SecretForm
  setForm: (form: SecretForm) => void
  showForm: boolean
  editingId: string
  submitting: boolean
  loading: boolean
  startCreate: () => void
  startEdit: (secret: Secret) => void
  cancelForm: () => void
  save: () => Promise<Secret | null>
  remove: (id: string, name: string) => Promise<void>
  refresh: () => Promise<void>
  fieldDrafts: SecretFieldDraft[]
  setFieldDrafts: (drafts: SecretFieldDraft[]) => void
  fieldService: UseSecretFields
}

export function useSecrets(): UseSecrets {
  const { show } = useToast()
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<SecretForm>(emptySecretForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fieldDrafts, setFieldDrafts] = useState<SecretFieldDraft[]>([])
  const fieldService = useSecretFields()

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const list = await listSecrets()
      setSecrets(list)
    } catch (e) {
      show(extractMessage(e), "error")
    } finally {
      setLoading(false)
    }
  }, [show])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return secrets
    return secrets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    )
  }, [secrets, search])

  const startCreate = useCallback(() => {
    setForm(emptySecretForm)
    setEditingId("")
    setShowForm(true)
    setFieldDrafts(createSecretFieldDrafts("aI"))
  }, [])

  const startEdit = useCallback((secret: Secret) => {
    setEditingId(secret.id)
    setForm({
      name: secret.name,
      category: secret.category,
      tags: (secret.tags ?? []).join(", "),
    })
    setFieldDrafts([])
    setShowForm(true)
    void fieldService.refresh(secret.id)
  }, [fieldService])

  // FIX: also clear editingId on cancel (was leaking the previous edit state into the next create).
  const cancelForm = useCallback(() => {
    setShowForm(false)
    setEditingId("")
    setFieldDrafts([])
  }, [])

  const buildInput = useCallback(
    (f: SecretForm): SecretInput => ({
      name: f.name.trim(),
      category: f.category as SecretCategory,
      tags: splitTags(f.tags),
      notes: null,
    }),
    [],
  )

  const save = useCallback(async (): Promise<Secret | null> => {
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      show("Service name is required", "error")
      return null
    }

    // Frontend duplicate-name guard (server enforces too via UNIQUE constraint).
    const dup = secrets.some(
      (s) =>
        s.name.toLowerCase() === trimmedName.toLowerCase() &&
        s.id !== editingId,
    )
    if (dup) {
      show(
        editingId
          ? `Another service group with the name "${trimmedName}" already exists.`
          : `A service group with the name "${trimmedName}" already exists.`,
        "error",
      )
      return null
    }

    try {
      setSubmitting(true)
      const input = buildInput(form)
      let saved: Secret
      if (editingId) {
        saved = await updateSecretApi(editingId, input)
        show(`Updated service group: ${saved.name}`, "success")
      } else {
        saved = await createSecret(input)
        for (const draft of fieldDrafts) {
          const label = draft.label.trim()
          if (!label) continue
          const value = draft.value.trim()
          try {
            await createFieldApi(saved.id, {
              label,
              fieldType: draft.fieldType,
              value,
              sensitive: draft.sensitive,
              envName: draft.envName.trim() || null,
              purpose: draft.purpose ?? null,
              section: draft.section ?? null,
              sortOrder: null,
              enabled: true,
              expiresAt: null,
            })
          } catch {
            // Field creation errors shouldn't block the secret creation
          }
        }
        show(`Created service group: ${saved.name}`, "success")
      }
      setShowForm(false)
      setEditingId("")
      setForm(emptySecretForm)
      setFieldDrafts([])
      await refresh()
      return saved
    } catch (e) {
      const message = extractMessage(e)
      if (isSecretNameConflict(message)) {
        const name = form.name.trim()
        show(
          editingId
            ? `Another service group with the name "${name}" already exists.`
            : `A service group with the name "${name}" already exists.`,
          "error",
        )
        void refresh()
      } else {
        show(message, "error")
      }
      return null
      } finally {
        setSubmitting(false)
      }
    },
    [buildInput, editingId, fieldDrafts, form, refresh, secrets, show],
  )

  const confirm_ = useConfirm()

  const remove = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm_({
        title: "Delete Service",
        message: `Delete service "${name}" and all its keys? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      })
      if (!ok) return
      try {
        await deleteSecretApi(id)
        show(`Deleted service group: ${name}`, "info")
        await refresh()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [refresh, show, confirm_],
  )

  // Initial load is driven by App.tsx when the vault becomes ready.
  // We intentionally do NOT call refresh() here to avoid duplicating
  // the App-level fetch on mount.

  return {
    secrets,
    filtered,
    search,
    setSearch,
    form,
    setForm,
    showForm,
    editingId,
    submitting,
    loading,
    startCreate,
    startEdit,
    cancelForm,
    save,
    remove,
    refresh,
    fieldDrafts,
    setFieldDrafts,
    fieldService,
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
