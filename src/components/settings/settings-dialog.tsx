import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Pencil, Plus, Settings, Trash2, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getProviderPlugin, providerPlugins } from "@/lib/providers/registry"
import {
  getProviderCapabilityDefinition,
  type ProviderCapability,
} from "@/lib/providers/capabilities"
import type {
  ProviderField,
  ProviderInstance,
  ProviderPlugin,
  ProviderType,
} from "@/lib/providers/providerTypes"
import { setSetting, useSetting } from "@/lib/settings/settingsStore"
import { ThemeSelector } from "./theme-selector"

type SettingsCategory = "general" | "providers"

const categories: Array<{
  description: string
  icon: typeof Settings | typeof Workflow
  id: SettingsCategory
  label: string
}> = [
  {
    description: "Theme and application preferences",
    icon: Settings,
    id: "general",
    label: "General",
  },
  {
    description: "Connected data sources and capabilities",
    icon: Workflow,
    id: "providers",
    label: "Providers",
  },
]

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("general")
  const active = categories.find((category) => category.id === activeCategory)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[min(560px,calc(100vh-2rem))] max-w-[min(920px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[min(920px,calc(100vw-2rem))]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            {active?.description ?? "Application preferences"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 grid-cols-[220px_minmax(0,1fr)]">
          <nav className="border-r bg-card/50 p-2">
            {categories.map((category) => (
              <CategoryButton
                category={category}
                isActive={activeCategory === category.id}
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </nav>
          <section className="themed-scrollbar min-h-0 overflow-y-auto p-5">
            {activeCategory === "general" ? <GeneralSettings /> : null}
            {activeCategory === "providers" ? <ProvidersSettings /> : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CategoryButton({
  category,
  isActive,
  onClick,
}: {
  category: (typeof categories)[number]
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Button
      className="mb-1 h-auto w-full justify-start gap-2 px-2 py-2 text-left"
      onClick={onClick}
      variant={isActive ? "secondary" : "ghost"}
    >
      <category.icon aria-hidden="true" className="size-4" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {category.label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {category.description}
        </span>
      </span>
    </Button>
  )
}

function ProvidersSettings() {
  const providers = useSetting("Providers")
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderInstance | null>(
    null,
  )

  function removeProvider(providerId: string) {
    void setSetting(
      "Providers",
      providers.filter((provider) => provider.id !== providerId),
    )
  }

  function openAddProvider() {
    setEditingProvider(null)
    setWizardOpen(true)
  }

  function openEditProvider(provider: ProviderInstance) {
    setEditingProvider(provider)
    setWizardOpen(true)
  }

  function saveProvider(provider: ProviderInstance) {
    const existingProviderIndex = providers.findIndex(
      (currentProvider) => currentProvider.id === provider.id,
    )

    if (existingProviderIndex === -1) {
      void setSetting("Providers", [...providers, provider])
      return
    }

    const nextProviders = [...providers]
    nextProviders[existingProviderIndex] = provider
    void setSetting("Providers", nextProviders)
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

function ProviderCard({
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

function AddProviderWizard({
  editingProvider,
  onOpenChange,
  onSaveProvider,
  open,
}: {
  editingProvider: ProviderInstance | null
  onOpenChange: (open: boolean) => void
  onSaveProvider: (provider: ProviderInstance) => void
  open: boolean
}) {
  const [selectedProviderType, setSelectedProviderType] =
    useState<ProviderType>(editingProvider?.type ?? "github")
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    ProviderCapability[]
  >([])
  const [providerSearch, setProviderSearch] = useState("")
  const [capabilitySearch, setCapabilitySearch] = useState("")
  const [error, setError] = useState("")
  const selectedPlugin = getProviderPlugin(selectedProviderType)
  const isEditing = Boolean(editingProvider)
  const filteredProviderPlugins = providerPlugins.filter((plugin) =>
    matchesSearch(
      `${plugin.label} ${plugin.description} ${plugin.type}`,
      providerSearch,
    ),
  )
  const filteredCapabilities = selectedPlugin
    ? selectedPlugin.capabilities.filter((capability) => {
        const definition = getProviderCapabilityDefinition(capability)
        return matchesSearch(
          `${capability} ${definition?.displayName ?? ""} ${definition?.description ?? ""}`,
          capabilitySearch,
        )
      })
    : []

  useEffect(() => {
    if (!open) {
      return
    }

    const providerType = editingProvider?.type ?? "github"
    const plugin = getProviderPlugin(providerType)
    setSelectedProviderType(providerType)
    setFieldValues(editingProvider?.settings ?? {})
    setSelectedCapabilities(
      [...(editingProvider?.enabledCapabilities ?? plugin?.capabilities ?? [])],
    )
    setProviderSearch("")
    setCapabilitySearch("")
    setError("")
  }, [editingProvider, open])

  function resetWizard() {
    setSelectedProviderType(editingProvider?.type ?? "github")
    setFieldValues(editingProvider?.settings ?? {})
    setSelectedCapabilities(
      [
        ...(editingProvider?.enabledCapabilities ??
          getProviderPlugin(editingProvider?.type ?? "github")?.capabilities ??
          []),
      ],
    )
    setProviderSearch("")
    setCapabilitySearch("")
    setError("")
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetWizard()
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedPlugin) {
      setError("Select a provider.")
      return
    }

    const missingField = selectedPlugin.fields.find(
      (field) => field.required && !fieldValues[field.key]?.trim(),
    )
    if (missingField) {
      setError(`${missingField.label} is required.`)
      return
    }

    if (selectedCapabilities.length === 0) {
      setError("Select at least one capability.")
      return
    }

    onSaveProvider({
      id: editingProvider?.id ?? createProviderId(),
      type: selectedPlugin.type,
      displayName: editingProvider?.displayName ?? selectedPlugin.label,
      settings: collectProviderSettings(selectedPlugin.fields, fieldValues),
      enabledCapabilities: selectedCapabilities,
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="grid max-h-[min(720px,calc(100vh-2rem))] max-w-[min(560px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
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
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Provider</h3>
                <Input
                  disabled={isEditing}
                  onChange={(event) => setProviderSearch(event.currentTarget.value)}
                  placeholder="Search providers..."
                  value={providerSearch}
                />
                <div className="themed-scrollbar grid max-h-[14.5rem] gap-2 overflow-y-auto pr-1">
                  {filteredProviderPlugins.length > 0 ? (
                    filteredProviderPlugins.map((plugin) => (
                      <ProviderOption
                        isSelected={selectedProviderType === plugin.type}
                        key={plugin.type}
                        onSelect={() => {
                          if (isEditing) {
                            return
                          }
                          setSelectedProviderType(plugin.type)
                          setSelectedCapabilities([...plugin.capabilities])
                          setCapabilitySearch("")
                          setFieldValues({})
                          setError("")
                        }}
                        plugin={plugin}
                        disabled={isEditing}
                      />
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      No providers match your search.
                    </p>
                  )}
                </div>
              </section>

              {selectedPlugin ? (
                <>
                  <section className="grid gap-3">
                    <h3 className="text-sm font-semibold">Capabilities</h3>
                    <Input
                      onChange={(event) =>
                        setCapabilitySearch(event.currentTarget.value)
                      }
                      placeholder="Search capabilities..."
                      value={capabilitySearch}
                    />
                    <div className="themed-scrollbar grid max-h-[14.5rem] gap-2 overflow-y-auto pr-1">
                      {filteredCapabilities.length > 0 ? (
                        filteredCapabilities.map((capability) => (
                          <CapabilityOption
                            capability={capability}
                            isSelected={selectedCapabilities.includes(capability)}
                            key={capability}
                            onToggle={() => {
                              setSelectedCapabilities((current) =>
                                toggleCapability(current, capability),
                              )
                              setError("")
                            }}
                          />
                        ))
                      ) : (
                        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                          No capabilities match your search.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <h3 className="text-sm font-semibold">Settings</h3>
                    {selectedPlugin.fields.map((field) => (
                      <ProviderFieldInput
                        field={field}
                        key={field.key}
                        onChange={(value) => {
                          setFieldValues((current) => ({
                            ...current,
                            [field.key]: value,
                          }))
                          setError("")
                        }}
                        value={fieldValues[field.key] ?? ""}
                      />
                    ))}
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
            <Button type="submit">
              {isEditing ? "Update provider" : "Save provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProviderOption({
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
      className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 data-[selected=true]:border-primary data-[selected=true]:bg-secondary"
      data-selected={isSelected}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <plugin.icon aria-hidden="true" className="mt-0.5 size-4" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{plugin.label}</span>
        <span className="block text-xs text-muted-foreground">
          {plugin.description}
        </span>
      </span>
    </button>
  )
}

function CapabilityOption({
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
    <label
      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
      htmlFor={`capability-${capability}`}
    >
      <Checkbox
        checked={isSelected}
        className="mt-0.5"
        id={`capability-${capability}`}
        onCheckedChange={onToggle}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">
          {definition?.displayName ?? capability}
        </span>
        <span className="block text-xs text-muted-foreground">
          {definition?.description ?? "Provider capability."}
        </span>
      </span>
    </label>
  )
}

function ProviderFieldInput({
  field,
  onChange,
  value,
}: {
  field: ProviderField
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{field.label}</span>
      <Input
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={field.placeholder}
        type={field.type}
        value={value}
      />
      {field.description ? (
        <span className="text-xs text-muted-foreground">
          {field.description}
        </span>
      ) : null}
    </label>
  )
}

function collectProviderSettings(
  fields: ProviderField[],
  fieldValues: Record<string, string>,
) {
  const settings: Record<string, string> = {}
  for (const field of fields) {
    settings[field.key] = fieldValues[field.key] ?? ""
  }
  return settings
}

function createProviderId() {
  return crypto.randomUUID?.() ?? `provider-${Date.now()}`
}

function toggleCapability(
  capabilities: ProviderCapability[],
  capability: ProviderCapability,
) {
  if (capabilities.includes(capability)) {
    return capabilities.filter((current) => current !== capability)
  }

  return [...capabilities, capability]
}

function getCapabilityDisplayName(capability: ProviderCapability) {
  return getProviderCapabilityDefinition(capability)?.displayName ?? capability
}

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase())
}

function GeneralSettings() {
  return (
    <div className="space-y-5">
      <SettingGroup
        description="Choose the app colour theme."
        title="Theme"
      >
        <ThemeSelector />
      </SettingGroup>
    </div>
  )
}

function SettingGroup({
  children,
  description,
  title,
}: {
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <section className="grid gap-3 border-b pb-5 last:border-b-0 last:pb-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}
