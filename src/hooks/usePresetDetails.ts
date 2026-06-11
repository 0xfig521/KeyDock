import { useCallback, useEffect, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { useToast } from "@/hooks/useToast"
import type { PresetEntry, ActivePreset } from "@/types"
import {
  addPresetEntry as addEntryApi,
  removePresetEntry as removeEntryApi,
  updatePresetEntryEnvName as updateEntryEnvNameApi,
  listPresetEntries,
  activatePreset as activatePresetApi,
  getActivePreset,
  deactivateActivePreset,
  previewPreset as previewPresetApi,
} from "@/lib/tauri"

export interface UsePresetDetails {
  entries: PresetEntry[]
  activePreset: ActivePreset | null
  loading: boolean
  activating: boolean
  refresh: (presetId: string) => Promise<void>
  addEntry: (presetId: string, fieldId: string, envName?: string | null) => Promise<PresetEntry | null>
  updateEntryEnvName: (presetId: string, oldEnvName: string, newEnvName: string) => Promise<PresetEntry | null>
  removeEntry: (presetId: string, envName: string) => Promise<void>
  activate: (presetId: string) => Promise<void>
  deactivate: () => Promise<void>
  preview: (presetId: string) => Promise<string[]>
}

export function usePresetDetails(): UsePresetDetails {
  const { show } = useToast()
  const [entries, setEntries] = useState<PresetEntry[]>([])
  const [activePreset, setActivePreset] = useState<ActivePreset | null>(null)
  const [loading, setLoading] = useState(false)
  const [activating, setActivating] = useState(false)

  const refreshActive = useCallback(async () => {
    try {
      const active = await getActivePreset()
      setActivePreset(active)
    } catch {
      // inactive vault or no active preset — fine
    }
  }, [])

  const refresh = useCallback(
    async (presetId: string) => {
      if (!presetId) return
      try {
        setLoading(true)
        const [list, _] = await Promise.all([
          listPresetEntries(presetId),
          refreshActive(),
        ])
        setEntries(list)
      } catch (e) {
        show(extractMessage(e), "error")
      } finally {
        setLoading(false)
      }
    },
    [show, refreshActive],
  )

  const addEntry = useCallback(
    async (presetId: string, fieldId: string, envName?: string | null): Promise<PresetEntry | null> => {
      try {
        const entry = await addEntryApi(presetId, fieldId, envName)
        show(`Mapped env var: ${entry.envName}`, "success")
        setEntries((prev) => {
          const idx = prev.findIndex((e) => e.envName === entry.envName)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = entry
            return next
          }
          return [...prev, entry]
        })
        await refreshActive()
        return entry
      } catch (e) {
        show(extractMessage(e), "error")
        return null
      }
    },
    [show, refreshActive],
  )

  const updateEntryEnvName = useCallback(
    async (presetId: string, oldEnvName: string, newEnvName: string): Promise<PresetEntry | null> => {
      try {
        const entry = await updateEntryEnvNameApi(presetId, oldEnvName, newEnvName)
        show(`Env var renamed: ${oldEnvName} → ${entry.envName}`, "success")
        setEntries((prev) =>
          prev.map((e) => (e.envName === oldEnvName ? entry : e)),
        )
        await refreshActive()
        return entry
      } catch (e) {
        show(extractMessage(e), "error")
        return null
      }
    },
    [show, refreshActive],
  )

  const removeEntry = useCallback(
    async (presetId: string, envName: string) => {
      try {
        await removeEntryApi(presetId, envName)
        show(`Removed env var: ${envName}`, "info")
        setEntries((prev) => prev.filter((e) => e.envName !== envName))
        await refreshActive()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [show, refreshActive],
  )

  const activate = useCallback(
    async (presetId: string) => {
      try {
        setActivating(true)
        const active = await activatePresetApi(presetId)
        setActivePreset(active)
        show(`Activated preset: ${active.name} (${active.envCount} vars)`, "success")
      } catch (e) {
        show(extractMessage(e), "error")
      } finally {
        setActivating(false)
      }
    },
    [show],
  )

  const deactivate = useCallback(async () => {
    try {
      setActivating(true)
      await deactivateActivePreset()
      setActivePreset(null)
      show("Deactivated preset", "info")
    } catch (e) {
      show(extractMessage(e), "error")
    } finally {
      setActivating(false)
    }
  }, [show])

  const preview = useCallback(
    async (presetId: string): Promise<string[]> => {
      try {
        return await previewPresetApi(presetId)
      } catch (e) {
        show(extractMessage(e), "error")
        return []
      }
    },
    [show],
  )

  // Refresh active preset on mount
  useEffect(() => {
    void refreshActive()
  }, [refreshActive])

  useEffect(() => {
    const unlisten = listen("active-preset-changed", () => {
      void refreshActive()
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [refreshActive])

  return {
    entries,
    activePreset,
    loading,
    activating,
    refresh,
    addEntry,
    updateEntryEnvName,
    removeEntry,
    activate,
    deactivate,
    preview,
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
