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
import type { ProviderCapability } from "./capabilities"
import type {
  ProviderCapabilityInput,
  ProviderCapabilityResult,
  ProviderCapabilityRunner,
  ProviderImplementationContext,
  ProviderImplementation,
} from "./contracts"
import type {
  ProviderInstance,
  ProviderPlugin,
  ProviderType,
} from "./providerTypes"
import { createProviderFetch } from "./providerHttp"
import { getNonSecretProviderSettings } from "./providerSettings"
import { jiraProviderImplementation, jiraProviderPlugin } from "./jira"

export const providerPlugins: ProviderPlugin[] = [
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
  keyof ProviderImplementationByType[Type] & ProviderCapability

validateProviderRegistry()

export function getProviderPlugin(type: ProviderType) {
  return providerPlugins.find((plugin) => plugin.type === type) ?? null
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
  if (!provider.enabledCapabilities.includes(capability)) {
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
      providerFetch: createProviderFetch(provider, plugin, settings),
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
    const implementation = providerImplementations[plugin.type] as Partial<
      Record<ProviderCapability, unknown>
    >
    const missingCapabilities = plugin.capabilities.filter(
      (capability) => !implementation?.[capability],
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
