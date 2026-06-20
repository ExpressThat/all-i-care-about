import type { SelectProviderField } from "@/lib/providers/providerTypes"
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"
import { resolveSelectOptions } from "./helpers"

export async function validateSelectField(
  field: SelectProviderField,
  value: ProviderFieldFormValue,
) {
  const options = await resolveSelectOptions(field)
  return options.some((option) => option.value === value)
    ? ""
    : `${field.label} must be one of the available options.`
}
