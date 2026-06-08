import { useCallback, useState } from "react"
import { useToast } from "@/hooks/useToast"
import {
  createPreset as createPresetApi,
  deletePreset as deletePresetApi,
  listPresets,
} from "@/lib/tauri"
import { normalizePresetName } from "@/constants"
import type { Preset } from "@/types"

export interface UsePresets {
  presets: Preset[]
  formName: string
  setFormName: (name: string) => void
  submitting: boolean
  loading: boolean
  create: () => Promise<Preset | null>
  remove: (id: string, name: string) => Promise<void>
  refresh: () => Promise<void>
}

export function usePresets(): UsePresets {
  const { show } = useToast()
  const [presets, setPresets] = useState<Preset[]>([])
  const [formName, setFormName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const list = await listPresets()
      setPresets(list)
    } catch (e) {
      show(extractMessage(e), "error")
    } finally {
      setLoading(false)
    }
  }, [show])

  const setFormNameNormalized = useCallback((raw: string) => {
    setFormName(normalizePresetName(raw))
  }, [])

  const create = useCallback(async (): Promise<Preset | null> => {
    const name = formName.trim()
    if (!name) return null
    if (
      presets.some(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      show(`A preset with the name "${name}" already exists.`, "error")
      return null
    }
    try {
      setSubmitting(true)
      const p = await createPresetApi(name, null)
      show(`Preset created: ${p.name}`, "success")
      setFormName("")
      await refresh()
      return p
    } catch (e) {
      show(extractMessage(e), "error")
      return null
    } finally {
      setSubmitting(false)
    }
  }, [formName, refresh, show, presets])

  const remove = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete preset "${name}"?`)) return
      try {
        await deletePresetApi(id)
        show(`Deleted preset: ${name}`, "info")
        await refresh()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [refresh, show],
  )

  return {
    presets,
    formName,
    setFormName: setFormNameNormalized,
    submitting,
    loading,
    create,
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
