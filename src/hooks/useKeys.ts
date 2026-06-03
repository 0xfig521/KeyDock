import { useCallback, useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/useToast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  createKey as createKeyApi,
  deleteKey as deleteKeyApi,
  deactivateActiveWorkspace,
  listKeys,
  revealKey as revealKeyApi,
  setWorkspaceVariable as setWorkspaceVariableApi,
  updateKey as updateKeyApi,
} from "@/lib/tauri"
import { emptyKeyForm } from "@/constants"
import type { Key, KeyForm } from "@/types"

const REVEAL_AUTO_HIDE_MS = 30000

export interface UseKeys {
  keys: Key[]
  showForm: boolean
  form: KeyForm
  setForm: (form: KeyForm) => void
  submitting: boolean
  editingId: string
  loading: boolean
  openForm: (prefill?: Partial<KeyForm>) => void
  startEdit: (key: Key) => void
  closeForm: () => void
  save: (secretId: string) => Promise<Key | null>
  remove: (id: string, name: string) => Promise<void>
  activate: (key: Key, workspaceId: string, existingEnvNames: string[]) => Promise<void>
  deactivate: () => Promise<void>
  reveal: (key: Key, workspaceId?: string | null) => Promise<string | undefined>
  getRevealed: (id: string) => string | undefined
  refresh: () => Promise<void>
  clearRevealed: () => void
}

export function useKeys(): UseKeys {
  const { show } = useToast()
  const [keys, setKeys] = useState<Key[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<KeyForm>(emptyKeyForm)
  const [editingId, setEditingId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  // Plaintext lives in a ref so it never appears in React DevTools state
  // snapshots. revealedVersion is a counter that bumps on every mutation
  // so consumers re-render to read the new value.
  const revealedRef = useRef<Record<string, string>>({})
  const [revealedVersion, setRevealedVersion] = useState(0)
  const timersRef = useRef<Map<string, number>>(new Map())

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const list = await listKeys(null)
      setKeys(list)
    } catch (e) {
      show(extractMessage(e), "error")
    } finally {
      setLoading(false)
    }
  }, [show])

  const openForm = useCallback((prefill?: Partial<KeyForm>) => {
    setForm({ ...emptyKeyForm, ...prefill })
    setEditingId("")
    setShowForm(true)
  }, [])

  const startEdit = useCallback((key: Key) => {
    setForm({
      name: key.name,
      value: "",
      envName: key.envName ?? "",
      includeByDefault: key.includeByDefault,
      tags: (key.tags ?? []).join(", "),
    })
    setEditingId(key.id)
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setForm(emptyKeyForm)
    setEditingId("")
  }, [])

  const save = useCallback(
    async (secretId: string): Promise<Key | null> => {
      const trimmedName = form.name.trim()
      if (!trimmedName) {
        show("Key name is required", "error")
        return null
      }
      const dup = keys.some(
        (k) =>
          k.secretId === secretId &&
          k.name.toLowerCase() === trimmedName.toLowerCase() &&
          k.id !== editingId,
      )
      if (dup) {
        show(
          `A key with the name "${trimmedName}" already exists in this service.`,
          "error",
        )
        return null
      }
      try {
        setSubmitting(true)
        const payload = {
          name: trimmedName,
          value: form.value,
          envName: form.envName.trim() || null,
          includeByDefault: form.includeByDefault,
          tags: [],
          description: null,
        }
        if (editingId) {
          const updated = await updateKeyApi(editingId, payload)
          show(`Updated key: ${updated.name}`, "success")
          setShowForm(false)
          setForm(emptyKeyForm)
          setEditingId("")
          await refresh()
          return updated
        }
        const created = await createKeyApi(secretId, payload)
        show(`Added key: ${created.name}`, "success")
        setShowForm(false)
        setForm(emptyKeyForm)
        await refresh()
        return created
      } catch (e) {
        show(extractMessage(e), "error")
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [keys, editingId, form, refresh, show],
  )

  const reveal = useCallback(
    async (key: Key, workspaceId: string | null = null) => {
      if (timersRef.current.has(key.id)) {
        window.clearTimeout(timersRef.current.get(key.id))
        timersRef.current.delete(key.id)
        delete revealedRef.current[key.id]
        setRevealedVersion((v) => v + 1)
        return
      }
      try {
        const value = await revealKeyApi(key.id, workspaceId)
        revealedRef.current[key.id] = value
        setRevealedVersion((v) => v + 1)

        const handle = window.setTimeout(() => {
          delete revealedRef.current[key.id]
          timersRef.current.delete(key.id)
          setRevealedVersion((v) => v + 1)
        }, REVEAL_AUTO_HIDE_MS)
        timersRef.current.set(key.id, handle)

        return value
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [show],
  )

  const confirm_ = useConfirm()

  const remove = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm_({
        title: "Delete Key",
        message: `Delete key "${name}"? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      })
      if (!ok) return
      try {
        await deleteKeyApi(id)
        show(`Deleted key: ${name}`, "info")
        await refresh()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [refresh, show, confirm_],
  )

  const activate = useCallback(
    async (key: Key, workspaceId: string, existingEnvNames: string[]) => {
      if (!key.envName) {
        show("This key has no env name", "error")
        return
      }
      if (!workspaceId) {
        show("No active workspace to add to", "error")
        return
      }
      // Conflict detection: if the env name is already mapped in the
      // active workspace, ask the user whether to overwrite.
      if (existingEnvNames.includes(key.envName)) {
        const ok = await confirm_({
          title: "Variable already mapped",
          message: `The env variable "${key.envName}" is already mapped in this workspace. Overwrite?`,
          confirmLabel: "Overwrite",
          variant: "danger",
        })
        if (!ok) return
      }
      try {
        const result = await setWorkspaceVariableApi(
          workspaceId,
          key.envName,
          key.id,
        )
        show(`Mapped ${result.envName} → ${result.keyName ?? key.name}`, "success")
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [show, confirm_],
  )

  const deactivate = useCallback(async () => {
    try {
      await deactivateActiveWorkspace()
      show("KeyDock environment deactivated", "info")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [show])

  const getRevealed = useCallback(
    (id: string) => revealedRef.current[id],
    // revealedVersion is read inside the closure indirectly via the ref,
    // but listing it as a dep ensures a new function identity after each
    // mutation so React.memo'd consumers re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revealedVersion],
  )

  // Wipe all in-memory plaintext — called by App on lock.
  const clearRevealed = useCallback(() => {
    timersRef.current.forEach((handle) => window.clearTimeout(handle))
    timersRef.current.clear()
    revealedRef.current = {}
    setRevealedVersion((v) => v + 1)
  }, [])

  // Cleanup all reveal timers on unmount to avoid setState on unmounted.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((handle) => window.clearTimeout(handle))
      timers.clear()
    }
  }, [])

  // Initial load is driven by App.tsx when the vault becomes ready.

  return {
    keys,
    showForm,
    form,
    setForm,
    submitting,
    editingId,
    loading,
    openForm,
    startEdit,
    closeForm,
    save,
    remove,
    activate,
    deactivate,
    reveal,
    getRevealed,
    refresh,
    clearRevealed,
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
