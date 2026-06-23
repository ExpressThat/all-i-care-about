import type { ProviderCapabilityForKinds } from "../capabilities";

export const openSearchProviderCapabilities = [
  "Logs",
] as const satisfies readonly ProviderCapabilityForKinds<["logging"]>[];
