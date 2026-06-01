import type { FormEvent } from "react"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ApiKeyForm } from "@/types"

interface ApiKeyFormProps {
  form: ApiKeyForm
  onChange: (form: ApiKeyForm) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
  submitting: boolean
}

/**
 * Inline form for creating a new API key under a service.
 * The parent owns the `form` state and submit handler so duplicate-name
 * checks can consult the parent's list of existing keys.
 */
export function ApiKeyForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
}: ApiKeyFormProps) {
  return (
    <Card className="bg-zinc-900/40 border-zinc-800 p-4 animate-in fade-in slide-in-from-top-3">
      <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
          <span className="font-semibold text-zinc-300">Add API Key entry</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            aria-label="Cancel"
            className="h-5 w-5 p-0 hover:bg-zinc-800 text-zinc-400"
          >
            <XIcon className="size-3" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-zinc-500">
              Key Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              placeholder="e.g. prod-default, client-a"
              required
              className="h-8 text-xs bg-zinc-950/60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-zinc-500">
              Default Environment Variable
            </label>
            <Input
              value={form.envName}
              onChange={(e) =>
                onChange({ ...form, envName: e.target.value.toUpperCase() })
              }
              placeholder="e.g. OPENAI_API_KEY"
              className="h-8 text-xs bg-zinc-950/60 font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-zinc-500">
            API Key Secret Value *
          </label>
          <Input
            type="password"
            value={form.value}
            onChange={(e) => onChange({ ...form, value: e.target.value })}
            placeholder="sk-..."
            required
            className="h-8 text-xs bg-zinc-950/60 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 pt-1.5">
          <input
            type="checkbox"
            checked={form.includeByDefault}
            onChange={(e) =>
              onChange({ ...form, includeByDefault: e.target.checked })
            }
            className="size-3.5 rounded border-zinc-800 bg-background accent-emerald-600 cursor-pointer"
            id="include-by-default-chk"
          />
          <label
            htmlFor="include-by-default-chk"
            className="text-xs text-zinc-400 cursor-pointer select-none"
          >
            Include by default when mapping or exporting this service.
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={submitting}
          >
            Add Key
          </Button>
        </div>
      </form>
    </Card>
  )
}
