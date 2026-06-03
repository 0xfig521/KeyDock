import { useMemo } from "react"
import { PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InlineError,
  pattern,
  required,
  type ValidationRule,
  useFormValidation,
} from "@/hooks/useFormValidation"
import type { Key } from "@/types"

function notDuplicate(existing: string[], msg: string): ValidationRule {
  return {
    rule(v): boolean {
      if (typeof v !== "string" || !v) return true
      return !existing.includes(v)
    },
    message: msg,
  }
}

interface VariableMapperProps {
  keys: Key[]
  mappingKey: string
  mappingEnv: string
  submitting: boolean
  onKeyChange: (id: string) => void
  onEnvChange: (env: string) => void
  onSubmit: (event: React.FormEvent) => void
  existingEnvNames: string[]
}

export function VariableMapper({
  keys,
  mappingKey,
  mappingEnv,
  submitting,
  onKeyChange,
  onEnvChange,
  onSubmit,
  existingEnvNames,
}: VariableMapperProps) {
  const { t } = useTranslation()

  const rules = useMemo(
    () => ({
      mappingKey: [required(t("variableMapper.validation.selectKey"))] as const,
      mappingEnv: [
        required(t("variableMapper.validation.envRequired")),
        pattern(
          /^[A-Z_][A-Z0-9_]*$/,
          t("variableMapper.validation.envFormat"),
        ),
        notDuplicate(
          existingEnvNames,
          t("variableMapper.validation.envDuplicate"),
        ),
      ] as const,
    }),
    [existingEnvNames, t],
  )

  const { errors, validate, validateField, clearFieldError } =
    useFormValidation(rules)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate({ mappingKey, mappingEnv })) {
      onSubmit(e)
    }
  }

  return (
    <Card className="bg-muted/20 border-border p-4">
      <form onSubmit={handleSubmit} className="grid gap-4 text-xs">
        <span className="font-semibold text-card-foreground block">
          {t("variableMapper.newMapping")}
        </span>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              {t("variableMapper.keySource")}
            </label>
            <Select
              value={mappingKey}
              onValueChange={(val) => {
                const key = keys.find((k) => k.id === val)
                onKeyChange(val)
                onEnvChange(key?.envName ?? "")
                clearFieldError("mappingKey")
              }}
            >
              <SelectTrigger
                className="h-9 w-full min-w-0 text-xs bg-muted/80"
                onBlur={() => validateField("mappingKey", { mappingKey, mappingEnv })}
              >
                <SelectValue placeholder={t("variableMapper.selectKey")} />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-card border-border">
                <SelectGroup>
                  {keys.map((key) => (
                    <SelectItem key={key.id} value={key.id} className="text-xs">
                      {key.secretName ?? key.secretId}/{key.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <InlineError error={errors.mappingKey} />
          </div>

          <div className="grid gap-1.5">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              {t("variableMapper.envVarName")}
            </label>
            <Input
              value={mappingEnv}
              onChange={(e) => {
                onEnvChange(e.target.value.toUpperCase())
                clearFieldError("mappingEnv")
              }}
              onBlur={() => validateField("mappingEnv", { mappingKey, mappingEnv })}
              placeholder={t("variableMapper.envPlaceholder")}
              className="h-9 w-full min-w-0 text-xs bg-muted/80 font-mono"
            />
            <InlineError error={errors.mappingEnv} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!mappingKey || submitting}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
          >
            <PlusIcon className="size-3 mr-1" />
            {t("variableMapper.map")}
          </Button>
        </div>
      </form>
    </Card>
  )
}
