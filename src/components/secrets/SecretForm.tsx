import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  minLength,
  required,
  useFormValidation,
} from "@/hooks/useFormValidation"
import { SECRET_CATEGORIES } from "@/types"
import type { SecretCategory, SecretForm } from "@/types"

interface SecretFormProps {
  form: SecretForm
  onChange: (form: SecretForm) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
  isEditing: boolean
  submitting: boolean
}

export function SecretForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  submitting,
}: SecretFormProps) {
  const { t } = useTranslation()

  const CATEGORY_LABEL: Record<SecretCategory, string> = {
    aI: "AI",
    cloud: "Cloud",
    search: "Search",
    database: "Database",
    devTool: "Dev Tool",
    payment: "Payment",
    custom: "Custom",
  }

  const SECRET_RULES = {
    name: [required(t("secretForm.validation.nameRequired")), minLength(1, t("secretForm.validation.nameEmpty"))],
  } as const

  const { errors, validate, validateField, clearFieldError } =
    useFormValidation<SecretForm>(SECRET_RULES)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate(form)) {
      onSubmit(e)
    }
  }

  return (
    <Card className="bg-muted/40 border-border max-w-3xl mx-auto shadow-lg p-0 overflow-hidden">
      <CardHeader className="p-8 pb-5 border-b border-border gap-2">
        <CardTitle className="text-sm font-semibold">
          {isEditing ? t("secretForm.editTitle") : t("secretForm.newTitle")}
        </CardTitle>
        <CardDescription className="text-xs">
          {isEditing
            ? t("secretForm.editDescription")
            : t("secretForm.newDescription")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 p-8 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-muted-foreground">
                {t("secretForm.serviceName")} {t("secretForm.required")}
              </label>
              <Input
                value={form.name}
                onChange={(e) => {
                  onChange({ ...form, name: e.target.value })
                  clearFieldError("name")
                }}
                onBlur={() => validateField("name", form)}
                placeholder={t("secretForm.namePlaceholder")}
                className="h-8 text-xs bg-background/50"
              />
              <InlineError error={errors.name} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-muted-foreground">
                {t("secretForm.category")}
              </label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  onChange({ ...form, category: val as SecretCategory })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectGroup>
                    {SECRET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {CATEGORY_LABEL[cat]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/70 bg-background/20 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] uppercase font-mono text-muted-foreground">
                  {t("secretForm.apiBaseUrl")} {t("secretForm.optional")}
                </label>
                <Input
                  value={form.baseUrl}
                  onChange={(e) => onChange({ ...form, baseUrl: e.target.value })}
                  placeholder={t("secretForm.urlPlaceholder")}
                  className="h-8 text-xs font-mono bg-background/50"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[11px] uppercase font-mono text-muted-foreground">
                  {t("secretForm.tags")} {t("secretForm.tagsHint")}
                </label>
                <Input
                  value={form.tags}
                  onChange={(e) => onChange({ ...form, tags: e.target.value })}
                  placeholder={t("secretForm.tagsPlaceholder")}
                  className="h-8 text-xs bg-background/50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-[11px] uppercase font-mono text-muted-foreground">
                {t("secretForm.dashboardUrl")} {t("secretForm.optional")}
              </label>
              <Input
                value={form.dashboardUrl}
                onChange={(e) => onChange({ ...form, dashboardUrl: e.target.value })}
                placeholder={t("secretForm.urlPlaceholder")}
                className="h-8 text-xs bg-background/50 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase font-mono text-muted-foreground">
                {t("secretForm.docsUrl")} {t("secretForm.optional")}
              </label>
              <Input
                value={form.docsUrl}
                onChange={(e) => onChange({ ...form, docsUrl: e.target.value })}
                placeholder={t("secretForm.urlPlaceholder")}
                className="h-8 text-xs bg-background/50 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase font-mono text-muted-foreground">
                {t("secretForm.loginUrl")} {t("secretForm.optional")}
              </label>
              <Input
                value={form.loginUrl}
                onChange={(e) => onChange({ ...form, loginUrl: e.target.value })}
                placeholder={t("secretForm.urlPlaceholder")}
                className="h-8 text-xs bg-background/50 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase font-mono text-muted-foreground">
              {t("secretForm.description")}
            </label>
            <Input
              value={form.description}
              onChange={(e) =>
                onChange({ ...form, description: e.target.value })
              }
              placeholder={t("secretForm.descPlaceholder")}
              className="h-8 text-xs bg-background/50"
            />
          </div>
        </CardContent>
        <CardFooter className="p-8 py-5 flex justify-end gap-2 border-t border-border bg-muted/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            disabled={submitting}
          >
            {t("secretForm.cancel")}
          </Button>
          <Button
            type="submit"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={submitting}
          >
            {isEditing ? t("secretForm.saveChanges") : t("secretForm.create")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
