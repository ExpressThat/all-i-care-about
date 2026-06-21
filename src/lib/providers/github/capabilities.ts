import type { ProviderCapabilityForKinds } from "../capabilities"

export const githubProviderCapabilities = [
  "PR",
  "Issue",
] as const satisfies readonly ProviderCapabilityForKinds<["git", "issue"]>[]
