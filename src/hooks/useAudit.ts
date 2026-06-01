import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/hooks/useToast"
import { listAuditLogs } from "@/lib/tauri"
import type { AuditLog } from "@/types"

const DEFAULT_LIMIT = 50

export interface UseAudit {
  logs: AuditLog[]
  refresh: (limit?: number) => Promise<void>
}

export function useAudit(): UseAudit {
  const { show } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])

  const refresh = useCallback(
    async (limit: number = DEFAULT_LIMIT) => {
      try {
        const list = await listAuditLogs(limit)
        setLogs(list)
      } catch (e) {
        show(extractMessage(e), "error")
      }
    },
    [show],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  return { logs, refresh }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
