import { useCallback, useRef, useState } from "react"
import { clearClipboardIfMatches, copyWithAudit } from "@/lib/tauri"
import { useToast } from "@/hooks/useToast"

const VISUAL_INDICATOR_MS = 4000
const CLIPBOARD_CLEAR_MS = 30000

export interface UseClipboard {
  copiedText: string
  copy: (params: {
    text: string
    label: string
    targetId?: string
    workspaceId?: string | null
    envName?: string | null
  }) => Promise<void>
}

export function useClipboard(): UseClipboard {
  const { show } = useToast()
  const [copiedText, setCopiedText] = useState("")
  const clearVisualRef = useRef<number | null>(null)

  const copy = useCallback<UseClipboard["copy"]>(
    async ({ text, label, targetId, workspaceId, envName }) => {
      try {
        await copyWithAudit({
          text,
          targetId: targetId ?? null,
          workspaceId: workspaceId ?? null,
          envName: envName ?? null,
        })
        setCopiedText(text)
        show(`${label} copied — clears in 30s`, "success")

        // Reset visual indicator after 4s.
        if (clearVisualRef.current !== null) {
          window.clearTimeout(clearVisualRef.current)
        }
        clearVisualRef.current = window.setTimeout(() => {
          setCopiedText("")
          clearVisualRef.current = null
        }, VISUAL_INDICATOR_MS)

        // Conditionally clear the system clipboard after 30s.
        window.setTimeout(async () => {
          try {
            await clearClipboardIfMatches(text)
          } catch {
            // Best-effort: do not surface clipboard errors.
          }
        }, CLIPBOARD_CLEAR_MS)
      } catch (e) {
        const msg =
          typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e)
        show(msg, "error")
      }
    },
    [show],
  )

  return { copiedText, copy }
}
