import {
  getNestedProviderSettings,
  isEmptyFormValue,
} from "@/components/settings/fields";
import type { ProviderCapability } from "@/lib/providers/capabilities";
import {
  getFieldFormKey,
  type ProviderFieldFormValue,
} from "@/lib/providers/providerSettings";
import { getProviderAllowedOrigins } from "@/lib/providers/providerSettings";
import type {
  ProviderField,
  ProviderInstance,
  ProviderPlugin,
  ProviderSettingValue,
} from "@/lib/providers/providerTypes";

export function createProviderId() {
  return crypto.randomUUID?.() ?? `provider-${Date.now()}`;
}

export function toggleCapability(
  capabilities: ProviderCapability[],
  capability: ProviderCapability,
) {
  if (capabilities.includes(capability)) {
    return capabilities.filter((current) => current !== capability);
  }

  return [...capabilities, capability];
}

export function toggleRevealedField(fields: Set<string>, fieldKey: string) {
  const nextFields = new Set(fields);
  if (nextFields.has(fieldKey)) {
    nextFields.delete(fieldKey);
  } else {
    nextFields.add(fieldKey);
  }
  return nextFields;
}

export function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

export function shouldWarnBeforeProviderSave({
  editingProvider,
  fieldValues,
  plugin,
  provider,
}: {
  editingProvider: ProviderInstance | null;
  fieldValues: Record<string, ProviderFieldFormValue>;
  plugin: ProviderPlugin;
  provider: ProviderInstance;
}) {
  if (!editingProvider) {
    return false;
  }

  const previousOrigins = getProviderAllowedOrigins(
    plugin,
    editingProvider.settings,
  );
  const nextOrigins = getProviderAllowedOrigins(plugin, provider.settings);

  if (previousOrigins.join("\n") === nextOrigins.join("\n")) {
    return false;
  }

  return hasExistingSecretWithoutReplacement({
    fieldValues,
    fields: plugin.fields,
    settings: editingProvider.settings,
    path: [],
  });
}

function hasExistingSecretWithoutReplacement({
  fieldValues,
  fields,
  path,
  settings,
}: {
  fieldValues: Record<string, ProviderFieldFormValue>;
  fields: readonly ProviderField[];
  path: string[];
  settings: Record<string, ProviderSettingValue> | undefined;
}) {
  for (const field of fields) {
    if (field.type === "group") {
      if (
        hasExistingSecretWithoutReplacement({
          fieldValues,
          fields: field.fields,
          path: [...path, field.key],
          settings: getNestedProviderSettings(settings, field.key),
        })
      ) {
        return true;
      }
      continue;
    }

    if (!field.secret) {
      continue;
    }

    const hasExistingSecret =
      typeof settings?.[field.key] === "string" && settings[field.key] !== "";
    const hasReplacement = !isEmptyFormValue(
      fieldValues[getFieldFormKey(path, field.key)],
    );

    if (hasExistingSecret && !hasReplacement) {
      return true;
    }
  }

  return false;
}
