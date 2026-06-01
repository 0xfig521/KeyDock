import { ArrowRightIcon, SparklesIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { presets } from "@/constants"
import type { PresetDef } from "@/types"

interface PresetGridProps {
  onApply: (preset: PresetDef) => void
}

/**
 * Dashboard view shown when no service is selected. Lets the user
 * prefill the create-secret and create-api-key forms with a known
 * provider template.
 */
export function PresetGrid({ onApply }: PresetGridProps) {
  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-zinc-200">
          Local Secrets Vault
        </h1>
        <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
          Secure key manager powered by local AES-256 equivalent
          XChaCha20Poly1305 encryption. Integrate and inject local
          environment keys directly into your development shell.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">
          Quick-start Config Presets
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {presets.map((preset) => (
            <Card
              key={preset.name}
              onClick={() => onApply(preset)}
              className="bg-zinc-900/10 border-zinc-900 hover:border-zinc-800 cursor-pointer p-4 transition-all hover:bg-zinc-900/40 group flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-zinc-300 group-hover:text-emerald-400 transition-colors">
                    {preset.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] py-0 px-1 font-mono uppercase bg-zinc-900 text-zinc-500 shrink-0"
                  >
                    {preset.category}
                  </Badge>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono truncate">
                  {preset.baseUrl}
                </p>
              </div>
              <div className="pt-4 flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-900/50 mt-3">
                <span>Includes 1 default key</span>
                <ArrowRightIcon className="size-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="p-4 border border-dashed rounded-lg border-zinc-800 bg-zinc-950/10 flex items-start gap-3">
        <SparklesIcon className="size-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-semibold text-zinc-300">
            How Env Injection Works
          </span>
          <p className="text-zinc-500 leading-relaxed">
            Rather than loading raw text from{" "}
            <code className="text-zinc-400">.env</code> files, use our CLI in
            your terminals:
          </p>
          <code className="block mt-2 font-mono text-[10px] text-emerald-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 w-fit">
            keydock run -w development -- bun run dev
          </code>
        </div>
      </div>
    </div>
  )
}
