import type { ProviderCapability } from "../capabilities"

export const githubProviderCapabilities = [
  "GetPR",
  "GetIssue",
] as const satisfies readonly ProviderCapability[]
