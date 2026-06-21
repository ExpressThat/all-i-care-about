import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings";

export function numberInputValue(value: ProviderFieldFormValue | undefined) {
  return value === undefined ? "" : String(value);
}
