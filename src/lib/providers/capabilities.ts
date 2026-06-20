export type ProviderCapability = "GetPR" | "GetIssue"

export type ProviderCapabilityDefinition = {
  shortName: ProviderCapability
  displayName: string
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
