import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { AlertTriangleIcon, InfoIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "danger"
}

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface ConfirmApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmApi | null>(null)

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useConfirm(): ConfirmApi["confirm"] {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return ctx.confirm
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const open = pending !== null

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ options, resolve })
    })
  }, [])

  const resolve = useCallback(
    (value: boolean) => {
      if (!pending) return
      pending.resolve(value)
      setPending(null)
    },
    [pending],
  )

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") resolve(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, resolve])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <ConfirmDialogContent options={pending.options} onResolve={resolve} />
      )}
    </ConfirmContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*  Dialog content (portalled)                                                */
/* -------------------------------------------------------------------------- */

function ConfirmDialogContent({
  options,
  onResolve,
}: {
  options: ConfirmOptions
  onResolve: (value: boolean) => void
}) {
  const { t } = useTranslation()
  const overlayRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onResolve(false)
  }

  const {
    title,
    message,
    confirmLabel = t("common.confirm"),
    cancelLabel = t("common.cancel"),
    variant = "default",
  } = options

  const isDanger = variant === "danger"
  const Icon = isDanger ? AlertTriangleIcon : InfoIcon

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/60 backdrop-blur-sm",
        "animate-in fade-in duration-200",
      )}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          "w-full max-w-sm rounded-xl border shadow-2xl",
          "bg-card border-border",
          "animate-in fade-in slide-in-from-top-3 zoom-in-50 duration-200",
        )}
      >
        <div className="flex items-start gap-3 p-5 pb-0">
          <div
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
              isDanger
                ? "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                : "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onResolve(false)}
            className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={isDanger ? "ghost" : "default"}
            size="sm"
            onClick={() => onResolve(true)}
            className={cn(
              "h-8 text-xs",
              isDanger
                ? "text-rose-600 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/20"
                : "bg-emerald-600 hover:bg-emerald-500 text-white",
            )}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export { ConfirmDialogContent as ConfirmDialog }
