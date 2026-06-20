import { Checkbox } from "@/components/ui/checkbox"
import type { ProviderCapability } from "@/lib/providers/capabilities"
import { getProviderCapabilityDefinition } from "@/lib/providers/capabilities"
import type { ProviderPlugin } from "@/lib/providers/providerTypes"

export function ProviderOption({
  disabled = false,
  isSelected,
  onSelect,
  plugin,
}: {
  disabled?: boolean
  isSelected: boolean
  onSelect: () => void
  plugin: ProviderPlugin
}) {
  return (
    <button
      className="flex min-h-18 items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-60 data-[selected=true]:border-primary data-[selected=true]:bg-accent"
      data-selected={isSelected}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <plugin.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {plugin.label}
        </span>
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {plugin.description}
        </span>
      </span>
    </button>
  )
}

export function CapabilityOption({
  capability,
  isSelected,
  onToggle,
}: {
  capability: ProviderCapability
  isSelected: boolean
  onToggle: () => void
}) {
  const definition = getProviderCapabilityDefinition(capability)

  return (
    <button
      className="flex min-h-18 items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent data-[selected=true]:border-primary data-[selected=true]:bg-accent"
      data-selected={isSelected}
      onClick={onToggle}
      type="button"
    >
      <Checkbox
        checked={isSelected}
        className="mt-0.5"
        onCheckedChange={onToggle}
        tabIndex={-1}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {definition?.displayName ?? capability}
        </span>
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {definition?.description ?? capability}
        </span>
      </span>
    </button>
  )
}
