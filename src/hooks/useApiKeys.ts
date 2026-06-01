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
  // Plaintext lives in a ref so it never appears in React DevTools state
  // snapshots. revealedVersion is a counter that bumps on every mutation
  // so consumers re-render to read the new value.
  const revealedRef = useRef<Record<string, string>>({})
  const [revealedVersion, setRevealedVersion] = useState(0)
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
      // Anchor the 30s auto-hide to the first reveal so a flurry of
      // 👁 clicks cannot push the deadline forward or burn extra
      // backend decrypts.
      if (timersRef.current.has(apiKey.id)) return
      try {
        const value = await revealApiKeyApi(apiKey.id)
        revealedRef.current[apiKey.id] = value
        setRevealedVersion((v) => v + 1)
        show(`Revealed: ${apiKey.name}`, "info")

        const handle = window.setTimeout(() => {
          delete revealedRef.current[apiKey.id]
          timersRef.current.delete(apiKey.id)
          setRevealedVersion((v) => v + 1)
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
