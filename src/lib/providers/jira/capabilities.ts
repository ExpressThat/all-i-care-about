import type { ProviderCapabilityForKinds } from "../capabilities";

export const jiraProviderCapabilities = [
  "Issue",
] as const satisfies readonly ProviderCapabilityForKinds<["issue"]>[];
