/** Stable short name for a provider capability contract. */
export type ProviderCapability = "GetPR" | "GetIssue"

/** Human-facing metadata for a provider capability. */
export type ProviderCapabilityDefinition = {
  /** Stable short name persisted on provider instances. */
  shortName: ProviderCapability
  /** Human-readable name shown in provider setup UI. */
  displayName: string
  /** Short explanation of what the capability returns. */
  description: string
}

export const providerCapabilityDefinitions: ProviderCapabilityDefinition[] = [
  {
    shortName: "GetPR",
    displayName: "Get PR",
    description: "Return pull request details through the provider contract.",
  },
  {
    shortName: "GetIssue",
    displayName: "Get Issue",
    description: "Return issue details through the provider contract.",
  },
]

const providerCapabilities = providerCapabilityDefinitions.map(
  (capability) => capability.shortName,
)

export function isProviderCapability(
  value: unknown,
): value is ProviderCapability {
  return providerCapabilities.includes(value as ProviderCapability)
}

export function getProviderCapabilityDefinition(
  capability: ProviderCapability,
) {
  return (
    providerCapabilityDefinitions.find(
      (definition) => definition.shortName === capability,
    ) ?? null
  )
}
