import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { CalendarIcon, Eye, EyeOff, Pencil, Plus, Settings, Trash2, Workflow } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getProviderPlugin, providerPlugins } from "@/lib/providers/registry"
import {
  getProviderCapabilityDefinition,
  type ProviderCapability,
} from "@/lib/providers/capabilities"
import type {
  DateTimeProviderField,
  ProviderField,
  ProviderSelectOption,
  ProviderInstance,
  ProviderPlugin,
  ProviderSettingValue,
  ProviderType,
  SecretProviderField,
  SelectProviderField,
  TextProviderField,
} from "@/lib/providers/providerTypes"
import {
  collectPersistedProviderSettings,
  type ProviderFieldFormValue,
  getFieldFormKey,
  getEditableProviderFieldValues,
} from "@/lib/providers/providerSettings"
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

  async function saveProvider(provider: ProviderInstance) {
    const existingProviderIndex = providers.findIndex(
      (currentProvider) => currentProvider.id === provider.id,
    )

    if (existingProviderIndex === -1) {
      await setSetting("Providers", [...providers, provider])
      return
    }

    const nextProviders = [...providers]
    nextProviders[existingProviderIndex] = provider
    await setSetting("Providers", nextProviders)
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
  onSaveProvider: (provider: ProviderInstance) => Promise<void>
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
      await onSaveProvider({
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
      })
      handleOpenChange(false)
    } catch (saveError) {
      console.error("Failed to save provider.", saveError)
      setError("Failed to save provider.")
      setIsSaving(false)
    }
  }

  return (
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
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Provider</h3>
                <Input
                  disabled={isEditing}
                  onChange={(event) => setProviderSearch(event.currentTarget.value)}
                  placeholder="Search providers..."
                  value={providerSearch}
                />
                <div className="themed-scrollbar grid max-h-44 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 overflow-y-auto pr-1">
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
                          setFieldValues(getEditableProviderFieldValues(plugin, {}))
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
                    <div className="themed-scrollbar grid max-h-44 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 overflow-y-auto pr-1">
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
      className="flex min-h-18 items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 data-[selected=true]:border-primary data-[selected=true]:bg-secondary"
      data-selected={isSelected}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <plugin.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{plugin.label}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
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
      className="flex min-h-18 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
      htmlFor={`capability-${capability}`}
    >
      <Checkbox
        checked={isSelected}
        className="mt-0.5 shrink-0"
        id={`capability-${capability}`}
        onCheckedChange={onToggle}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">
          {definition?.displayName ?? capability}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
          {definition?.description ?? "Provider capability."}
        </span>
      </span>
    </label>
  )
}

function ProviderFieldsEditor({
  fieldValues,
  fields,
  onChange,
  onToggleReveal,
  path,
  revealedFields,
}: {
  fieldValues: Record<string, ProviderFieldFormValue>
  fields: readonly ProviderField[]
  onChange: (fieldKey: string, value: ProviderFieldFormValue) => void
  onToggleReveal: (fieldKey: string) => void
  path: string[]
  revealedFields: Set<string>
}) {
  const defaultOpenGroups = fields
    .filter((field) => field.type === "group" && field.defaultOpen)
    .map((field) => getFieldFormKey(path, field.key))

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {fields.map((field) => {
        const fieldKey = getFieldFormKey(path, field.key)

        if (field.type === "group") {
          return (
            <Accordion
              className="md:col-span-2"
              defaultValue={defaultOpenGroups}
              key={fieldKey}
              type="multiple"
            >
              <AccordionItem value={fieldKey}>
                <AccordionTrigger>
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold">
                      {field.label}
                    </span>
                    {field.description ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {field.description}
                      </span>
                    ) : null}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ProviderFieldsEditor
                    fieldValues={fieldValues}
                    fields={field.fields}
                    onChange={onChange}
                    onToggleReveal={onToggleReveal}
                    path={[...path, field.key]}
                    revealedFields={revealedFields}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )
        }

        return (
          <ProviderFieldInput
            className={getFieldLayoutClassName(field)}
            field={field}
            fieldKey={fieldKey}
            isRevealed={revealedFields.has(fieldKey)}
            key={fieldKey}
            onChange={(value) => onChange(fieldKey, value)}
            onToggleReveal={() => onToggleReveal(fieldKey)}
            showRevealButton={Boolean(field.secret)}
            value={fieldValues[fieldKey]}
          />
        )
      })}
    </div>
  )
}

