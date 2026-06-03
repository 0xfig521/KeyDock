import type { FormEvent } from "react"
import { XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  InlineError,
  minLength,
  pattern,
  required,
  useFormValidation,
} from "@/hooks/useFormValidation"
import type { KeyForm } from "@/types"

interface KeyFormProps {
  form: KeyForm
  onChange: (form: KeyForm) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
  submitting: boolean
  editingKey?: boolean
}

export function KeyForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  editingKey,
}: KeyFormProps) {
  const { t } = useTranslation()

  const KEY_BASE_RULES = {
    name: [required(t("keyForm.validation.nameRequired")), minLength(1, t("keyForm.validation.nameEmpty"))],
    envName: [
      pattern(
        /^[A-Z_][A-Z0-9_]*$/,
        t("keyForm.validation.envFormat"),
      ),
    ],
  } as const

  const rules = editingKey
    ? KEY_BASE_RULES
    : {
        ...KEY_BASE_RULES,
        value: [
          required(t("keyForm.validation.valueRequired")),
          minLength(1, t("keyForm.validation.valueEmpty")),
        ],
      }

  const { errors, validate, validateField, clearFieldError } =
    useFormValidation<KeyForm>(rules)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate(form)) {
      onSubmit(e)
    }
  }

  return (
    <Card className="bg-muted/40 border-border p-4 animate-in fade-in slide-in-from-top-3">
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="font-semibold text-card-foreground">
            {editingKey ? t("keyForm.editTitle") : t("keyForm.newTitle")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            aria-label={t("keyForm.cancel")}
            className="h-5 w-5 p-0 hover:bg-accent text-muted-foreground"
          >
            <XIcon className="size-3" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              {t("keyForm.keyName")} {t("keyForm.required")}
            </label>
            <Input
              value={form.name}
              onChange={(e) => {
                onChange({ ...form, name: e.target.value })
                clearFieldError("name")
              }}
              onBlur={() => validateField("name", form)}
              placeholder={t("keyForm.namePlaceholder")}
              className="h-8 text-xs bg-muted/80"
            />
            <InlineError error={errors.name} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              {t("keyForm.envVarName")}
            </label>
            <Input
              value={form.envName}
              onChange={(e) => {
                onChange({ ...form, envName: e.target.value.toUpperCase() })
                clearFieldError("envName")
              }}
              onBlur={() => validateField("envName", form)}
              placeholder={t("keyForm.envPlaceholder")}
              className="h-8 text-xs bg-muted/80 font-mono"
            />
            <InlineError error={errors.envName} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-muted-foreground">
            {t("keyForm.value")} {editingKey ? "" : t("keyForm.required")}
          </label>
          <Input
            type="password"
            value={form.value}
            onChange={(e) => {
              onChange({ ...form, value: e.target.value })
              clearFieldError("value")
            }}
            onBlur={() => validateField("value", form)}
            placeholder={editingKey ? t("keyForm.valuePlaceholderEdit") : t("keyForm.valuePlaceholder")}
            className="h-8 text-xs bg-muted/80 font-mono"
          />
          <InlineError error={errors.value} />
        </div>

        <div className="flex items-center gap-2 pt-1.5">
          <input
            type="checkbox"
            checked={form.includeByDefault}
            onChange={(e) =>
              onChange({ ...form, includeByDefault: e.target.checked })
            }
            className="size-3.5 rounded border-border bg-background accent-primary cursor-pointer"
            id="include-by-default-chk"
          />
          <label
            htmlFor="include-by-default-chk"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            {t("keyForm.autoInclude")}
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={submitting}
          >
            {editingKey ? t("keyForm.saveChanges") : t("keyForm.addKey")}
          </Button>
        </div>
      </form>
    </Card>
  )
}
