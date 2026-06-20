import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"

export function numberFieldValue(value: ProviderFieldFormValue | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export function timePart(timestamp: number) {
  const date = new Date(timestamp)
  return (
    date.getHours() * 3_600_000 +
    date.getMinutes() * 60_000 +
    date.getSeconds() * 1_000
  )
}

export function timeInputValue(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return ""
  }

  const hours = Math.floor(value / 3_600_000)
  const minutes = Math.floor((value % 3_600_000) / 60_000)

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function timeValueFromInput(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined
  }

  return hours * 3_600_000 + minutes * 60_000
}
