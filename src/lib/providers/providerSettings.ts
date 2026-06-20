import type {
  NonSecretProviderSettings,
  ProviderField,
  ProviderPlugin,
  ProviderSettingValue,
  ProviderSettingsRecord,
  ProviderType,
} from "./providerTypes"

export type ProviderFieldFormValue = string | number | boolean
export type ProviderFieldFormValues = Record<string, ProviderFieldFormValue>

export async function collectPersistedProviderSettings({
  existingSettings,
  fieldValues,
  isEditing,
  plugin,
}: {
  existingSettings?: ProviderSettingsRecord
  fieldValues: ProviderFieldFormValues
  isEditing: boolean
  plugin: ProviderPlugin
}) {
  return collectPersistedFields({
    existingSettings,
    fieldValues,
    fields: plugin.fields,
    isEditing,
    path: [],
  })
}

export function getNonSecretProviderSettings<Type extends ProviderType>(
  settings: ProviderSettingsRecord,
  fields: readonly ProviderField[],
): NonSecretProviderSettings<Type> {
  return collectNonSecretFields(settings, fields) as NonSecretProviderSettings<Type>
}

export function getEditableProviderFieldValues(
  plugin: ProviderPlugin | null,
  settings: ProviderSettingsRecord,
) {
  if (!plugin) {
    return {}
  }

  return collectEditableFields(plugin.fields, settings, [])
}

export function normalizePersistedFieldValue(
  field: ProviderField,
  value: ProviderFieldFormValue | undefined,
): ProviderSettingValue | undefined {
  if (field.type === "group") {
    return undefined
  }

  if (isEmptyFormValue(value)) {
    return undefined
  }

  switch (field.type) {
    case "number":
    case "date":
    case "time":
    case "datetime": {
      const numberValue =
        typeof value === "number" ? value : Number.parseFloat(String(value))
      return Number.isFinite(numberValue) ? numberValue : undefined
    }
    case "boolean":
      return value === true || value === "true"
    case "secret":
    case "text":
    case "url":
    case "email":
    case "textarea":
    case "select":
      return String(value)
  }
}

export function getProviderAllowedOrigins(
  plugin: ProviderPlugin,
  settings: ProviderSettingsRecord,
) {
  return normalizeOriginSet([
    ...(plugin.httpAccess?.staticAllowedOrigins ?? []),
    ...collectOriginAccessFields(plugin.fields, settings),
  ])
}

async function collectPersistedFields({
  existingSettings,
  fieldValues,
  fields,
  isEditing,
  path,
}: {
  existingSettings?: ProviderSettingsRecord
  fieldValues: ProviderFieldFormValues
  fields: readonly ProviderField[]
  isEditing: boolean
  path: string[]
}) {
  const settings: ProviderSettingsRecord = {}

  for (const field of fields) {
    if (field.type === "group") {
      const groupSettings = await collectPersistedFields({
        existingSettings: getNestedSettings(existingSettings, field.key),
        fieldValues,
        fields: field.fields,
        isEditing,
        path: [...path, field.key],
      })

      if (Object.keys(groupSettings).length > 0) {
        settings[field.key] = groupSettings
      }
      continue
    }

    const formKey = getFieldFormKey(path, field.key)
    const value = fieldValues[formKey]

    if (field.secret) {
      if (typeof value === "string" && value) {
        settings[field.key] = value
      }
      continue
    }

    const normalizedValue = normalizePersistedFieldValue(field, value)
    if (normalizedValue !== undefined) {
      settings[field.key] = normalizedValue
    }
  }

  return settings
}

function collectNonSecretFields(
  settings: ProviderSettingsRecord,
  fields: readonly ProviderField[],
) {
  const nonSecretSettings: Record<string, unknown> = {}

  for (const field of fields) {
    if (field.type === "group") {
      nonSecretSettings[field.key] = collectNonSecretFields(
        getNestedSettings(settings, field.key) ?? {},
        field.fields,
      )
      continue
    }

    if (field.secret) {
      continue
    }

    const value = settings[field.key]
    const implementationValue = toImplementationFieldValue(field, value)

    if (field.required || implementationValue !== undefined) {
      nonSecretSettings[field.key] = implementationValue
    }
  }

  return nonSecretSettings
}

function collectOriginAccessFields(
  fields: readonly ProviderField[],
  settings: ProviderSettingsRecord,
): string[] {
  const origins: string[] = []

  for (const field of fields) {
    if (field.type === "group") {
      origins.push(
        ...collectOriginAccessFields(
          field.fields,
          getNestedSettings(settings, field.key) ?? {},
        ),
      )
      continue
    }

    if (field.type !== "url" || !field.originAccess) {
      continue
    }

    const value = settings[field.key]
    if (typeof value === "string" && value) {
      const origin = normalizeOrigin(value)
      if (origin) {
        origins.push(origin)
      }
    }
  }

  return origins
}

function collectEditableFields(
  fields: readonly ProviderField[],
  settings: ProviderSettingsRecord,
  path: string[],
) {
  const fieldValues: ProviderFieldFormValues = {}

  for (const field of fields) {
    if (field.type === "group") {
      Object.assign(
        fieldValues,
        collectEditableFields(
          field.fields,
          getNestedSettings(settings, field.key) ?? {},
          [...path, field.key],
        ),
      )
      continue
    }

    const formKey = getFieldFormKey(path, field.key)

    if (field.secret) {
      fieldValues[formKey] = ""
      continue
    }

    const value = settings[field.key]
    if (isScalarProviderSettingValue(value)) {
      fieldValues[formKey] = value
    } else if (field.type === "boolean" && field.required) {
      fieldValues[formKey] = false
    }
  }

  return fieldValues
}

function toImplementationFieldValue(
  field: ProviderField,
  value: ProviderSettingValue | undefined,
) {
  if (field.type === "group" || field.type === "secret") {
    return undefined
  }

  if (value === undefined || value === "") {
    return undefined
  }

  switch (field.type) {
    case "date":
    case "datetime":
      return typeof value === "number" ? new Date(value) : undefined
    case "time":
    case "number":
      return typeof value === "number" ? value : undefined
    case "boolean":
      return typeof value === "boolean" ? value : undefined
    case "text":
    case "url":
    case "email":
    case "textarea":
    case "select":
      return typeof value === "string" ? value : undefined
  }
}

export function getFieldFormKey(path: readonly string[], fieldKey: string) {
  return [...path, fieldKey].join(".")
}

function getNestedSettings(
  settings: ProviderSettingsRecord | undefined,
  key: string,
): ProviderSettingsRecord | undefined {
  const value = settings?.[key]
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  return value
}

function isScalarProviderSettingValue(
  value: ProviderSettingValue | undefined,
): value is ProviderFieldFormValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
}

function isEmptyFormValue(value: ProviderFieldFormValue | undefined) {
  return value === undefined || value === ""
}

function normalizeOriginSet(origins: readonly string[]) {
  return Array.from(
    new Set(origins.map(normalizeOrigin).filter((origin) => origin !== null)),
  ).sort()
}

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") {
      return null
    }
    return url.port
      ? `${url.protocol}//${url.hostname.toLowerCase()}:${url.port}`
      : `${url.protocol}//${url.hostname.toLowerCase()}`
  } catch {
    return null
  }
}
