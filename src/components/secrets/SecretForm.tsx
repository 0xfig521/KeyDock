import type { FormEvent } from "react"
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

const CATEGORY_LABEL: Record<SecretCategory, string> = {
  aI: "AI",
  cloud: "Cloud",
  search: "Search",
  database: "Database",
  devTool: "Dev Tool",
  payment: "Payment",
  custom: "Custom",
}

export function SecretForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  submitting,
}: SecretFormProps) {
  return (
    <Card className="bg-zinc-900/40 border-zinc-800 max-w-xl shadow-lg p-0 overflow-hidden">
      <CardHeader className="p-6 pb-4 border-b border-zinc-900 gap-2">
        <CardTitle className="text-sm font-semibold">
          {isEditing ? "Edit Service Group" : "Register Service Group"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isEditing
            ? "Modify endpoints, category, default model name, tags, and description."
            : "Group endpoints, URLs, default models, and map multiple API credentials under a service."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4 p-6 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-zinc-500">
                Service Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) => onChange({ ...form, name: e.target.value })}
                placeholder="e.g. OpenRouter"
                required
                className="h-8 text-xs bg-background/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-zinc-500">
                Category
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
                <SelectContent className="bg-zinc-900 border-zinc-800">
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

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-zinc-500">
              API Base URL (Optional)
            </label>
            <Input
              value={form.baseUrl}
              onChange={(e) => onChange({ ...form, baseUrl: e.target.value })}
              placeholder="e.g. https://api.openrouter.ai/api/v1"
              className="h-8 text-xs font-mono bg-background/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-zinc-500">
                Default Model Name (Optional)
              </label>
              <Input
                value={form.modelName}
                onChange={(e) =>
                  onChange({ ...form, modelName: e.target.value })
                }
                placeholder="e.g. gpt-4o"
                className="h-8 text-xs bg-background/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-zinc-500">
                Tags (Comma-separated)
              </label>
              <Input
                value={form.tags}
                onChange={(e) => onChange({ ...form, tags: e.target.value })}
                placeholder="e.g. ai, production"
                className="h-8 text-xs bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-zinc-500">
              Description
            </label>
            <Input
              value={form.description}
              onChange={(e) =>
                onChange({ ...form, description: e.target.value })
              }
              placeholder="Brief description about the workspace target..."
              className="h-8 text-xs bg-background/50"
            />
          </div>
        </CardContent>
        <CardFooter className="p-6 py-4 flex justify-end gap-2 border-t border-zinc-900 bg-muted/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={submitting}
          >
            {isEditing ? "Save Changes" : "Create Group"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
