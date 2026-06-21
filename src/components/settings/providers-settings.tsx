import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ProviderInstance } from "@/lib/providers/providerTypes"
import {
  removeProvider as removePersistedProvider,
  saveProvider as savePersistedProvider,
  type ProviderSaveSecurityInput,
  useSetting,
} from "@/lib/settings/settingsStore"
import { AddProviderWizard } from "./providers/AddProviderWizard"
import { ProviderCard } from "./providers/ProviderCard"

export function ProvidersSettings() {
  const providers = useSetting("Providers")
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderInstance | null>(
    null,
  )

  function removeProvider(providerId: string) {
    void removePersistedProvider(providerId)
  }

  function openAddProvider() {
    setEditingProvider(null)
    setWizardOpen(true)
  }

  function openEditProvider(provider: ProviderInstance) {
    setEditingProvider(provider)
    setWizardOpen(true)
  }

  async function saveProvider(
    provider: ProviderInstance,
    security: ProviderSaveSecurityInput,
  ) {
    await savePersistedProvider(provider, security)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Configured Providers</h3>
          <p className="text-xs text-muted-foreground">
            Providers expose shared capabilities like pull requests and issues.
          </p>
        </div>
        <Button onClick={openAddProvider}>
          <Plus aria-hidden="true" className="size-4" />
          Add provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No providers configured yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              onEdit={() => openEditProvider(provider)}
              onRemove={() => removeProvider(provider.id)}
              provider={provider}
            />
          ))}
        </div>
      )}

      <AddProviderWizard
        editingProvider={editingProvider}
        onOpenChange={setWizardOpen}
        onSaveProvider={saveProvider}
        open={wizardOpen}
      />
    </div>
  )
}
