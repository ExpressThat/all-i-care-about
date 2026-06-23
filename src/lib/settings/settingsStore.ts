import { useRef, useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ProviderInstance } from "@/lib/providers/providerTypes";
import { normalizeProviderCapability } from "@/lib/providers/capabilities";
import { normalizeProviderType } from "@/lib/providers/providerTypes";
import {
  DEFAULT_SETTINGS,
  isAppTheme,
  type Settings,
  type SettingsKey,
} from "./Settings";

type Listener = () => void;
type KeyedListeners = { [K in SettingsKey]: Set<Listener> };

let settings: Settings = { ...DEFAULT_SETTINGS };
let initialized = false;
let initPromise: Promise<void> | null = null;

const allListeners = new Set<Listener>();
const keyedListeners = createKeyedListeners();

function createKeyedListeners(): KeyedListeners {
  const entries = Object.keys(DEFAULT_SETTINGS).map((key) => [
    key,
    new Set<Listener>(),
  ]);
  return Object.fromEntries(entries) as KeyedListeners;
}

function cloneSettings(): Settings {
  return { ...settings };
}

function notify(changedKeys: SettingsKey[]) {
  for (const key of changedKeys) {
    for (const listener of keyedListeners[key]) {
      listener();
    }
  }

  if (changedKeys.length > 0) {
    for (const listener of allListeners) {
      listener();
    }
  }
}

export async function initSettingsStore(): Promise<void> {
  if (initialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    settings = normalizeSettings(await invoke<Settings>("get_settings"));
    initialized = true;
    notify(Object.keys(DEFAULT_SETTINGS) as SettingsKey[]);
  })()
    .catch((error) => {
      settings = { ...DEFAULT_SETTINGS };
      initialized = true;
      console.error(
        "Failed to initialize settings store. Falling back to defaults.",
        error,
      );
      notify(Object.keys(DEFAULT_SETTINGS) as SettingsKey[]);
    })
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

export function getSetting<K extends SettingsKey>(key: K): Settings[K] {
  return settings[key];
}

export function subscribeToAll(listener: Listener): () => void {
  allListeners.add(listener);
  return () => {
    allListeners.delete(listener);
  };
}

export function subscribeToKey<K extends SettingsKey>(
  key: K,
  listener: Listener,
): () => void {
  keyedListeners[key].add(listener);
  return () => {
    keyedListeners[key].delete(listener);
  };
}

export async function setSetting<K extends SettingsKey>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await initSettingsStore();

  if (key !== "Theme" && key !== "AutoStart") {
    throw new Error(
      `Setting "${String(key)}" must be changed through a Rust command.`,
    );
  }

  try {
    if (key === "Theme") {
      settings = normalizeSettings(
        await invoke<Settings>("set_theme", { theme: value }),
      );
      notify(["Theme"]);
    } else {
      settings = normalizeSettings(
        await invoke<Settings>("set_auto_start", { autoStart: value }),
      );
      notify(["AutoStart"]);
    }
  } catch (error) {
    console.error(`Failed to persist setting "${String(key)}".`, error);
    throw error;
  }
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await initSettingsStore();
  if (patch.AutoStart !== undefined) {
    await setSetting("AutoStart", patch.AutoStart);
  }
  if (patch.Theme !== undefined) {
    await setSetting("Theme", patch.Theme);
  }
}

/** Security metadata submitted with provider saves for Rust sealing. */
export type ProviderSaveSecurityInput = {
  /**
   * Candidate normalized HTTPS origins for the provider instance.
   *
   * Rust validates and seals these before persistence. Existing secrets are
   * preserved only when the old sealed origin set matches this submitted set.
   */
  allowedOrigins: string[];
  /**
   * Dotted paths for secret fields declared by the provider plugin.
   *
   * Rust stores these in the sealed security payload so fetch-time secret
   * injection can reject undeclared secret paths.
   */
  secretSettingPaths: string[];
};

export async function saveProvider(
  provider: ProviderInstance,
  security: ProviderSaveSecurityInput,
): Promise<void> {
  await initSettingsStore();
  try {
    settings = normalizeSettings(
      await invoke<Settings>("save_provider", {
        request: {
          provider,
          allowedOrigins: security.allowedOrigins,
          secretSettingPaths: security.secretSettingPaths,
        },
      }),
    );
    notify(["Providers"]);
  } catch (error) {
    console.error("Failed to save provider.", error);
    throw error;
  }
}

export async function removeProvider(providerId: string): Promise<void> {
  await initSettingsStore();
  try {
    settings = normalizeSettings(
      await invoke<Settings>("remove_provider", { providerId }),
    );
    notify(["Providers"]);
  } catch (error) {
    console.error("Failed to remove provider.", error);
    throw error;
  }
}

export function useSetting<K extends SettingsKey>(key: K): Settings[K] {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToKey(key, onStoreChange),
    () => settings[key],
    () => settings[key],
  );
}

export function useSettingSelector<K extends SettingsKey, T>(
  key: K,
  selector: (value: Settings[K]) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectedRef = useRef<T>(selector(settings[key]));
  return useSyncExternalStore(
    (onStoreChange) => subscribeToKey(key, onStoreChange),
    () => {
      const next = selector(settings[key]);
      if (!isEqual(selectedRef.current, next)) {
        selectedRef.current = next;
      }
      return selectedRef.current;
    },
    () => selectedRef.current,
  );
}

export function useAllSettings(): Settings {
  return useSyncExternalStore(subscribeToAll, cloneSettings, cloneSettings);
}

export function useSettings<T>(
  selector: (state: Settings) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectedRef = useRef<T>(selector(settings));
  return useSyncExternalStore(
    subscribeToAll,
    () => {
      const next = selector(settings);
      if (!isEqual(selectedRef.current, next)) {
        selectedRef.current = next;
      }
      return selectedRef.current;
    },
    () => selectedRef.current,
  );
}

function normalizeSettings(value: Settings): Settings {
  return {
    AutoStart:
      typeof value.AutoStart === "boolean"
        ? value.AutoStart
        : DEFAULT_SETTINGS.AutoStart,
    Providers: Array.isArray(value.Providers)
      ? value.Providers.map(normalizeProvider)
      : [],
    Theme: isAppTheme(value.Theme) ? value.Theme : DEFAULT_SETTINGS.Theme,
  };
}

function normalizeProvider(provider: ProviderInstance): ProviderInstance {
  const providerType = normalizeProviderType(provider.type);

  return {
    ...provider,
    type: providerType ?? provider.type,
    enabledCapabilities: Array.from(
      new Set(
        provider.enabledCapabilities
          .map(normalizeProviderCapability)
          .filter((capability) => capability !== null),
      ),
    ),
  };
}
