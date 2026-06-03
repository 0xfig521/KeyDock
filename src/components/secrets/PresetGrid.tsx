import { ArrowRightIcon, SparklesIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { presets } from "@/constants"
import type { PresetDef } from "@/types"

interface PresetGridProps {
  onApply: (preset: PresetDef) => void
}

export function PresetGrid({ onApply }: PresetGridProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("preset.welcome")}
        </h1>
        <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
          {t("preset.welcomeDesc")}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          {t("preset.quickStart")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {presets.map((preset) => (
            <Card
              key={preset.name}
              onClick={() => onApply(preset)}
              className="bg-muted/10 border-border hover:border-border cursor-pointer p-4 transition-all hover:bg-accent/40 group flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-card-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {preset.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] py-0 px-1 font-mono uppercase bg-card text-muted-foreground shrink-0"
                  >
                    {preset.category}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {preset.baseUrl}
                </p>
              </div>
              <div className="pt-4 flex items-center gap-2 text-[10px] text-emerald-700/70 dark:text-emerald-500/70 border-t border-border/50 mt-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                <span className="font-mono uppercase tracking-wider">{t("preset.applyPreset")}</span>
                <ArrowRightIcon className="size-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="p-4 border border-dashed rounded-lg border-border bg-muted/10 flex items-start gap-3">
        <SparklesIcon className="size-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-semibold text-card-foreground">
            {t("preset.envInjection")}
          </span>
          <p className="text-muted-foreground leading-relaxed">
            {t("preset.envInjectionDesc")}
          </p>
          <code className="block mt-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-card px-2 py-1 rounded border border-border w-fit">
            keydock run -w development -- bun run dev
          </code>
        </div>
      </div>
    </div>
  )
}
