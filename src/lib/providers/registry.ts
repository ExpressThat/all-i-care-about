import {
  githubProviderImplementation,
  githubProviderPlugin,
} from "./github"
import { useMemo } from "react"
import {
  getSetting,
  initSettingsStore,
  useSettingSelector,
} from "@/lib/settings/settingsStore"
import {
  getCapabilityForImplementation,
  getCapabilitiesForProviderKinds,
  getImplementationsForCapability,
  isCapabilityAllowedForProvider,
  type ProviderCapabilityImplementation,
} from "./capabilities"
import type {
  ProviderCapabilityInput,
  ProviderCapabilityResult,
  ProviderCapabilityRunner,
  ProviderImplementationContext,
  ProviderImplementation,
} from "./contracts"
import type {
  ProviderInstance,
  KnownProviderPlugin,
  ProviderPluginForType,
  ProviderType,
} from "./providerTypes"
import { createProviderFetch } from "./providerHttp"
import { getNonSecretProviderSettings } from "./providerSettings"
import { jiraProviderImplementation, jiraProviderPlugin } from "./jira"

export const providerPlugins: KnownProviderPlugin[] = [
  githubProviderPlugin,
  jiraProviderPlugin,
]

const providerImplementations = {
  github: githubProviderImplementation,
  jira: jiraProviderImplementation,
} satisfies {
  github: ProviderImplementation<"github">
  jira: ProviderImplementation<"jira">
}

type ProviderImplementationByType = typeof providerImplementations
type ProviderCapabilityForType<Type extends ProviderType> =
  Extract<
    ProviderCapabilityImplementation,
    keyof ProviderImplementationByType[Type] &
      ProviderCapabilityImplementation
  > extends infer Implementation
    ? Implementation extends ProviderCapabilityImplementation
      ? GetCapabilityForImplementationType<Implementation> extends ProviderPluginForType<Type>["capabilities"][number]
        ? Implementation
        : never
      : never
    : never

type GetCapabilityForImplementationType<
  Implementation extends ProviderCapabilityImplementation,
> = {
  GetPR: "PR"
  GetPRs: "PR"
  GetIssue: "Issue"
}[Implementation]

validateProviderRegistry()

export function getProviderPlugin<Type extends ProviderType>(
  type: Type,
): ProviderPluginForType<Type> | null {
  return (
    providerPlugins.find(
      (plugin): plugin is ProviderPluginForType<Type> =>
        plugin.type === type,
    ) ?? null
  )
}

export async function getProvider<Type extends ProviderType>(
  type: Type,
): Promise<ProviderInstance<Type> | null> {
  await initSettingsStore()
  return findProviderByType(getSetting("Providers"), type)
}

export function useProvider<Type extends ProviderType>(
  type: Type,
): ProviderInstance<Type> | null {
  return useSettingSelector("Providers", (providers) =>
    findProviderByType(providers, type),
  )
}

export function useProviderImp<
  Type extends ProviderType,
  Capability extends ProviderCapabilityForType<Type>,
>(
  type: Type,
  capability: Capability,
): ProviderCapabilityRunner<Capability> | null {
  const provider = useProvider(type)

  return useMemo(() => {
    if (!provider) {
      return null
    }

    return getProviderCapabilityImplementation(provider, capability)
  }, [capability, provider])
}

export function getProviderCapabilityImplementation<
  Type extends ProviderType,
  Capability extends ProviderCapabilityForType<Type>,
>(
  provider: ProviderInstance<Type>,
  capability: Capability,
): ProviderCapabilityRunner<Capability> | null {
  const capabilityGroup = getCapabilityForImplementation(capability)
  if (!capabilityGroup || !provider.enabledCapabilities.includes(capabilityGroup)) {
    return null
  }

  const implementation = providerImplementations[provider.type]?.[capability]
  const plugin = getProviderPlugin(provider.type)

  if (!implementation || !plugin) {
    return null
  }

  const runImplementation =
    implementation as unknown as (
      input: ProviderCapabilityInput<Capability>,
      context: ProviderImplementationContext<Type>,
    ) => ProviderCapabilityResult<Capability>
  const settings = getNonSecretProviderSettings<Type>(
    provider.settings,
    plugin.fields,
  )

  return ((input: ProviderCapabilityInput<Capability>) =>
    runImplementation(input, {
      settings,
      providerFetch: createProviderFetch(provider),
    })) as ProviderCapabilityRunner<Capability>
}

export function runProviderCapability<
  Type extends ProviderType,
  Capability extends ProviderCapabilityForType<Type>,
>(
  provider: ProviderInstance<Type>,
  capability: Capability,
  input: ProviderCapabilityInput<Capability>,
): ProviderCapabilityResult<Capability> {
  const implementation = getProviderCapabilityImplementation(
    provider,
    capability,
  )

  if (!implementation) {
    throw new Error(
      `Provider "${provider.displayName}" does not have "${capability}" enabled.`,
    )
  }

  return implementation(input)
}

function validateProviderRegistry() {
  for (const plugin of providerPlugins) {
    const invalidKindCapabilities = plugin.capabilities.filter(
      (capability) => !isCapabilityAllowedForProvider(plugin, capability),
    )

    if (invalidKindCapabilities.length > 0) {
      throw new Error(
        `Provider "${plugin.type}" declares capabilities outside its provider kinds: ${invalidKindCapabilities.join(", ")}`,
      )
    }

    const allowedCapabilities = getCapabilitiesForProviderKinds(
      plugin.providerKinds,
    )
    const unknownKindCapabilities = plugin.capabilities.filter(
      (capability) => !allowedCapabilities.includes(capability),
    )

    if (unknownKindCapabilities.length > 0) {
      throw new Error(
        `Provider "${plugin.type}" declares unsupported capabilities: ${unknownKindCapabilities.join(", ")}`,
      )
    }

    const implementation = providerImplementations[plugin.type] as Partial<
      Record<ProviderCapabilityImplementation, unknown>
    >
    const missingCapabilities = plugin.capabilities.flatMap((capability) =>
      getImplementationsForCapability(capability).filter(
        (implementationName) => !implementation?.[implementationName],
      ),
    )

    if (missingCapabilities.length > 0) {
      throw new Error(
        `Provider "${plugin.type}" is missing implementations for: ${missingCapabilities.join(", ")}`,
      )
    }
  }
}

function findProviderByType<Type extends ProviderType>(
  providers: ProviderInstance[],
  type: Type,
): ProviderInstance<Type> | null {
  return (
    providers.find(
      (provider): provider is ProviderInstance<Type> => provider.type === type,
    ) ?? null
  )
}
