import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

export type ToastType = "info" | "success" | "error"

export interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastApi {
  toast: Toast | null
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const TOAST_DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<number | null>(null)

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      // Replace any existing toast (and its dismiss timer) with the new one.
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setToast({ id: Date.now(), message, type })
    },
    [],
  )

  useEffect(() => {
    if (!toast) return
    timerRef.current = window.setTimeout(() => {
      setToast(null)
      timerRef.current = null
    }, TOAST_DURATION_MS)
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [toast])

  return (
    <ToastContext.Provider value={{ toast, show }}>
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
