import { CheckIcon, AlertCircleIcon } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { cn } from "@/lib/utils"

/**
 * Floating bottom-right toast used in the main layout.
 * The lock screen has its own inline toast styling.
 */
export function ToastView() {
  const { toast } = useToast()
  if (!toast) return null

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-xl text-xs max-w-sm animate-in fade-in slide-in-from-bottom-5",
        toast.type === "success" &&
          "bg-emerald-950/90 border-emerald-500/30 text-emerald-300",
        toast.type === "error" &&
          "bg-rose-950/90 border-rose-500/30 text-rose-300",
        toast.type === "info" && "bg-zinc-900/90 border-zinc-700/50 text-zinc-300",
      )}
    >
      {toast.type === "success" && (
        <CheckIcon className="size-4 text-emerald-400 shrink-0" />
      )}
      {toast.type === "error" && (
        <AlertCircleIcon className="size-4 text-rose-400 shrink-0" />
      )}
      <span>{toast.message}</span>
    </div>
  )
}
