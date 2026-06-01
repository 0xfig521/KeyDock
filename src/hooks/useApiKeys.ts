import { useCallback, useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/useToast"
import {
  createApiKey as createApiKeyApi,
  deleteApiKey as deleteApiKeyApi,
  listApiKeys,
  revealApiKey as revealApiKeyApi,
} from "@/lib/tauri"
import { emptyApiKeyForm } from "@/constants"
import type { ApiKey, ApiKeyForm } from "@/types"

const REVEAL_AUTO_HIDE_MS = 30000

export interface UseApiKeys {
  apiKeys: ApiKey[]
  showForm: boolean
  form: ApiKeyForm
  setForm: (form: ApiKeyForm) => void
  submitting: boolean
  openForm: (prefill?: Partial<ApiKeyForm>) => void
  closeForm: () => void
  save: (secretId: string) => Promise<ApiKey | null>
  remove: (id: string, name: string) => Promise<void>
  reveal: (apiKey: ApiKey) => Promise<void>
  getRevealed: (id: string) => string | undefined
  refresh: () => Promise<void>
  clearRevealed: () => void
}

export function useApiKeys(): UseApiKeys {
  const { show } = useToast()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ApiKeyForm>(emptyApiKeyForm)
  const [submitting, setSubmitting] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const timersRef = useRef<Map<string, number>>(new Map())

  const refresh = useCallback(async () => {
    try {
      const list = await listApiKeys(null)
      setApiKeys(list)
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [show])

  const openForm = useCallback((prefill?: Partial<ApiKeyForm>) => {
    setForm({ ...emptyApiKeyForm, ...prefill })
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setForm(emptyApiKeyForm)
  }, [])

  const save = useCallback(
    async (secretId: string): Promise<ApiKey | null> => {
      const trimmedName = form.name.trim()
      if (!trimmedName) {
        show("Key name is required", "error")
        return null
      }
      const dup = apiKeys.some(
        (k) =>
          k.secretId === secretId &&
          k.name.toLowerCase() === trimmedName.toLowerCase(),
      )
      if (dup) {
        show(
          `An API key with the name "${trimmedName}" already exists in this service.`,
          "error",
        )
        return null
      }
      try {
        setSubmitting(true)
        const created = await createApiKeyApi(secretId, {
          name: trimmedName,
          value: form.value,
          envName: form.envName.trim() || null,
          includeByDefault: form.includeByDefault,
          tags: [],
          description: null,
        })
        show(`Added API Key: ${created.name}`, "success")
        setShowForm(false)
        setForm(emptyApiKeyForm)
        await refresh()
        return created
      } catch (e) {
        show(extractMessage(e), "error")
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [apiKeys, form, refresh, show],
  )

  const reveal = useCallback(
    async (apiKey: ApiKey) => {
      try {
        const value = await revealApiKeyApi(apiKey.id)
        setRevealed((prev) => ({ ...prev, [apiKey.id]: value }))
        show(`Revealed: ${apiKey.name}`, "info")

        // Reset any prior timer for this key.
        const prior = timersRef.current.get(apiKey.id)
        if (prior !== undefined) {
          window.clearTimeout(prior)
        }
        const handle = window.setTimeout(() => {
          setRevealed((prev) => {
            if (!(apiKey.id in prev)) return prev
            const next = { ...prev }
            delete next[apiKey.id]
            return next
          })
          timersRef.current.delete(apiKey.id)
        }, REVEAL_AUTO_HIDE_MS)
        timersRef.current.set(apiKey.id, handle)
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [show],
  )

  const remove = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete API Key "${name}"?`)) return
      try {
        await deleteApiKeyApi(id)
        show(`Deleted API Key: ${name}`, "info")
        await refresh()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [refresh, show],
  )

  const getRevealed = useCallback(
    (id: string) => revealed[id],
    [revealed],
  )

  // Wipe all in-memory plaintext — called by App on lock.
  const clearRevealed = useCallback(() => {
    timersRef.current.forEach((handle) => window.clearTimeout(handle))
    timersRef.current.clear()
    setRevealed({})
  }, [])

  // Cleanup all reveal timers on unmount to avoid setState on unmounted.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((handle) => window.clearTimeout(handle))
      timers.clear()
    }
  }, [])

  // Initial load.
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    apiKeys,
    showForm,
    form,
    setForm,
    submitting,
    openForm,
    closeForm,
    save,
    remove,
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
