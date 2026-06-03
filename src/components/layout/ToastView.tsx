import { CheckIcon, AlertCircleIcon, InfoIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useToast } from "@/hooks/useToast"
import { cn } from "@/lib/utils"

/**
 * Floating bottom-right toast stack used in the main layout.
 * The lock screen has its own inline toast styling (uses `toast`, not `toasts`).
 */
export function ToastView() {
  const { t } = useTranslation()
  const { toasts, dismiss } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex items-start gap-2 px-4 py-3 rounded-lg border shadow-xl text-xs max-w-sm animate-in fade-in slide-in-from-bottom-5",
            item.type === "success" &&
              "bg-emerald-100 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300",
            item.type === "error" &&
              "bg-rose-100 dark:bg-rose-950/90 border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-300",
            item.type === "info" &&
              "bg-muted/90 border-border/50 text-foreground",
          )}
        >
          {item.type === "success" && (
            <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-px" />
          )}
          {item.type === "error" && (
            <AlertCircleIcon className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-px" />
          )}
          {item.type === "info" && (
            <InfoIcon className="size-4 text-muted-foreground shrink-0 mt-px" />
          )}
          <span className="flex-1 leading-relaxed">{item.message}</span>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            aria-label={t("common.cancel")}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
