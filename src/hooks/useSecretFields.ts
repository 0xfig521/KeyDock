import { useCallback, useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/useToast"
import type { SecretField, SecretFieldInput } from "@/types"
import {
  createSecretField as createFieldApi,
  deleteSecretField as deleteFieldApi,
  listSecretFields,
  revealSecretField as revealFieldApi,
  updateSecretField as updateFieldApi,
  reorderSecretFields as reorderFieldsApi,
} from "@/lib/tauri"

const REVEAL_AUTO_HIDE_MS = 30000

export interface UseSecretFields {
  fields: SecretField[]
  loading: boolean
  revealed: Map<string, string>
  refresh: (secretId: string) => Promise<void>
  create: (secretId: string, input: SecretFieldInput) => Promise<SecretField | null>
  update: (fieldId: string, input: SecretFieldInput) => Promise<SecretField | null>
  remove: (fieldId: string, fieldLabel: string) => Promise<void>
  reveal: (fieldId: string) => Promise<string | undefined>
  getRevealed: (fieldId: string) => string | undefined
  reorder: (secretId: string, fieldIds: string[]) => Promise<void>
  clearRevealed: () => void
}

export function useSecretFields(): UseSecretFields {
  const { show } = useToast()
  const [fields, setFields] = useState<SecretField[]>([])
  const [loading, setLoading] = useState(true)
  const revealedRef = useRef<Record<string, string>>({})
  const [revealedVersion, setRevealedVersion] = useState(0)
  const timersRef = useRef<Map<string, number>>(new Map())

  const refresh = useCallback(
    async (secretId: string) => {
      if (!secretId) return
      try {
        setLoading(true)
        const list = await listSecretFields(secretId)
        setFields(list)
      } catch (e) {
        show(extractMessage(e), "error")
      } finally {
        setLoading(false)
      }
    },
    [show],
  )

  const create = useCallback(
    async (secretId: string, input: SecretFieldInput): Promise<SecretField | null> => {
      try {
        const created = await createFieldApi(secretId, input)
        show(`Added field: ${created.label}`, "success")
        setFields((prev) => [...prev, created])
        return created
      } catch (e) {
        show(extractMessage(e), "error")
        return null
      }
    },
    [show],
  )

  const update = useCallback(
    async (fieldId: string, input: SecretFieldInput): Promise<SecretField | null> => {
      try {
        const updated = await updateFieldApi(fieldId, input)
        show(`Updated field: ${updated.label}`, "success")
        setFields((prev) => prev.map((f) => (f.id === fieldId ? updated : f)))
        return updated
      } catch (e) {
        show(extractMessage(e), "error")
        return null
      }
    },
    [show],
  )

  const reveal = useCallback(
    async (fieldId: string) => {
      if (timersRef.current.has(fieldId)) {
        window.clearTimeout(timersRef.current.get(fieldId))
        timersRef.current.delete(fieldId)
        delete revealedRef.current[fieldId]
        setRevealedVersion((v) => v + 1)
        return
      }
      try {
        const value = await revealFieldApi(fieldId)
        revealedRef.current[fieldId] = value
        setRevealedVersion((v) => v + 1)

        const handle = window.setTimeout(() => {
          delete revealedRef.current[fieldId]
          timersRef.current.delete(fieldId)
          setRevealedVersion((v) => v + 1)
        }, REVEAL_AUTO_HIDE_MS)
        timersRef.current.set(fieldId, handle)

        return value
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [show],
  )

  const remove = useCallback(
    async (fieldId: string, fieldLabel: string) => {
      try {
        await deleteFieldApi(fieldId)
        show(`Deleted field: ${fieldLabel}`, "info")
        setFields((prev) => prev.filter((f) => f.id !== fieldId))
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [show],
  )

  const reorder = useCallback(
    async (secretId: string, fieldIds: string[]) => {
      try {
        const reordered = await reorderFieldsApi(secretId, fieldIds)
        setFields(reordered)
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [show],
  )

  const getRevealed = useCallback(
    (fieldId: string) => revealedRef.current[fieldId],
    [revealedVersion],
  )

  const clearRevealed = useCallback(() => {
    timersRef.current.forEach((handle) => window.clearTimeout(handle))
    timersRef.current.clear()
    revealedRef.current = {}
    setRevealedVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((handle) => window.clearTimeout(handle))
      timers.clear()
    }
  }, [])

  const revealed = new Map(Object.entries(revealedRef.current))

  return {
    fields,
    loading,
    revealed,
    refresh,
    create,
    update,
    remove,
    reveal,
    getRevealed,
    reorder,
    clearRevealed,
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
