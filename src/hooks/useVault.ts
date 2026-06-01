import { useCallback, useEffect, useState } from "react"
import {
  getVaultStatus,
  lockVault,
  setupMasterPassword,
  unlockMasterPassword,
} from "@/lib/tauri"
import { useToast } from "@/hooks/useToast"

export interface UseVault {
  initialized: boolean
  ready: boolean
  submitting: boolean
  submit: (password: string) => Promise<void>
  lock: () => Promise<void>
  markReady: () => void
}

export function useVault(): UseVault {
  const { show } = useToast()
  const [initialized, setInitialized] = useState(false)
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusChecked, setStatusChecked] = useState(false)

  // Check vault status on mount.
  useEffect(() => {
    let cancelled = false
    getVaultStatus()
      .then((status) => {
        if (!cancelled) setInitialized(status.initialized)
      })
      .catch((e) => {
        show(extractMessage(e), "error")
      })
      .finally(() => {
        if (!cancelled) setStatusChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [show])

  const submit = useCallback(
    async (password: string) => {
      if (submitting) return
      try {
        setSubmitting(true)
        if (initialized) {
          await unlockMasterPassword(password)
          show("Vault unlocked successfully", "success")
        } else {
          await setupMasterPassword(password)
          setInitialized(true)
          show("Vault initialized and unlocked", "success")
        }
        setReady(true)
      } catch (e) {
        show(extractMessage(e), "error")
      } finally {
        setSubmitting(false)
      }
    },
    [initialized, submitting, show],
  )

  const lock = useCallback(async () => {
    try {
      await lockVault()
      setReady(false)
      show("Vault locked", "info")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }, [show])

  // statusChecked is currently unused but kept for future UI gating
  void statusChecked

  return {
    initialized,
    ready,
    submitting,
    submit,
    lock,
    markReady: () => setReady(true),
  }
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