function ProviderFieldInput({
  className,
  field,
  fieldKey,
  isRevealed,
  onChange,
  onToggleReveal,
  showRevealButton,
  value,
}: {
  className?: string
  field: ProviderField
  fieldKey: string
  isRevealed: boolean
  onChange: (value: ProviderFieldFormValue) => void
  onToggleReveal: () => void
  showRevealButton: boolean
  value: ProviderFieldFormValue | undefined
}) {
  const inputType = getInputType(field, isRevealed)
  const fieldId = `provider-field-${fieldKey.split(".").join("-")}`
  const descriptionId = `${fieldId}-description`

  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium" htmlFor={fieldId}>
        {field.label}
      </label>
      <ProviderFieldControl
        descriptionId={field.description ? descriptionId : undefined}
        field={field}
        fieldId={fieldId}
        inputType={inputType}
        isRevealed={isRevealed}
        onChange={onChange}
        onToggleReveal={onToggleReveal}
        showRevealButton={showRevealButton}
        value={value}
      />
      {field.description ? (
        <span className="text-xs text-muted-foreground" id={descriptionId}>
          {field.description}
        </span>
      ) : null}
    </div>
  )
}

function ProviderFieldControl({
  descriptionId,
  field,
  fieldId,
  inputType,
  isRevealed,
  onChange,
  onToggleReveal,
  showRevealButton,
  value,
}: {
  descriptionId?: string
  field: ProviderField
  fieldId: string
  inputType: string
  isRevealed: boolean
  onChange: (value: ProviderFieldFormValue) => void
  onToggleReveal: () => void
  showRevealButton: boolean
  value: ProviderFieldFormValue | undefined
}) {
  if (field.type === "textarea") {
    return (
      <Textarea
        aria-describedby={descriptionId}
        id={fieldId}
        maxLength={field.maxLength}
        minLength={field.minLength}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={field.placeholder}
        value={stringFieldValue(value)}
      />
    )
  }

  if (field.type === "boolean") {
    return (
      <div className="flex h-8 items-center">
        <Switch
          aria-describedby={descriptionId}
          id={fieldId}
          checked={value === true}
          onCheckedChange={onChange}
        />
      </div>
    )
  }

  if (field.type === "select") {
    return (
      <ProviderSelectField
        ariaDescribedBy={descriptionId}
        field={field}
        fieldId={fieldId}
        onChange={onChange}
        value={stringFieldValue(value)}
      />
    )
  }

  if (field.type === "date") {
    return (
      <DateFieldControl
        ariaDescribedBy={descriptionId}
        field={field}
        fieldId={fieldId}
        onChange={onChange}
        value={numberFieldValue(value)}
      />
    )
  }

  if (field.type === "time") {
    return (
      <Input
        aria-describedby={descriptionId}
        id={fieldId}
        max={field.max !== undefined ? timeInputValue(field.max) : undefined}
        min={field.min !== undefined ? timeInputValue(field.min) : undefined}
        onChange={(event) =>
          onChange(timeValueFromInput(event.currentTarget.value) ?? "")
        }
        type="time"
        value={value === undefined ? "" : timeInputValue(numberFieldValue(value))}
      />
    )
  }

  if (field.type === "datetime") {
    return (
      <DateTimeFieldControl
        ariaDescribedBy={descriptionId}
        field={field}
        fieldId={fieldId}
        onChange={onChange}
        value={numberFieldValue(value)}
      />
    )
  }

  return (
    <div className="relative">
      <Input
        aria-describedby={descriptionId}
        className={showRevealButton ? "pr-9" : undefined}
        id={fieldId}
        max={field.type === "number" ? field.max : undefined}
        maxLength={"maxLength" in field ? field.maxLength : undefined}
        min={field.type === "number" ? field.min : undefined}
        minLength={"minLength" in field ? field.minLength : undefined}
        onChange={(event) => {
          const nextValue = event.currentTarget.value
          onChange(field.type === "number" && nextValue ? Number(nextValue) : nextValue)
        }}
        pattern={"pattern" in field ? field.pattern : undefined}
        placeholder={field.placeholder}
        step={field.type === "number" ? field.step : undefined}
        type={inputType}
        value={stringFieldValue(value)}
      />
      {showRevealButton ? (
        <Button
          aria-label={isRevealed ? `Hide ${field.label}` : `Reveal ${field.label}`}
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={onToggleReveal}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          {isRevealed ? (
            <EyeOff aria-hidden="true" className="size-3.5" />
          ) : (
            <Eye aria-hidden="true" className="size-3.5" />
          )}
        </Button>
      ) : null}
    </div>
  )
}

