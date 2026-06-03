import { CopyIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card } from "@/components/ui/card"

interface RunCommandCardProps {
  command: string
  onCopy: () => void
}

export function RunCommandCard({ command, onCopy }: RunCommandCardProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("runCommand.title")}
      </h3>
      <Card className="bg-muted/80 border-border p-4 space-y-3 shadow-sm">
        <span className="text-[10px] font-mono text-muted-foreground uppercase block">
          {t("runCommand.cliCommand")}
        </span>

        <button
          type="button"
          onClick={onCopy}
          className="w-full text-left bg-foreground/10 rounded-md border border-border p-2.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 hover:border-emerald-600/20 dark:hover:border-emerald-500/20 hover:bg-foreground/5 transition-all flex items-center justify-between gap-2 group"
        >
          <span className="truncate block">$ {command}</span>
          <CopyIcon className="size-3 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 transition-colors" />
        </button>

        <p className="text-[10px] text-muted-foreground leading-normal">
          {t("runCommand.description")}
        </p>
      </Card>
    </div>
  )
}
