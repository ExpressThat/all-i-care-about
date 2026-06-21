import type { Settings } from "../Settings";

export function getSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "Dark"
    : "Light";
}

export function calculateTheme(
  theme: Settings["Theme"],
  systemTheme?: "dark" | "light" | null,
) {
  if (theme === "System") {
    if (systemTheme === "dark") {
      return "Dark";
    }

    if (systemTheme === "light") {
      return "Light";
    }

    return getSystemTheme();
  }

  return theme;
}
