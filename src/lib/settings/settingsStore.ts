import { useRef, useSyncExternalStore } from "react"
import { load, type Store } from "@tauri-apps/plugin-store"
import { isProviderInstance } from "@/lib/providers/validation"
import {
  DEFAULT_SETTINGS,
  isAppTheme,
  type Settings,
  type SettingsKey,
} from "./Settings"

const SETTINGS_STORE_PATH = "settings.json"

type Listener = () => void
type KeyedListeners = { [K in SettingsKey]: Set<Listener> }

let settings: Settings = { ...DEFAULT_SETTINGS }
let initialized = false
let initPromise: Promise<void> | null = null
let store: Store | null = null

const allListeners = new Set<Listener>()
const keyedListeners = createKeyedListeners()

function createKeyedListeners(): KeyedListeners {
  const entries = Object.keys(DEFAULT_SETTINGS).map((key) => [
    key,
    new Set<Listener>(),
  ])
  return Object.fromEntries(entries) as KeyedListeners
}

function cloneSettings(): Settings {
  return { ...settings }
}

function notify(changedKeys: SettingsKey[]) {
  for (const key of changedKeys) {
    for (const listener of keyedListeners[key]) {
      listener()
    }
  }

  if (changedKeys.length > 0) {
    for (const listener of allListeners) {
      listener()
    }
  }
}

async function readPersistedSettings(settingsStore: Store): Promise<Settings> {
  const nextSettings = { ...DEFAULT_SETTINGS }
  const theme = await settingsStore.get<unknown>("Theme")
  const providers = await settingsStore.get<unknown>("Providers")

  if (isAppTheme(theme)) {
    nextSettings.Theme = theme
  }

  if (Array.isArray(providers)) {
    nextSettings.Providers = providers.filter(isProviderInstance)
  }

  return nextSettings
}

export async function initSettingsStore(): Promise<void> {
  if (initialized) {
    return
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    const settingsStore = await load(SETTINGS_STORE_PATH, {
      autoSave: false,
      defaults: DEFAULT_SETTINGS,
    })

    store = settingsStore
    settings = await readPersistedSettings(settingsStore)
    initialized = true
    notify(Object.keys(DEFAULT_SETTINGS) as SettingsKey[])
  })()
    .catch((error) => {
      store = null
      settings = { ...DEFAULT_SETTINGS }
      initialized = true
      console.error(
        "Failed to initialize settings store. Falling back to defaults.",
        error,
      )
      notify(Object.keys(DEFAULT_SETTINGS) as SettingsKey[])
    })
    .finally(() => {
      initPromise = null
    })

  return initPromise
}

export function getSetting<K extends SettingsKey>(key: K): Settings[K] {
  return settings[key]
}

export function subscribeToAll(listener: Listener): () => void {
  allListeners.add(listener)
  return () => {
    allListeners.delete(listener)
  }
}

export function subscribeToKey<K extends SettingsKey>(
  key: K,
  listener: Listener,
): () => void {
  keyedListeners[key].add(listener)
  return () => {
    keyedListeners[key].delete(listener)
  }
}

export async function setSetting<K extends SettingsKey>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await initSettingsStore()
  if (Object.is(settings[key], value)) {
    return
  }

  settings = { ...settings, [key]: value }
  notify([key])

  if (!store) {
    return
  }

  try {
    await store.set(key, value)
    await store.save()
  } catch (error) {
    console.error(`Failed to persist setting "${String(key)}".`, error)
  }
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await initSettingsStore()
  const changedEntries: Array<[SettingsKey, Settings[SettingsKey]]> = []

  for (const key of Object.keys(patch) as SettingsKey[]) {
    const nextValue = patch[key]
    if (nextValue === undefined || Object.is(settings[key], nextValue)) {
      continue
    }
    changedEntries.push([key, nextValue])
  }

  if (changedEntries.length === 0) {
    return
  }

  const updates = Object.fromEntries(changedEntries) as Partial<Settings>
  settings = { ...settings, ...updates }
  notify(changedEntries.map(([key]) => key))

  if (!store) {
    return
  }

  try {
    for (const [key, value] of changedEntries) {
      await store.set(key, value)
    }
    await store.save()
  } catch (error) {
    console.error("Failed to persist settings patch.", error)
  }
}

export function useSetting<K extends SettingsKey>(key: K): Settings[K] {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToKey(key, onStoreChange),
    () => settings[key],
    () => settings[key],
  )
}

export function useSettingSelector<K extends SettingsKey, T>(
  key: K,
  selector: (value: Settings[K]) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectedRef = useRef<T>(selector(settings[key]))
  return useSyncExternalStore(
    (onStoreChange) => subscribeToKey(key, onStoreChange),
    () => {
      const next = selector(settings[key])
      if (!isEqual(selectedRef.current, next)) {
        selectedRef.current = next
      }
      return selectedRef.current
    },
    () => selectedRef.current,
  )
}

export function useAllSettings(): Settings {
  return useSyncExternalStore(subscribeToAll, cloneSettings, cloneSettings)
}

export function useSettings<T>(
  selector: (state: Settings) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectedRef = useRef<T>(selector(settings))
  return useSyncExternalStore(
    subscribeToAll,
    () => {
      const next = selector(settings)
      if (!isEqual(selectedRef.current, next)) {
        selectedRef.current = next
      }
      return selectedRef.current
    },
    () => selectedRef.current,
  )
}
