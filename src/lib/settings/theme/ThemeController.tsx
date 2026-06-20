import { useEffect, useState } from "react"
import { initSettingsStore, useSetting } from "@/lib/settings/settingsStore"
import { calculateTheme } from "./themeUtils"

export function ThemeController() {
  const theme = useSetting("Theme")
  const [systemPreference, setSystemPreference] = useState<
    "dark" | "light" | null
  >(null)

  useEffect(() => {
    void initSettingsStore()
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!mediaQuery) {
      return
    }

    const onChange = () => {
      setSystemPreference(mediaQuery.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", onChange)
    onChange()
    return () => {
      mediaQuery.removeEventListener("change", onChange)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      calculateTheme(theme, systemPreference) === "Dark",
    )
  }, [theme, systemPreference])

  return null
}
