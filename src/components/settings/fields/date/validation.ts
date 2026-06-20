import type { DateTimeProviderField } from "@/lib/providers/providerTypes"
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"

export function validateDateField(
  field: DateTimeProviderField,
  value: ProviderFieldFormValue,
) {
  const numberValue = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numberValue)) {
    return `${field.label} must be a valid ${field.type}.`
  }

  if (field.min !== undefined && numberValue < field.min) {
    return `${field.label} is before the minimum allowed value.`
  }

  if (field.max !== undefined && numberValue > field.max) {
    return `${field.label} is after the maximum allowed value.`
  }

  return ""
}