function ProviderSelectField({
  ariaDescribedBy,
  field,
  fieldId,
  onChange,
  value,
}: {
  ariaDescribedBy?: string
  field: SelectProviderField
  fieldId: string
  onChange: (value: ProviderFieldFormValue) => void
  value: string
}) {
  const [options, setOptions] = useState<readonly ProviderSelectOption[]>([])
  const [state, setState] = useState<"idle" | "loading" | "error">("idle")

  useEffect(() => {
    let isMounted = true
    setState("loading")

    Promise.resolve(resolveSelectOptions(field))
      .then((nextOptions) => {
        if (!isMounted) {
          return
        }
        setOptions(nextOptions)
        setState("idle")
      })
      .catch((error: unknown) => {
        console.error(`Failed to load options for "${field.key}".`, error)
        if (isMounted) {
          setOptions([])
          setState("error")
        }
      })

    return () => {
      isMounted = false
    }
  }, [field])

  return (
    <div className="grid gap-1">
      <Select
        disabled={state !== "idle" || options.length === 0}
        onValueChange={onChange}
        value={value}
      >
        <SelectTrigger
          aria-describedby={ariaDescribedBy}
          className="w-full"
          id={fieldId}
        >
          <SelectValue placeholder={field.placeholder ?? "Select an option"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {state === "loading" ? (
        <span className="text-xs text-muted-foreground">Loading options...</span>
      ) : null}
      {state === "error" ? (
        <span className="text-xs text-destructive">Failed to load options.</span>
      ) : null}
    </div>
  )
}

function DateFieldControl({
  ariaDescribedBy,
  field,
  fieldId,
  onChange,
  value,
}: {
  ariaDescribedBy?: string
  field: DateTimeProviderField
  fieldId: string
  onChange: (value: ProviderFieldFormValue) => void
  value: number | undefined
}) {
  const selectedDate = value === undefined ? undefined : new Date(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-describedby={ariaDescribedBy}
          className="w-full justify-start"
          id={fieldId}
          type="button"
          variant="outline"
        >
          <CalendarIcon aria-hidden="true" className="size-4" />
          {selectedDate ? formatDate(selectedDate) : field.placeholder ?? "Select date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          disabled={(date) => isDateDisabled(date, field)}
          mode="single"
          onSelect={(date) =>
            onChange(date ? startOfDayTimestamp(date) : "")
          }
          selected={selectedDate}
        />
      </PopoverContent>
    </Popover>
  )
}

function DateTimeFieldControl({
  ariaDescribedBy,
  field,
  fieldId,
  onChange,
  value,
}: {
  ariaDescribedBy?: string
  field: DateTimeProviderField
  fieldId: string
  onChange: (value: ProviderFieldFormValue) => void
  value: number | undefined
}) {
  const selectedDate = value === undefined ? undefined : new Date(value)
  const timeValue = value === undefined ? "" : timeInputValue(timePart(value))

  function updateDate(date: Date | undefined) {
    if (!date) {
      onChange("")
      return
    }

    const nextTime = value === undefined ? 0 : timePart(value)
    onChange(startOfDayTimestamp(date) + nextTime)
  }

  function updateTime(nextTime: string) {
    const parsedTime = timeValueFromInput(nextTime)
    if (parsedTime === undefined) {
      onChange(value === undefined ? "" : startOfDayTimestamp(new Date(value)))
      return
    }

    const nextDate =
      value === undefined ? startOfDayTimestamp(new Date()) : startOfDayTimestamp(new Date(value))
    onChange(nextDate + parsedTime)
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,16rem)_7.5rem]">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            aria-describedby={ariaDescribedBy}
            className="w-full justify-start"
            id={fieldId}
            type="button"
            variant="outline"
          >
            <CalendarIcon aria-hidden="true" className="size-4" />
            {selectedDate ? formatDate(selectedDate) : field.placeholder ?? "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            disabled={(date) => isDateDisabled(date, field)}
            mode="single"
            onSelect={updateDate}
            selected={selectedDate}
          />
        </PopoverContent>
      </Popover>
      <Input
        aria-label={`${field.label} time`}
        max={field.max !== undefined ? timeInputValue(timePart(field.max)) : undefined}
        min={field.min !== undefined ? timeInputValue(timePart(field.min)) : undefined}
        onChange={(event) => updateTime(event.currentTarget.value)}
        type="time"
        value={timeValue}
      />
    </div>
  )
}

async function validateProviderFieldValues({
  existingSettings,
  fieldValues,
  fields,
  isEditing,
  path = [],
}: {
  existingSettings?: Record<string, ProviderSettingValue>
  fieldValues: Record<string, ProviderFieldFormValue>
  fields: readonly ProviderField[]
  isEditing: boolean
  path?: string[]
}): Promise<string> {
  for (const field of fields) {
    if (field.type === "group") {
      const validationError: string = await validateProviderFieldValues({
        existingSettings: getNestedProviderSettings(existingSettings, field.key),
        fieldValues,
        fields: field.fields,
        isEditing,
        path: [...path, field.key],
      })

      if (validationError) {
        return validationError
      }
      continue
    }

    const fieldKey = getFieldFormKey(path, field.key)
    const value = fieldValues[fieldKey]
    const hasExistingSecret =
      field.secret &&
      isEditing &&
      typeof existingSettings?.[field.key] === "string" &&
      existingSettings[field.key] !== ""

    if (field.required && isEmptyFormValue(value) && !hasExistingSecret) {
      return `${field.label} is required.`
    }

    if (isEmptyFormValue(value)) {
      continue
    }

    const validationError = await validateProviderFieldValue(field, value)
    if (validationError) {
      return validationError
    }
  }

  return ""
}

async function validateProviderFieldValue(
  field: ProviderField,
  value: ProviderFieldFormValue,
) {
  switch (field.type) {
    case "email":
      return isValidEmail(String(value)) ? "" : `${field.label} must be a valid email.`
    case "url":
      return isValidUrl(String(value)) ? "" : `${field.label} must be a valid URL.`
    case "text":
    case "textarea":
    case "secret":
      return validateTextLikeField(field, String(value))
    case "number":
      return validateNumberField(field, value)
    case "date":
    case "time":
    case "datetime":
      return validateDateTimeField(field, value)
    case "select": {
      const options = await resolveSelectOptions(field)
      return options.some((option) => option.value === value)
        ? ""
        : `${field.label} must be one of the available options.`
    }
    case "boolean":
      return typeof value === "boolean" ? "" : `${field.label} must be on or off.`
  }
}

function validateTextLikeField(
  field: TextProviderField | SecretProviderField,
  value: string,
) {
  const minLength =
    "minLength" in field && typeof field.minLength === "number"
      ? field.minLength
      : undefined
  const maxLength =
    "maxLength" in field && typeof field.maxLength === "number"
      ? field.maxLength
      : undefined
  const pattern =
    "pattern" in field && typeof field.pattern === "string"
      ? field.pattern
      : undefined

  if (minLength !== undefined && value.length < minLength) {
    return `${field.label} must be at least ${minLength} characters.`
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return `${field.label} must be at most ${maxLength} characters.`
  }

  if (pattern && !new RegExp(pattern).test(value)) {
    return `${field.label} is not in the expected format.`
  }

  return ""
}

function validateNumberField(
  field: Extract<ProviderField, { type: "number" }>,
  value: ProviderFieldFormValue,
) {
  const numberValue = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numberValue)) {
    return `${field.label} must be a number.`
  }

  if (field.integer && !Number.isInteger(numberValue)) {
    return `${field.label} must be a whole number.`
  }

  if (field.min !== undefined && numberValue < field.min) {
    return `${field.label} must be at least ${field.min}.`
  }

  if (field.max !== undefined && numberValue > field.max) {
    return `${field.label} must be at most ${field.max}.`
  }

  return ""
}

