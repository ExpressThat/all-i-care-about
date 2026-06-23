import type { ProviderCapabilityForKinds } from "../capabilities";

export const atlassianProviderCapabilities = [
  "Issue",
] as const satisfies readonly ProviderCapabilityForKinds<["issue"]>[];
