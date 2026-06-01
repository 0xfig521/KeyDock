import { PlusIcon } from "lucide-react"
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
import type { ApiKey } from "@/types"

interface VariableMapperProps {
  apiKeys: ApiKey[]
  mappingApiKey: string
  mappingEnv: string
  submitting: boolean
  onApiKeyChange: (id: string) => void
  onEnvChange: (env: string) => void
  onSubmit: (event: React.FormEvent) => void
}

/**
 * Inline form for binding an API key to a workspace env variable.
 * `onApiKeyChange` defaults the env name to the key's `envName`
 * (kept in sync at the host so the parent can also access it).
 */
export function VariableMapper({
  apiKeys,
  mappingApiKey,
  mappingEnv,
  submitting,
  onApiKeyChange,
  onEnvChange,
  onSubmit,
}: VariableMapperProps) {
  return (
    <Card className="bg-zinc-900/20 border-zinc-900 p-4">
      <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
        <span className="font-semibold text-zinc-300 block">
          Map Key to Environment Variable
        </span>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-zinc-500">
              API Key Source
            </label>
            <Select
              value={mappingApiKey}
              onValueChange={(val) => {
                const key = apiKeys.find((k) => k.id === val)
                onApiKeyChange(val)
                onEnvChange(key?.envName ?? "")
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-zinc-950/60">
                <SelectValue placeholder="Choose credential..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectGroup>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id} className="text-xs">
                      {key.secretName ?? key.secretId}/{key.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-zinc-500">
              Export Environment Name
            </label>
            <Input
              value={mappingEnv}
              onChange={(e) => onEnvChange(e.target.value.toUpperCase())}
              placeholder="e.g. DEEPSEEK_API_KEY"
              className="h-8 text-xs bg-zinc-950/60 font-mono"
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={!mappingApiKey || submitting}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
          >
            <PlusIcon className="size-3 mr-1" />
            Bind Variable
          </Button>
        </div>
      </form>
    </Card>
  )
}
