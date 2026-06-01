import { CopyIcon } from "lucide-react"
import { Card } from "@/components/ui/card"

interface RunCommandCardProps {
  command: string
  onCopy: () => void
}

export function RunCommandCard({ command, onCopy }: RunCommandCardProps) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Terminal Shell Execution
      </h3>
      <Card className="bg-zinc-950/60 border-zinc-900 p-4 space-y-3 shadow-sm">
        <span className="text-[10px] font-mono text-zinc-500 uppercase block">
          Terminal Inject Command
        </span>

        <button
          type="button"
          onClick={onCopy}
          className="w-full text-left bg-black/80 rounded-md border border-zinc-900 p-2.5 font-mono text-[11px] text-emerald-400 hover:border-emerald-500/20 hover:bg-black/90 transition-all flex items-center justify-between gap-2 group"
        >
          <span className="truncate block">$ {command}</span>
          <CopyIcon className="size-3 text-zinc-500 group-hover:text-emerald-400 shrink-0 transition-colors" />
        </button>

        <p className="text-[10px] text-zinc-500 leading-normal">
          Runs your local development pipelines without hardcoding secrets to
          file scripts. The database injects variables straight to the
          processes environment.
        </p>
      </Card>
    </div>
  )
}
