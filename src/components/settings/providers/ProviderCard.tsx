import { Pencil, Trash2, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getProviderCapabilityDefinition,
  type ProviderCapability,
} from "@/lib/providers/capabilities"
import { getProviderPlugin } from "@/lib/providers/registry"
import type { ProviderInstance } from "@/lib/providers/providerTypes"

export function ProviderCard({
  onEdit,
  onRemove,
  provider,
}: {
  onEdit: () => void
  onRemove: () => void
  provider: ProviderInstance
}) {
  const plugin = getProviderPlugin(provider.type)
  const Icon = plugin?.icon ?? Workflow
  const secretFields = plugin?.fields.filter((field) => field.secret) ?? []

  return (
    <article className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold">
              {provider.displayName}
            </h4>
            <p className="text-xs text-muted-foreground">
              {plugin?.description ?? "Provider plugin"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            aria-label={`Edit ${provider.displayName}`}
            onClick={onEdit}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={`Remove ${provider.displayName}`}
            onClick={onRemove}
            size="icon-sm"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {provider.enabledCapabilities.length > 0 ? (
          provider.enabledCapabilities.map((capability) => (
            <span
              className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
              key={capability}
            >
              {getCapabilityDisplayName(capability)}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">
            No capabilities enabled
          </span>
        )}
      </div>

      {secretFields.length > 0 ? (
        <div className="mt-3 text-xs text-muted-foreground">
          {secretFields.map((field) => (
            <span key={field.key}>
              {field.label}{" "}
              {provider.settings[field.key] ? "configured" : "missing"}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function getCapabilityDisplayName(capability: ProviderCapability) {
  return getProviderCapabilityDefinition(capability)?.displayName ?? capability
}
