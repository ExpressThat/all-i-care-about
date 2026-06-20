import type { LucideIcon } from "lucide-react"
import type { ProviderCapability } from "./capabilities"

export type ProviderType = "github" | "jira"

export type ProviderInstance<Type extends ProviderType = ProviderType> = {
  id: string
  type: Type
  displayName: string
  settings: Record<string, string>
  enabledCapabilities: ProviderCapability[]
}

export type ProviderField = {
  key: string
  label: string
  type: "password" | "text"
  required: boolean
  secret: boolean
  placeholder?: string
  description?: string
}

export type ProviderPlugin = {
  type: ProviderType
  label: string
  description: string
  icon: LucideIcon
  fields: ProviderField[]
  capabilities: readonly ProviderCapability[]
}

const providerTypes: ProviderType[] = ["github", "jira"]

export function isProviderType(value: unknown): value is ProviderType {
  return providerTypes.includes(value as ProviderType)
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every((entry) => typeof entry === "string")
}
