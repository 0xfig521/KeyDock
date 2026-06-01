import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/hooks/useToast"
import {
  addSecretDefaultApiKeysToWorkspace as addDefaultsApi,
  deleteWorkspaceVariable as deleteVariableApi,
  exportEnv as exportEnvApi,
  listWorkspaceVariables,
  setWorkspaceVariable as setVariableApi,
} from "@/lib/tauri"
import { isValidEnvName } from "@/lib/env"
import type { WorkspaceVariable } from "@/types"

export interface UseVariables {
  variables: WorkspaceVariable[]
  mappingApiKey: string
  setMappingApiKey: (id: string) => void
  mappingEnv: string
  setMappingEnv: (env: string) => void
  submitting: boolean
  exportedEnv: string
  map: (params: {
    apiKeyId: string
    envName: string
  }) => Promise<WorkspaceVariable | null>
  unmap: (envName: string) => Promise<void>
  addDefaultsForSecret: (secretId: string) => Promise<void>
  generateEnv: () => Promise<void>
  refresh: () => Promise<void>
  clearExport: () => void
}

export function useVariables(
  selectedWorkspace: string,
  vaultReady: boolean,
): UseVariables {
  const { show } = useToast()
  const [variables, setVariables] = useState<WorkspaceVariable[]>([])
  const [mappingApiKey, setMappingApiKey] = useState("")
  const [mappingEnv, setMappingEnv] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [exportedEnv, setExportedEnv] = useState("")

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

  const map = useCallback<UseVariables["map"]>(
    async ({ apiKeyId, envName }) => {
      if (!selectedWorkspace || !apiKeyId) return null
      const finalEnv = envName.trim()
      if (!isValidEnvName(finalEnv)) {
        show(`Invalid env name: "${finalEnv}"`, "error")
        return null
      }
      try {
        setSubmitting(true)
        const v = await setVariableApi(selectedWorkspace, finalEnv, apiKeyId)
        show("Key mapped to workspace", "success")
        setMappingApiKey("")
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
        show(`Removed mapping for: ${envName}`, "info")
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
        show(`Mapped ${mapped.length} default keys to workspace`, "success")
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
      show("Workspace environment generated", "success")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [selectedWorkspace, show])

  // Wipe generated .env text — called by App on lock.
  const clearExport = useCallback(() => {
    setExportedEnv("")
  }, [])

  return {
    variables,
    mappingApiKey,
    setMappingApiKey,
    mappingEnv,
    setMappingEnv,
    submitting,
    exportedEnv,
    map,
    unmap,
    addDefaultsForSecret,
    generateEnv,
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
