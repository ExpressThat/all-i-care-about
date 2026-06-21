import type { DateTimeProviderField } from "@/lib/providers/providerTypes";
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings";
import { validateDateField } from "../date/validation";

export function validateTimeField(
  field: DateTimeProviderField,
  value: ProviderFieldFormValue,
) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (numberValue < 0 || numberValue >= 86_400_000) {
    return `${field.label} must be a valid time.`;
  }

  return validateDateField(field, value);
}
