export type AppTheme = "System" | "Light" | "Dark"

export type Settings = {
  Theme: AppTheme
}

export type SettingsKey = keyof Settings

export const DEFAULT_SETTINGS: Settings = {
  Theme: "System",
}

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "System" || value === "Light" || value === "Dark"
}
