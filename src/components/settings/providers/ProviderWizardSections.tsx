import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  getProviderCapabilityDefinition,
  isCapabilityAllowedForProvider,
  type ProviderCapability,
} from "@/lib/providers/capabilities";
import type {
  ProviderInstance,
  ProviderPlugin,
  ProviderType,
} from "@/lib/providers/providerTypes";
import { CapabilityOption, ProviderOption } from "./ProviderWizardOptions";
import { matchesSearch } from "./wizardHelpers";

export function ProviderPicker({
  disabled,
  onProviderSearchChange,
  onSelectProvider,
  providerPlugins,
  providerSearch,
  selectedProviderType,
}: {
  disabled: boolean;
  onProviderSearchChange: (value: string) => void;
  onSelectProvider: (plugin: ProviderPlugin) => void;
  providerPlugins: ProviderPlugin[];
  providerSearch: string;
  selectedProviderType: ProviderType;
}) {
  const filteredProviderPlugins = providerPlugins.filter((plugin) =>
    matchesSearch(
      `${plugin.label} ${plugin.description} ${plugin.type} ${plugin.providerKinds.join(" ")}`,
      providerSearch,
    ),
  );

  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">Provider</h3>
      <Input
        disabled={disabled}
        onChange={(event) => onProviderSearchChange(event.currentTarget.value)}
        placeholder="Search providers..."
        value={providerSearch}
      />
      <div className="themed-scrollbar grid max-h-44 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 overflow-y-auto pr-1">
        {filteredProviderPlugins.length > 0 ? (
          filteredProviderPlugins.map((plugin) => (
            <ProviderOption
              disabled={disabled}
              isSelected={selectedProviderType === plugin.type}
              key={plugin.type}
              onSelect={() => onSelectProvider(plugin)}
              plugin={plugin}
            />
          ))
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No providers match your search.
          </p>
        )}
      </div>
    </section>
  );
}

export function CapabilityPicker({
  capabilitySearch,
  onCapabilitySearchChange,
  onToggleCapability,
  plugin,
  selectedCapabilities,
}: {
  capabilitySearch: string;
  onCapabilitySearchChange: (value: string) => void;
  onToggleCapability: (capability: ProviderCapability) => void;
  plugin: ProviderPlugin;
  selectedCapabilities: ProviderCapability[];
}) {
  const filteredCapabilities = plugin.capabilities.filter((capability) => {
    if (!isCapabilityAllowedForProvider(plugin, capability)) {
      return false;
    }

    const definition = getProviderCapabilityDefinition(capability);
    return matchesSearch(
      `${capability} ${definition?.providerKind ?? ""} ${definition?.displayName ?? ""} ${definition?.description ?? ""}`,
      capabilitySearch,
    );
  });

  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold">Capabilities</h3>
      <Input
        onChange={(event) =>
          onCapabilitySearchChange(event.currentTarget.value)
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
              onToggle={() => onToggleCapability(capability)}
            />
          ))
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No capabilities match your search.
          </p>
        )}
      </div>
    </section>
  );
}

export function ProviderSecretClearWarning({
  isSaving,
  onCancel,
  onConfirm,
  pendingProviderSave,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (provider: ProviderInstance) => void;
  pendingProviderSave: ProviderInstance | null;
}) {
  return (
    <AlertDialog
      open={pendingProviderSave !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear saved provider secrets?</AlertDialogTitle>
          <AlertDialogDescription>
            This change updates the allowed request origin for the provider.
            Saved secrets that were not re-entered will be cleared when you
            save.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSaving}
            onClick={() => {
              if (pendingProviderSave) {
                onConfirm(pendingProviderSave);
              }
            }}
          >
            {isSaving ? "Saving..." : "Clear and save"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