function validateDateTimeField(
  field: Extract<ProviderField, { type: "date" | "time" | "datetime" }>,
  value: ProviderFieldFormValue,
) {
  const numberValue = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numberValue)) {
    return `${field.label} must be a valid ${field.type}.`
  }

  if (field.type === "time" && (numberValue < 0 || numberValue >= 86_400_000)) {
    return `${field.label} must be a valid time.`
  }

  if (field.min !== undefined && numberValue < field.min) {
    return `${field.label} is before the minimum allowed value.`
  }

  if (field.max !== undefined && numberValue > field.max) {
    return `${field.label} is after the maximum allowed value.`
  }

  return ""
}

function resolveSelectOptions(field: SelectProviderField) {
  return typeof field.options === "function" ? field.options() : field.options
}

function getInputType(field: ProviderField, isRevealed: boolean) {
  if (field.type === "secret") {
    return isRevealed ? "text" : "password"
  }

  if (field.type === "url" || field.type === "email" || field.type === "number") {
    return field.type
  }

  return "text"
}

function stringFieldValue(value: ProviderFieldFormValue | undefined) {
  return value === undefined ? "" : String(value)
}

function numberFieldValue(value: ProviderFieldFormValue | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function isEmptyFormValue(value: ProviderFieldFormValue | undefined) {
  return value === undefined || value === ""
}

function getNestedProviderSettings(
  settings: Record<string, ProviderSettingValue> | undefined,
  key: string,
) {
  const value = settings?.[key]
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  return value
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date)
}

