import type { ProviderCapability } from "../capabilities"

export const jiraProviderCapabilities = [
  "GetIssue",
] as const satisfies readonly ProviderCapability[]
