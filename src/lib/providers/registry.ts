import {
  getSetting,
  initSettingsStore,
  useSettingSelector,
} from "@/lib/settings/settingsStore";
import {
  getCapabilitiesForProviderKinds,
  isCapabilityAllowedForProvider,
  type ProviderCapability,
  type ProviderKind,
} from "./capabilities";
import { atlassianProviderPlugin } from "./atlassian/plugin";
import { githubProviderPlugin } from "./github/plugin";
import { openSearchProviderPlugin } from "./opensearch/plugin";
import type {
  KnownProviderPlugin,
  ProviderInstance,
  ProviderPluginForType,
  ProviderType,
} from "./providerTypes";

export const providerPlugins: KnownProviderPlugin[] = [
  githubProviderPlugin,
  atlassianProviderPlugin,
  openSearchProviderPlugin,
];

validateProviderRegistry();

export function getProviderPlugin<Type extends ProviderType>(
  type: Type,
): ProviderPluginForType<Type> | null {
  return (
    providerPlugins.find(
      (plugin): plugin is ProviderPluginForType<Type> => plugin.type === type,
    ) ?? null
  );
}

export async function getProvider<Type extends ProviderType>(
  type: Type,
): Promise<ProviderInstance<Type> | null> {
  await initSettingsStore();
  return findProviderByType(getSetting("Providers"), type);
}

export function useProvider<Type extends ProviderType>(
  type: Type,
): ProviderInstance<Type> | null {
  return useSettingSelector("Providers", (providers) =>
    findProviderByType(providers, type),
  );
}

export function providerHasCapability(
  provider: ProviderInstance,
  capability: ProviderCapability,
) {
  return provider.enabledCapabilities.includes(capability);
}

export function providerHasKind(
  provider: ProviderInstance,
  kind: ProviderKind,
) {
  const providerKinds = getProviderPluginForInstance(provider)
    ?.providerKinds as readonly ProviderKind[] | undefined;
  return providerKinds?.includes(kind) ?? false;
}

export function providerSupportsCapability(
  provider: ProviderInstance,
  kind: ProviderKind,
  capability: ProviderCapability,
) {
  return (
    providerHasKind(provider, kind) &&
    providerHasCapability(provider, capability)
  );
}

export function useProviderWithCapability<Type extends ProviderType>(
  type: Type,
  capability: ProviderCapability,
): ProviderInstance<Type> | null {
  return useSettingSelector("Providers", (providers) => {
    const provider = findProviderByType(providers, type);
    if (!provider || !providerHasCapability(provider, capability)) {
      return null;
    }

    return provider;
  });
}

function validateProviderRegistry() {
  for (const plugin of providerPlugins) {
    const invalidKindCapabilities = plugin.capabilities.filter(
      (capability) => !isCapabilityAllowedForProvider(plugin, capability),
    );

    if (invalidKindCapabilities.length > 0) {
      throw new Error(
        `Provider "${plugin.type}" declares capabilities outside its provider kinds: ${invalidKindCapabilities.join(", ")}`,
      );
    }

    const allowedCapabilities = getCapabilitiesForProviderKinds(
      plugin.providerKinds,
    );
    const unknownKindCapabilities = plugin.capabilities.filter(
      (capability) => !allowedCapabilities.includes(capability),
    );

    if (unknownKindCapabilities.length > 0) {
      throw new Error(
        `Provider "${plugin.type}" declares unsupported capabilities: ${unknownKindCapabilities.join(", ")}`,
      );
    }
  }
}

function getProviderPluginForInstance(provider: ProviderInstance) {
  return (
    providerPlugins.find((plugin) => plugin.type === provider.type) ?? null
  );
}

function findProviderByType<Type extends ProviderType>(
  providers: ProviderInstance[],
  type: Type,
): ProviderInstance<Type> | null {
  return (
    providers.find(
      (provider): provider is ProviderInstance<Type> => provider.type === type,
    ) ?? null
  );
}
