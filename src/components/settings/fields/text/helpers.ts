import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings";
import type { ProviderField } from "@/lib/providers/providerTypes";

export function stringFieldValue(value: ProviderFieldFormValue | undefined) {
  return value === undefined ? "" : String(value);
}

export function getTextInputType(field: ProviderField, isRevealed: boolean) {
  if (field.type === "secret") {
    return isRevealed ? "text" : "password";
  }

  if (field.type === "url" || field.type === "email") {
    return field.type;
  }

  return "text";
}
