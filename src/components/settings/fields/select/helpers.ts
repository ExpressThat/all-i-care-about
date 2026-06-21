import type { SelectProviderField } from "@/lib/providers/providerTypes";

export function resolveSelectOptions(field: SelectProviderField) {
  return typeof field.options === "function" ? field.options() : field.options;
}
