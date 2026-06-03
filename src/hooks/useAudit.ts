import { useCallback, useState } from "react"
import { useToast } from "@/hooks/useToast"
import { listAuditLogs } from "@/lib/tauri"
import type { AuditLog } from "@/types"

export interface UseAudit {
  logs: AuditLog[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useAudit(): UseAudit {
  const { show } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(
    async () => {
      try {
        setLoading(true)
        const list = await listAuditLogs()
        setLogs(list)
      } catch (e) {
        show(extractMessage(e), "error")
      } finally {
        setLoading(false)
      }
    },
    [show],
  )

  return { logs, loading, refresh }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
