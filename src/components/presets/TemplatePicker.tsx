import { useTranslation } from "react-i18next"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { presetTemplates } from "@/constants"
import type { PresetTemplate } from "@/types"

interface TemplatePickerProps {
  onCreateFromTemplate: (template: PresetTemplate) => void
}

export function TemplatePicker({ onCreateFromTemplate }: TemplatePickerProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("presets.templates")}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {presetTemplates.map((template) => (
          <Card
            key={template.name}
            onClick={() => onCreateFromTemplate(template)}
            className="bg-muted/10 border-border hover:border-border cursor-pointer p-4 transition-all hover:bg-accent/40 group flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <span className="font-semibold text-xs text-card-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {template.name}
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {template.description}
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <span className="text-[9px] text-muted-foreground">
                {template.fields.length} env var
                {template.fields.length !== 1 ? "s" : ""}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 font-mono uppercase bg-card text-muted-foreground"
              >
                {t("presets.useTemplate")}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
