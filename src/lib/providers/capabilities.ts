import type { ProviderPlugin } from "./providerTypes";

/** Provider domain that a capability belongs to. */
export type ProviderKind = "git" | "issue" | "logging";

export const providerCapabilityDefinitions = [
  {
    shortName: "PR",
    providerKind: "git",
    displayName: "Pull Requests",
    description: "Return pull request lists and pull request details.",
  },
  {
    shortName: "Issue",
    providerKind: "issue",
    displayName: "Issues",
    description: "Return issue details through the provider contract.",
  },
  {
    shortName: "Logs",
    providerKind: "logging",
    displayName: "Logs",
    description: "Return log entries through the provider contract.",
  },
] as const satisfies readonly {
  /** Stable short name persisted on provider instances. */
  shortName: string;
  /** Provider domain required for a provider to expose this capability. */
  providerKind: ProviderKind;
  /** Human-readable name shown in provider setup UI. */
  displayName: string;
  /** Short explanation of what the capability returns. */
  description: string;
}[];

/** Stable short name for a provider capability contract. */
export type ProviderCapability =
  (typeof providerCapabilityDefinitions)[number]["shortName"];

/** Human-facing metadata for a provider capability. */
export type ProviderCapabilityDefinition =
  (typeof providerCapabilityDefinitions)[number];

/** Capabilities whose definitions belong to one provider kind. */
export type ProviderCapabilityForKind<Kind extends ProviderKind> = Extract<
  ProviderCapabilityDefinition,
  { providerKind: Kind }
>["shortName"];

/** Capabilities whose definitions belong to one of several provider kinds. */
export type ProviderCapabilityForKinds<Kinds extends readonly ProviderKind[]> =
  ProviderCapabilityForKind<Kinds[number]>;

const providerCapabilities = providerCapabilityDefinitions.map(
  (capability) => capability.shortName,
);

export function isProviderCapability(
  value: unknown,
): value is ProviderCapability {
  return providerCapabilities.includes(value as ProviderCapability);
}

export function normalizeProviderCapability(
  value: unknown,
): ProviderCapability | null {
  if (isProviderCapability(value)) {
    return value;
  }

  return null;
}

export function getProviderCapabilityDefinition(
  capability: ProviderCapability,
) {
  return (
    providerCapabilityDefinitions.find(
      (definition) => definition.shortName === capability,
    ) ?? null
  );
}

export function getCapabilitiesForProviderKinds(
  providerKinds: readonly ProviderKind[],
) {
  return providerCapabilityDefinitions
    .filter((definition) => providerKinds.includes(definition.providerKind))
    .map((definition) => definition.shortName);
}

export function isCapabilityAllowedForProvider(
  plugin: ProviderPlugin,
  capability: ProviderCapability,
) {
  const definition = getProviderCapabilityDefinition(capability);
  return Boolean(
    definition && plugin.providerKinds.includes(definition.providerKind),
  );
}
