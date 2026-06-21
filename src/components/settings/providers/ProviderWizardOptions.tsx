import { Check } from "lucide-react";
import type { ProviderCapability } from "@/lib/providers/capabilities";
import { getProviderCapabilityDefinition } from "@/lib/providers/capabilities";
import type { ProviderPlugin } from "@/lib/providers/providerTypes";

export function ProviderOption({
  disabled = false,
  isSelected,
  onSelect,
  plugin,
}: {
  disabled?: boolean;
  isSelected: boolean;
  onSelect: () => void;
  plugin: ProviderPlugin;
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
        <span className="mt-2 block text-[0.7rem] uppercase tracking-wide text-muted-foreground">
          {plugin.providerKinds.join(" / ")}
        </span>
      </span>
    </button>
  );
}

export function CapabilityOption({
  capability,
  isSelected,
  onToggle,
}: {
  capability: ProviderCapability;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const definition = getProviderCapabilityDefinition(capability);

  return (
    <button
      className="flex min-h-18 items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent data-[selected=true]:border-primary data-[selected=true]:bg-accent"
      data-selected={isSelected}
      aria-pressed={isSelected}
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background text-primary-foreground data-[selected=true]:border-primary data-[selected=true]:bg-primary"
        data-selected={isSelected}
      >
        {isSelected ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {definition?.displayName ?? capability}
        </span>
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {definition?.description ?? capability}
        </span>
        {definition ? (
          <span className="mt-2 block text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            {definition.providerKind}
          </span>
        ) : null}
      </span>
    </button>
  );
}
