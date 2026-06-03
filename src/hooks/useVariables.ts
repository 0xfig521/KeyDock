import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/hooks/useToast"
import {
  addSecretDefaultKeysToWorkspace as addDefaultsApi,
  activateWorkspace as activateWorkspaceApi,
  deleteWorkspaceVariable as deleteVariableApi,
  deactivateActiveWorkspace as deactivateActiveWorkspaceApi,
  exportEnv as exportEnvApi,
  getActiveWorkspace,
  listWorkspaceVariables,
  setWorkspaceVariable as setVariableApi,
} from "@/lib/tauri"
import { isValidEnvName } from "@/lib/env"
import type { ActiveWorkspace, WorkspaceVariable } from "@/types"

export interface UseVariables {
  variables: WorkspaceVariable[]
  mappingKey: string
  setMappingKey: (id: string) => void
  mappingEnv: string
  setMappingEnv: (env: string) => void
  submitting: boolean
  exportedEnv: string
  activeWorkspace: ActiveWorkspace | null
  map: (params: {
    keyId: string
    envName: string
  }) => Promise<WorkspaceVariable | null>
  unmap: (envName: string) => Promise<void>
  addDefaultsForSecret: (secretId: string) => Promise<void>
  generateEnv: () => Promise<void>
  activate: () => Promise<void>
  deactivate: () => Promise<void>
  refresh: () => Promise<void>
  clearExport: () => void
}

export function useVariables(
  selectedWorkspace: string,
  vaultReady: boolean,
): UseVariables {
  const { show } = useToast()
  const [variables, setVariables] = useState<WorkspaceVariable[]>([])
  const [mappingKey, setMappingKey] = useState("")
  const [mappingEnv, setMappingEnv] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [exportedEnv, setExportedEnv] = useState("")
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace | null>(null)

  const refresh = useCallback(async () => {
    if (!selectedWorkspace) {
      setVariables([])
      return
    }
    try {
      const list = await listWorkspaceVariables(selectedWorkspace)
      setVariables(list)
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [selectedWorkspace, show])

  // Auto-refresh when the selected workspace changes.
  useEffect(() => {
    if (!vaultReady || !selectedWorkspace) {
      setVariables([])
      return
    }
    refresh()
  }, [selectedWorkspace, vaultReady, refresh])

  const refreshActiveWorkspace = useCallback(() => {
    getActiveWorkspace()
      .then(setActiveWorkspace)
      .catch(() => setActiveWorkspace(null))
  }, [])

  // Sync active workspace with CLI — listen for file-change events from backend.
  useEffect(() => {
    refreshActiveWorkspace()
    let unlisten: (() => void) | undefined
    import("@tauri-apps/api/event")
      .then(({ listen }) => listen("active-workspace-changed", refreshActiveWorkspace))
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {})
    return () => unlisten?.()
  }, [refreshActiveWorkspace])

  const map = useCallback<UseVariables["map"]>(
    async ({ keyId, envName }) => {
      if (!selectedWorkspace || !keyId) return null
      const finalEnv = envName.trim()
      if (!isValidEnvName(finalEnv)) {
        show(`Invalid env name: "${finalEnv}"`, "error")
        return null
      }
      try {
        setSubmitting(true)
        const v = await setVariableApi(selectedWorkspace, finalEnv, keyId)
        show("Variable mapped", "success")
        setMappingKey("")
        setMappingEnv("")
        await refresh()
        return v
      } catch (e) {
        show(extractMessage(e), "error")
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [refresh, selectedWorkspace, show],
  )

  const unmap = useCallback(
    async (envName: string) => {
      if (!selectedWorkspace) return
      try {
        await deleteVariableApi(selectedWorkspace, envName)
        show(`Unmapped ${envName}`, "info")
        await refresh()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [refresh, selectedWorkspace, show],
  )

  const addDefaultsForSecret = useCallback(
    async (secretId: string) => {
      if (!selectedWorkspace) return
      try {
        const mapped = await addDefaultsApi(selectedWorkspace, secretId)
        show(`Added ${mapped.length} keys to workspace`, "success")
        await refresh()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [refresh, selectedWorkspace, show],
  )

  const generateEnv = useCallback(async () => {
    if (!selectedWorkspace) return
    try {
      const text = await exportEnvApi(selectedWorkspace)
      setExportedEnv(text)
      show("Environment exported", "success")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [selectedWorkspace, show])

  const activate = useCallback(async () => {
    if (!selectedWorkspace) return
    try {
      const active = await activateWorkspaceApi(selectedWorkspace)
      setActiveWorkspace(active)
      show(`Activated ${active.name}. New shells will load ${active.envCount} env vars.`, "success")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [selectedWorkspace, show])

  const deactivate = useCallback(async () => {
    try {
      await deactivateActiveWorkspaceApi()
      setActiveWorkspace(null)
      show("KeyDock environment deactivated", "info")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [show])

  // Wipe generated .env text — called by App on lock.
  const clearExport = useCallback(() => {
    setExportedEnv("")
  }, [])

  return {
    variables,
    mappingKey,
    setMappingKey,
    mappingEnv,
    setMappingEnv,
    submitting,
    exportedEnv,
    activeWorkspace,
    map,
    unmap,
    addDefaultsForSecret,
    generateEnv,
    activate,
    deactivate,
    refresh,
    clearExport,
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
