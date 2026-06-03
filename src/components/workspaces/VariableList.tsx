import { memo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { WorkspaceVariable } from "@/types"

interface VariableListProps {
  variables: WorkspaceVariable[]
  onUnbind: (variable: WorkspaceVariable) => void
}

export function VariableList({ variables, onUnbind }: VariableListProps) {
  const { t } = useTranslation()

  if (variables.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-lg border-border text-center">
        <p className="text-xs text-muted-foreground">
          {t("variableList.noVariables")}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {variables.map((variable) => (
        <VariableItem
          key={variable.id}
          variable={variable}
          onUnbind={onUnbind}
        />
      ))}
    </div>
  )
}

interface VariableItemProps {
  variable: WorkspaceVariable
  onUnbind: (variable: WorkspaceVariable) => void
}

const VariableItem = memo(function VariableItem({
  variable,
  onUnbind,
}: VariableItemProps) {
  const { t } = useTranslation()

  return (
    <Card className="bg-muted/10 border-border hover:border-border/80 transition-colors">
      <CardContent className="p-3 flex items-center justify-between gap-4 text-xs">
        <div className="min-w-0 flex-1">
          <code className="block font-mono text-[11px] text-foreground truncate">
            {variable.envName}
          </code>
          <span className="block text-[10px] text-muted-foreground mt-0.5 truncate">
            Source: {variable.secretName ?? variable.secretId} /{" "}
            {variable.keyName ?? variable.keyId}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onUnbind(variable)}
          className="h-7 px-2.5 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20 shrink-0"
        >
          {t("variableList.unbind")}
        </Button>
      </CardContent>
    </Card>
  )
})
