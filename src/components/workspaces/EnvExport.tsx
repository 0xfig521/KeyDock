import { RefreshCcwIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface EnvExportProps {
  text: string
  onGenerate: () => void
  onClear: () => void
  onCopy: () => void
}

export function EnvExport({ text, onGenerate, onClear, onCopy }: EnvExportProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("envExport.title")}
        </h3>
        {text ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerate}
              className="h-7 text-xs border-border text-muted-foreground hover:text-foreground"
            >
              <RefreshCcwIcon className="size-3 mr-1.5" />
              {t("envExport.refresh")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 text-xs text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20"
            >
              <Trash2Icon className="size-3 mr-1.5" />
              {t("envExport.clear")}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            className="h-7 text-xs border-border text-muted-foreground hover:text-foreground"
          >
            {t("envExport.generate")}
          </Button>
        )}
      </div>

      {text && (
        <Card className="bg-muted/60 border-border p-4 space-y-3">
          <Textarea
            readOnly
            value={text}
            className="font-mono text-[10px] min-h-32 bg-muted border-border text-card-foreground resize-none leading-relaxed"
          />
          <Button
            variant="outline"
            onClick={onCopy}
            className="w-full h-8 text-xs border-border hover:bg-accent text-card-foreground"
          >
            {t("envExport.copyContent")}
          </Button>
        </Card>
      )}
    </div>
  )
}
