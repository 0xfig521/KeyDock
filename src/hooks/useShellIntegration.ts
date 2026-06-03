import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/hooks/useToast"
import {
  getShellIntegrationStatus,
  installShellIntegration as installShellIntegrationApi,
} from "@/lib/tauri"
import type { ShellIntegrationStatus } from "@/types"

export function useShellIntegration() {
  const { show } = useToast()
  const [status, setStatus] = useState<ShellIntegrationStatus | null>(null)

  const refresh = useCallback(() => {
    getShellIntegrationStatus("zsh")
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  const install = useCallback(async () => {
    try {
      const path = await installShellIntegrationApi("zsh")
      setStatus({ shell: "zsh", installed: true, rcPath: path })
      show(`Installed shell integration in ${path}`, "success")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [show])

  // Check status on mount.
  useEffect(() => {
    refresh()
  }, [refresh])

  return { status, install, refresh }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
