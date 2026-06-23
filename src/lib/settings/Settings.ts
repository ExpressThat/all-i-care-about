import type { ProviderInstance } from "@/lib/providers/providerTypes";

/** User-selectable application theme mode. */
export type AppTheme = "System" | "Light" | "Dark";

/** Persisted application settings shape returned by Rust. */
export type Settings = {
  /** Whether the app is registered to start automatically on login. */
  AutoStart: boolean;
  /** Configured provider instances saved through Rust-owned settings commands. */
  Providers: ProviderInstance[];
  /** Current application theme preference. */
  Theme: AppTheme;
};

/** Key of a top-level application setting. */
export type SettingsKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  AutoStart: false,
  Providers: [],
  Theme: "System",
};

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "System" || value === "Light" || value === "Dark";
}
