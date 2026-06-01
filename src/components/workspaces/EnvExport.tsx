import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface EnvExportProps {
  text: string
  onGenerate: () => void
  onCopy: () => void
}

export function EnvExport({ text, onGenerate, onCopy }: EnvExportProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Raw Export
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          className="h-7 text-xs border-zinc-900 text-zinc-400 hover:text-zinc-200"
        >
          Generate .env
        </Button>
      </div>

      {text && (
        <Card className="bg-zinc-950/40 border-zinc-900 p-4 space-y-3">
          <Textarea
            readOnly
            value={text}
            className="font-mono text-[10px] min-h-32 bg-zinc-950/80 border-zinc-800 text-zinc-300 resize-none leading-relaxed"
          />
          <Button
            variant="outline"
            onClick={onCopy}
            className="w-full h-8 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300"
          >
            Copy .env parameters
          </Button>
        </Card>
      )}
    </div>
  )
}
