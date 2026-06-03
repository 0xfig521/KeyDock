import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

export type ToastType = "info" | "success" | "error"

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastApi {
  /** Latest toast (for backward compat with LockScreen inline rendering). */
  toast: Toast | null
  /** All currently visible toasts. */
  toasts: Toast[]
  show: (message: string, type?: ToastType, durationMs?: number) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const MAX_TOASTS = 5
const DEFAULT_DURATION_MS = 5000

let idCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerMap = useRef<Map<string, number>>(new Map())

  const clearTimer = useCallback((id: string) => {
    const existing = timerMap.current.get(id)
    if (existing !== undefined) {
      window.clearTimeout(existing)
      timerMap.current.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id)
      setToasts((prev) => prev.filter((t) => t.id !== id))
    },
    [clearTimer],
  )

  const show = useCallback(
    (message: string, type: ToastType = "info", durationMs?: number) => {
      const id = `${Date.now()}-${++idCounter}`
      const duration = durationMs ?? DEFAULT_DURATION_MS

      setToasts((prev) => {
        const next = [...prev, { id, message, type }]
        // Enforce max count: remove oldest (index 0) when exceeding.
        while (next.length > MAX_TOASTS) {
          const removed = next.shift()!
          // Clean up the timer for the removed toast.
          const timer = timerMap.current.get(removed.id)
          if (timer !== undefined) {
            window.clearTimeout(timer)
            timerMap.current.delete(removed.id)
          }
        }
        return next
      })

      // Schedule auto-dismiss.
      const timer = window.setTimeout(() => {
        dismiss(id)
      }, duration)
      timerMap.current.set(id, timer)
    },
    [dismiss],
  )

  // Clean up all timers on unmount.
  useEffect(() => {
    return () => {
      for (const timer of timerMap.current.values()) {
        window.clearTimeout(timer)
      }
      timerMap.current.clear()
    }
  }, [])

  // Derived single-toast for backward compat (LockScreen uses `toast`).
  const toast = useMemo(
    (): Toast | null => (toasts.length > 0 ? toasts[toasts.length - 1] : null),
    [toasts],
  )

  return (
    <ToastContext.Provider value={{ toast, toasts, show, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return ctx
}
