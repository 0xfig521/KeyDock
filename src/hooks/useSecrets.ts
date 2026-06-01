import { useCallback, useEffect, useMemo, useState } from "react"
import { useToast } from "@/hooks/useToast"
import {
  createSecret,
  deleteSecret as deleteSecretApi,
  listSecrets,
  updateSecret as updateSecretApi,
} from "@/lib/tauri"
import { emptySecretForm, splitTags } from "@/constants"
import type { Secret, SecretCategory, SecretForm, SecretInput } from "@/types"

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
  startCreate: () => void
  startEdit: (secret: Secret) => void
  cancelForm: () => void
  save: () => Promise<Secret | null>
  remove: (id: string, name: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useSecrets(): UseSecrets {
  const { show } = useToast()
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<SecretForm>(emptySecretForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const list = await listSecrets()
      setSecrets(list)
    } catch (e) {
      show(extractMessage(e), "error")
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
  }, [])

  const startEdit = useCallback((secret: Secret) => {
    setEditingId(secret.id)
    setForm({
      name: secret.name,
      category: secret.category,
      baseUrl: secret.baseUrl ?? "",
      modelName: secret.modelName ?? "",
      tags: (secret.tags ?? []).join(", "),
      description: secret.description ?? "",
      dashboardUrl: secret.dashboardUrl ?? "",
    })
    setShowForm(true)
  }, [])

  // FIX: also clear editingId on cancel (was leaking the previous edit state into the next create).
  const cancelForm = useCallback(() => {
    setShowForm(false)
    setEditingId("")
  }, [])

  const buildInput = useCallback(
    (f: SecretForm): SecretInput => ({
      name: f.name.trim(),
      category: f.category as SecretCategory,
      baseUrl: f.baseUrl.trim() || null,
      modelName: f.modelName.trim() || null,
      tags: splitTags(f.tags),
      description: f.description.trim() || null,
      // Note: dashboardUrl/docsUrl/loginUrl/notes are accepted by the Rust struct
      // but the existing UI form only collects dashboardUrl. We still pass it
      // through so the round-trip preserves what the user typed, even though
      // the persisted dashboard_url column is currently unused by the desktop UI.
      dashboardUrl: f.dashboardUrl.trim() || null,
      docsUrl: null,
      loginUrl: null,
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
        show(`Created service group: ${saved.name}`, "success")
      }
      setShowForm(false)
      setEditingId("")
      setForm(emptySecretForm)
      await refresh()
      return saved
    } catch (e) {
      show(extractMessage(e), "error")
      return null
    } finally {
      setSubmitting(false)
    }
  }, [buildInput, editingId, form, refresh, secrets, show])

  const remove = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete service "${name}" and all its keys?`)) return
      try {
        await deleteSecretApi(id)
        show(`Deleted service group: ${name}`, "info")
        await refresh()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [refresh, show],
  )

  // Best-effort initial load if the hook is created after the vault is unlocked.
  useEffect(() => {
    refresh()
  }, [refresh])

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
    startCreate,
    startEdit,
    cancelForm,
    save,
    remove,
    refresh,
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
