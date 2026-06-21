import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ProviderFieldsEditor,
  validateProviderFieldValues,
} from "@/components/settings/fields"
import type { ProviderCapability } from "@/lib/providers/capabilities"
import { getProviderPlugin, providerPlugins } from "@/lib/providers/registry"
import {
  collectPersistedProviderSettings,
  getEditableProviderFieldValues,
  getProviderAllowedOrigins,
  getProviderSecretSettingPaths,
  type ProviderFieldFormValue,
} from "@/lib/providers/providerSettings"
import type {
  ProviderInstance,
  ProviderType,
} from "@/lib/providers/providerTypes"
import type { ProviderSaveSecurityInput } from "@/lib/settings/settingsStore"
import {
  CapabilityPicker,
  ProviderPicker,
  ProviderSecretClearWarning,
} from "./ProviderWizardSections"
import {
  createProviderId,
  shouldWarnBeforeProviderSave,
  toggleCapability,
  toggleRevealedField,
} from "./wizardHelpers"
export function AddProviderWizard({
  editingProvider,
  onOpenChange,
  onSaveProvider,
  open,
}: {
  editingProvider: ProviderInstance | null
  onOpenChange: (open: boolean) => void
  onSaveProvider: (
    provider: ProviderInstance,
    security: ProviderSaveSecurityInput,
  ) => Promise<void>
  open: boolean
}) {
  const [selectedProviderType, setSelectedProviderType] =
    useState<ProviderType>(editingProvider?.type ?? "github")
  const [fieldValues, setFieldValues] = useState<
    Record<string, ProviderFieldFormValue>
  >({})
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    ProviderCapability[]
  >([])
  const [providerSearch, setProviderSearch] = useState("")
  const [capabilitySearch, setCapabilitySearch] = useState("")
  const [revealedFields, setRevealedFields] = useState<Set<string>>(
    () => new Set(),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [pendingProviderSave, setPendingProviderSave] =
    useState<ProviderInstance | null>(null)
  const selectedPlugin = getProviderPlugin(selectedProviderType)
  const isEditing = Boolean(editingProvider)

  useEffect(() => {
    if (!open) {
      return
    }

    const providerType = editingProvider?.type ?? "github"
    const plugin = getProviderPlugin(providerType)
    setSelectedProviderType(providerType)
    setFieldValues(
      getEditableProviderFieldValues(plugin, editingProvider?.settings ?? {}),
    )
    setSelectedCapabilities(
      [...(editingProvider?.enabledCapabilities ?? plugin?.capabilities ?? [])],
    )
    setProviderSearch("")
    setCapabilitySearch("")
    setRevealedFields(new Set())
    setIsSaving(false)
    setError("")
    setPendingProviderSave(null)
  }, [editingProvider, open])

  function resetWizard() {
    const providerType = editingProvider?.type ?? "github"
    const plugin = getProviderPlugin(providerType)
    setSelectedProviderType(providerType)
    setFieldValues(
      getEditableProviderFieldValues(plugin, editingProvider?.settings ?? {}),
    )
    setSelectedCapabilities(
      [
        ...(editingProvider?.enabledCapabilities ??
          getProviderPlugin(editingProvider?.type ?? "github")?.capabilities ??
          []),
      ],
    )
    setProviderSearch("")
    setCapabilitySearch("")
    setRevealedFields(new Set())
    setIsSaving(false)
    setError("")
    setPendingProviderSave(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetWizard()
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedPlugin) {
      setError("Select a provider.")
      return
    }

    const validationError = await validateProviderFieldValues({
      existingSettings: editingProvider?.settings,
      fieldValues,
      fields: selectedPlugin.fields,
      isEditing,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    if (selectedCapabilities.length === 0) {
      setError("Select at least one capability.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const provider: ProviderInstance = {
        id: editingProvider?.id ?? createProviderId(),
        type: selectedPlugin.type,
        displayName: editingProvider?.displayName ?? selectedPlugin.label,
        settings: await collectPersistedProviderSettings({
          existingSettings: editingProvider?.settings,
          fieldValues,
          isEditing,
          plugin: selectedPlugin,
        }),
        enabledCapabilities: selectedCapabilities,
      }

      if (
        shouldWarnBeforeProviderSave({
          editingProvider,
          fieldValues,
          plugin: selectedPlugin,
          provider,
        })
      ) {
        setPendingProviderSave(provider)
        setIsSaving(false)
        return
      }

      await saveProviderDraft(provider)
    } catch (saveError) {
      console.error("Failed to save provider.", saveError)
      setError("Failed to save provider.")
      setIsSaving(false)
    }
  }

  async function saveProviderDraft(provider: ProviderInstance) {
    setIsSaving(true)
    setError("")

    try {
      if (!selectedPlugin) {
        throw new Error("Select a provider.")
      }
      await onSaveProvider(provider, {
        allowedOrigins: getProviderAllowedOrigins(selectedPlugin, provider.settings),
        secretSettingPaths: getProviderSecretSettingPaths(selectedPlugin),
      })
      setPendingProviderSave(null)
      handleOpenChange(false)
    } catch (saveError) {
      console.error("Failed to save provider.", saveError)
      setError("Failed to save provider.")
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="grid max-h-[min(760px,calc(100vh-2rem))] max-w-[min(860px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[min(860px,calc(100vw-2rem))]">
        <form className="contents" onSubmit={submit}>
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>{isEditing ? "Edit Provider" : "Add Provider"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update this provider's settings and enabled capabilities."
                : "Select a provider and enter the settings it needs."}
            </DialogDescription>
          </DialogHeader>

          <div className="themed-scrollbar min-h-0 overflow-y-auto px-5 py-4">
            <div className="grid gap-4">
              <ProviderPicker
                disabled={isEditing}
                onProviderSearchChange={setProviderSearch}
                onSelectProvider={(plugin) => {
                  if (isEditing) {
                    return
                  }
                  setSelectedProviderType(plugin.type)
                  setSelectedCapabilities([...plugin.capabilities])
                  setCapabilitySearch("")
                  setFieldValues(getEditableProviderFieldValues(plugin, {}))
                  setError("")
                }}
                providerPlugins={providerPlugins}
                providerSearch={providerSearch}
                selectedProviderType={selectedProviderType}
              />

              {selectedPlugin ? (
                <>
                  <CapabilityPicker
                    capabilitySearch={capabilitySearch}
                    onCapabilitySearchChange={setCapabilitySearch}
                    onToggleCapability={(capability) => {
                      setSelectedCapabilities((current) =>
                        toggleCapability(current, capability),
                      )
                      setError("")
                    }}
                    plugin={selectedPlugin}
                    selectedCapabilities={selectedCapabilities}
                  />

                  <section className="grid gap-3">
                    <h3 className="text-sm font-semibold">Settings</h3>
                    <ProviderFieldsEditor
                      fieldValues={fieldValues}
                      fields={selectedPlugin.fields}
                      onChange={(fieldKey, value) => {
                        setFieldValues((current) => ({
                          ...current,
                          [fieldKey]: value,
                        }))
                        setError("")
                      }}
                      onToggleReveal={(fieldKey) => {
                        setRevealedFields((current) =>
                          toggleRevealedField(current, fieldKey),
                        )
                      }}
                      path={[]}
                      revealedFields={revealedFields}
                    />
                  </section>
                </>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </div>

          <DialogFooter className="m-0 rounded-none border-t px-5 py-4">
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Update provider"
                  : "Save provider"}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
      <ProviderSecretClearWarning
        isSaving={isSaving}
        onCancel={() => setPendingProviderSave(null)}
        onConfirm={(provider) => void saveProviderDraft(provider)}
        pendingProviderSave={pendingProviderSave}
      />
    </>
  )
}


