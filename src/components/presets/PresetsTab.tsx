import { useCallback, useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { listen } from "@tauri-apps/api/event"
import { LayersIcon, PlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/useToast"
import { usePresets } from "@/hooks/usePresets"
import { createPreset, getActivePreset } from "@/lib/tauri"
import { PresetDetails } from "./PresetDetails"
import { PresetList } from "./PresetList"
import { TemplatePicker } from "./TemplatePicker"
import type { PresetTemplate } from "@/types"

interface PresetsTabProps {
  vaultReady: boolean
}

export function PresetsTab({
  vaultReady,
}: PresetsTabProps) {
  const { t } = useTranslation()
  const { show } = useToast()
  const presets = usePresets()
  const [selectedPresetId, setSelectedPresetId] = useState("")
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  const refreshActivePreset = useCallback(async () => {
    try {
      const active = await getActivePreset()
      setActivePresetId(active?.id ?? null)
    } catch {
      setActivePresetId(null)
    }
  }, [])
  const focusCreateInput = useCallback(() => {
    createInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!vaultReady) return
    void presets.refresh()
    void refreshActivePreset()
  }, [vaultReady])

  useEffect(() => {
    const unlisten = listen("active-preset-changed", () => {
      void refreshActivePreset()
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [refreshActivePreset])

  useEffect(() => {
    if (presets.presets.length === 0) return
    const exists = presets.presets.some(
      (p) => p.id === selectedPresetId,
    )
    if (!exists) setSelectedPresetId(presets.presets[0].id)
  }, [presets.presets, selectedPresetId])

  const selected = presets.presets.find(
    (p) => p.id === selectedPresetId,
  )

  const handleDeletePreset = useCallback(
    (_id: string) => {
      void presets.refresh()
      void refreshActivePreset()
    },
    [presets, refreshActivePreset],
  )

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    const created = await presets.create()
    if (created) setSelectedPresetId(created.id)
  }

  async function handleCreateFromTemplate(template: PresetTemplate) {
    const name = prompt(
      `Create preset from "${template.name}" — enter a name:`,
      template.name.toLowerCase().replace(/\s+/g, "-"),
    )
    if (!name) return
    try {
      const created = await createPreset(
        name,
        `Preset from ${template.name}: ${template.description}`,
      )
      show(`Created preset: ${created.name}`, "success")
      await presets.refresh()
      setSelectedPresetId(created.id)
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), "error")
    }
  }

  return (
    <div className="flex flex-1 min-w-0 min-h-screen overflow-hidden">
      <PresetList
        presets={presets.presets}
        formName={presets.formName}
        submitting={presets.submitting}
        selectedId={selectedPresetId}
        loading={presets.loading}
        onSelect={setSelectedPresetId}
        onFormNameChange={presets.setFormName}
        onCreate={handleCreate}
        createInputRef={createInputRef}
        activePresetId={activePresetId}
      />

      <div className="flex-1 min-w-0 p-8 overflow-y-auto overflow-x-hidden">
        {selected ? (
          <PresetDetails
            preset={selected}
            onDeletePreset={handleDeletePreset}
          />
        ) : (
          <PresetsTabEmpty onCreate={focusCreateInput} />
        )}
      </div>
    </div>
  )
}

interface PresetsTabEmptyProps {
  onCreate: () => void
}

export function PresetsTabEmpty({ onCreate }: PresetsTabEmptyProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5 py-10 text-center max-w-sm mx-auto">
      <LayersIcon className="size-10 text-muted-foreground mx-auto" />
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-card-foreground">
          {t("presets.presetComposer")}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("presets.composerDesc")}
        </p>
      </div>
      <div className="flex justify-center gap-2">
        <Button
          onClick={onCreate}
          size="sm"
          className="bg-card border border-border text-card-foreground hover:bg-accent"
        >
          <PlusIcon className="size-3.5 mr-1.5" />
          {t("presets.createFirst")}
        </Button>
      </div>

      <div className="border-t border-border/50 pt-6">
        <TemplatePicker onCreateFromTemplate={() => {}} />
      </div>
    </div>
  )
}
