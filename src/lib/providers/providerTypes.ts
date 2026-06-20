import type { LucideIcon } from "lucide-react"
import type { ProviderCapability } from "./capabilities"

export type ProviderType = "github" | "jira"

export type ProviderSettingValue =
  | string
  | number
  | boolean
  | { [key: string]: ProviderSettingValue }

export type ProviderInstance<Type extends ProviderType = ProviderType> = {
  id: string
  type: Type
  displayName: string
  settings: ProviderSettingsRecord
  enabledCapabilities: ProviderCapability[]
}

export type ProviderSettingsRecord = Record<string, ProviderSettingValue>

export type ProviderSelectOption = {
  value: string
  label: string
}

export type ProviderSelectOptions =
  | readonly ProviderSelectOption[]
  | (() => readonly ProviderSelectOption[] | Promise<readonly ProviderSelectOption[]>)

type ProviderFieldBase = {
  key: string
  label: string
  required: boolean
  placeholder?: string
  description?: string
}

type ProviderTextFieldBase = ProviderFieldBase & {
  minLength?: number
  maxLength?: number
  pattern?: string
  secret?: false
}

export type TextProviderField = ProviderTextFieldBase & {
  type: "text" | "url" | "email" | "textarea"
}

export type NumberProviderField = ProviderFieldBase & {
  type: "number"
  min?: number
  max?: number
  step?: number
  integer?: boolean
  secret?: false
}

export type BooleanProviderField = ProviderFieldBase & {
  type: "boolean"
  secret?: false
}

export type DateTimeProviderField = ProviderFieldBase & {
  type: "date" | "time" | "datetime"
  min?: number
  max?: number
  secret?: false
}

export type SelectProviderField = ProviderFieldBase & {
  type: "select"
  options: ProviderSelectOptions
  secret?: false
}

export type SecretProviderField = ProviderFieldBase & {
  type: "secret"
  secret: true
}

export interface ProviderGroupField<
  Fields extends readonly ProviderField[] = readonly ProviderField[],
> extends Omit<ProviderFieldBase, "required"> {
  type: "group"
  fields: Fields
  defaultOpen?: boolean
  required?: false
  secret?: false
}

export type ScalarNonSecretProviderField =
  | TextProviderField
  | NumberProviderField
  | BooleanProviderField
  | DateTimeProviderField
  | SelectProviderField

export type NonSecretProviderField =
  | ScalarNonSecretProviderField
  | ProviderGroupField

export type ProviderField =
  | NonSecretProviderField
  | SecretProviderField
  | ProviderGroupField

export type ProviderHttpAccess<Type extends ProviderType = ProviderType> = {
  staticAllowedOrigins?: readonly string[]
  getAllowedOrigins?: (settings: NonSecretProviderSettings<Type>) => string[]
}

export type ProviderPlugin<
  Type extends ProviderType = ProviderType,
  Fields extends readonly ProviderField[] = readonly ProviderField[],
> = {
  type: Type
  label: string
  description: string
  icon: LucideIcon
  fields: Fields
  capabilities: readonly ProviderCapability[]
  httpAccess?: ProviderHttpAccess<Type>
}

export type NonSecretProviderSettings<Type extends ProviderType> =
  ProviderPluginForType<Type> extends ProviderPlugin<Type, infer Fields>
    ? NonSecretSettingsFromFields<Fields>
    : Record<string, ProviderSettingValue | Date | undefined>

type RequiredNonSecretSettings<Fields extends readonly ProviderField[]> = {
  [Field in Fields[number] as Field extends { secret: true }
    ? never
    : Field extends { type: "group" }
      ? Field["key"]
      : Field extends { required: true }
      ? Field["key"]
      : never]: ImplementationValueForField<Field>
}

type OptionalNonSecretSettings<Fields extends readonly ProviderField[]> = {
  [Field in Fields[number] as Field extends { secret: true }
    ? never
    : Field extends { type: "group" }
      ? never
    : Field extends { required: false }
      ? Field["key"]
      : never]?: ImplementationValueForField<Field>
}

type NonSecretSettingsFromFields<Fields extends readonly ProviderField[]> =
  RequiredNonSecretSettings<Fields> & OptionalNonSecretSettings<Fields>

type ImplementationValueForField<Field extends ProviderField> =
  Field extends ProviderGroupField<infer Fields>
    ? NonSecretSettingsFromFields<Fields>
    : Field extends { type: "number" | "time" }
    ? number
    : Field extends { type: "boolean" }
      ? boolean
      : Field extends { type: "date" | "datetime" }
        ? Date
        : string

export type ProviderPluginForType<Type extends ProviderType> = Extract<
  KnownProviderPlugin,
  { type: Type }
>

export type KnownProviderPlugin =
  | typeof import("./github/plugin").githubProviderPlugin
  | typeof import("./jira/plugin").jiraProviderPlugin

const providerTypes: ProviderType[] = ["github", "jira"]

export function isProviderType(value: unknown): value is ProviderType {
  return providerTypes.includes(value as ProviderType)
}

export function isProviderSettingRecord(
  value: unknown,
): value is Record<string, ProviderSettingValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(
    (entry) => isProviderSettingValue(entry),
  )
}

function isProviderSettingValue(value: unknown): value is ProviderSettingValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true
  }

  return isProviderSettingRecord(value)
}
