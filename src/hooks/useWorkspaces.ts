import { useCallback, useState } from "react"
import { useToast } from "@/hooks/useToast"
import {
  createWorkspace as createWorkspaceApi,
  deleteWorkspace as deleteWorkspaceApi,
  listWorkspaces,
} from "@/lib/tauri"
import { normalizeWorkspaceName } from "@/constants"
import type { Workspace } from "@/types"

export interface UseWorkspaces {
  workspaces: Workspace[]
  formName: string
  setFormName: (name: string) => void
  submitting: boolean
  loading: boolean
  create: () => Promise<Workspace | null>
  remove: (id: string, name: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useWorkspaces(): UseWorkspaces {
  const { show } = useToast()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [formName, setFormName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const list = await listWorkspaces()
      setWorkspaces(list)
    } catch (e) {
      show(extractMessage(e), "error")
    } finally {
      setLoading(false)
    }
  }, [show])

  // Apply kebab-case normalization on every input.
  const setFormNameNormalized = useCallback((raw: string) => {
    setFormName(normalizeWorkspaceName(raw))
  }, [])

  const create = useCallback(async (): Promise<Workspace | null> => {
    const name = formName.trim()
    if (!name) return null
    if (
      workspaces.some(
        (w) => w.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      show(`A workspace with the name "${name}" already exists.`, "error")
      return null
    }
    try {
      setSubmitting(true)
      const ws = await createWorkspaceApi(name, null)
      show(`Workspace created: ${ws.name}`, "success")
      setFormName("")
      await refresh()
      return ws
    } catch (e) {
      show(extractMessage(e), "error")
      return null
    } finally {
      setSubmitting(false)
    }
  }, [formName, refresh, show, workspaces])

  const remove = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete workspace "${name}"?`)) return
      try {
        await deleteWorkspaceApi(id)
        show(`Deleted workspace: ${name}`, "info")
        await refresh()
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [refresh, show],
  )

  return {
    workspaces,
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
