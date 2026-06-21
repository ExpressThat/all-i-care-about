import type { ProviderField } from "@/lib/providers/providerTypes";

export function validateBooleanField(field: ProviderField, value: unknown) {
  return typeof value === "boolean" ? "" : `${field.label} must be on or off.`;
}
