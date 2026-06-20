import type { ProviderField } from "@/lib/providers/providerTypes"
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"

export function validateNumberField(
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