function startOfDayTimestamp(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function timePart(timestamp: number) {
  const date = new Date(timestamp)
  return (
    date.getHours() * 3_600_000 +
    date.getMinutes() * 60_000 +
    date.getSeconds() * 1_000
  )
}

function timeInputValue(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return ""
  }

  const hours = Math.floor(value / 3_600_000)
  const minutes = Math.floor((value % 3_600_000) / 60_000)

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function timeValueFromInput(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined
  }

  return hours * 3_600_000 + minutes * 60_000
}

function isDateDisabled(
  date: Date,
  field: DateTimeProviderField,
) {
  const timestamp = startOfDayTimestamp(date)
  return (
    (field.min !== undefined && timestamp < startOfDayTimestamp(new Date(field.min))) ||
    (field.max !== undefined && timestamp > startOfDayTimestamp(new Date(field.max)))
  )
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

function toggleRevealedField(fields: Set<string>, fieldKey: string) {
  const nextFields = new Set(fields)
  if (nextFields.has(fieldKey)) {
    nextFields.delete(fieldKey)
  } else {
    nextFields.add(fieldKey)
  }
  return nextFields
}

function getFieldLayoutClassName(field: ProviderField) {
  if (
    field.type === "textarea" ||
    field.type === "secret"
  ) {
    return "md:col-span-2"
  }

  return undefined
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
