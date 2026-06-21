import type {
  ProviderField,
  ProviderSettingValue,
} from "@/lib/providers/providerTypes";
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings";

export function isEmptyFormValue(value: ProviderFieldFormValue | undefined) {
  return value === undefined || value === "";
}

export function getNestedProviderSettings(
  settings: Record<string, ProviderSettingValue> | undefined,
  key: string,
) {
  const value = settings?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value;
}

export function getFieldLayoutClassName(field: ProviderField) {
  return field.type === "textarea" || field.type === "secret"
    ? "md:col-span-2"
    : undefined;
}
