import type {
  ProviderField,
  SecretProviderField,
  TextProviderField,
} from "@/lib/providers/providerTypes"

export function validateTextField(field: TextProviderField | SecretProviderField, value: string) {
  const minLength =
    "minLength" in field && typeof field.minLength === "number"
      ? field.minLength
      : undefined
  const maxLength =
    "maxLength" in field && typeof field.maxLength === "number"
      ? field.maxLength
      : undefined
  const pattern =
    "pattern" in field && typeof field.pattern === "string"
      ? field.pattern
      : undefined

  if (minLength !== undefined && value.length < minLength) {
    return `${field.label} must be at least ${minLength} characters.`
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return `${field.label} must be at most ${maxLength} characters.`
  }

  if (pattern && !new RegExp(pattern).test(value)) {
    return `${field.label} is not in the expected format.`
  }

  return ""
}

export function validateEmailField(field: ProviderField, value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? ""
    : `${field.label} must be a valid email.`
}

export function validateUrlField(field: ProviderField, value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return `${field.label} must be a valid URL.`
    }

    if (
      field.type === "url" &&
      field.originAccess &&
      url.protocol !== "https:"
    ) {
      return `${field.label} must use HTTPS because it can receive provider secrets.`
    }

    return ""
  } catch {
    return `${field.label} must be a valid URL.`
  }
}
