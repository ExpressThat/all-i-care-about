import type {
  ProviderField,
  ProviderSettingValue,
} from "@/lib/providers/providerTypes";
import {
  type ProviderFieldFormValue,
  getFieldFormKey,
} from "@/lib/providers/providerSettings";
import { validateBooleanField } from "../boolean/validation";
import { validateDateField } from "../date/validation";
import { validateDateTimeField } from "../datetime/validation";
import { validateNumberField } from "../number/validation";
import { validateSelectField } from "../select/validation";
import {
  validateEmailField,
  validateTextField,
  validateUrlField,
} from "../text/validation";
import { validateTimeField } from "../time/validation";
import {
  getNestedProviderSettings,
  isEmptyFormValue,
} from "../shared/settings";

export async function validateProviderFieldValues({
  existingSettings,
  fieldValues,
  fields,
  isEditing,
  path = [],
}: {
  existingSettings?: Record<string, ProviderSettingValue>;
  fieldValues: Record<string, ProviderFieldFormValue>;
  fields: readonly ProviderField[];
  isEditing: boolean;
  path?: string[];
}): Promise<string> {
  for (const field of fields) {
    if (field.type === "group") {
      const validationError: string = await validateProviderFieldValues({
        existingSettings: getNestedProviderSettings(
          existingSettings,
          field.key,
        ),
        fieldValues,
        fields: field.fields,
        isEditing,
        path: [...path, field.key],
      });

      if (validationError) {
        return validationError;
      }
      continue;
    }

    const fieldKey = getFieldFormKey(path, field.key);
    const value = fieldValues[fieldKey];
    const hasExistingSecret =
      field.secret &&
      isEditing &&
      typeof existingSettings?.[field.key] === "string" &&
      existingSettings[field.key] !== "";

    if (field.required && isEmptyFormValue(value) && !hasExistingSecret) {
      return `${field.label} is required.`;
    }

    if (isEmptyFormValue(value)) {
      continue;
    }

    const validationError = await validateProviderFieldValue(field, value);
    if (validationError) {
      return validationError;
    }
  }

  return "";
}

async function validateProviderFieldValue(
  field: ProviderField,
  value: ProviderFieldFormValue,
) {
  switch (field.type) {
    case "email":
      return validateEmailField(field, String(value));
    case "url":
      return validateUrlField(field, String(value));
    case "text":
    case "textarea":
    case "secret":
      return validateTextField(field, String(value));
    case "number":
      return validateNumberField(field, value);
    case "date":
      return validateDateField(field, value);
    case "time":
      return validateTimeField(field, value);
    case "datetime":
      return validateDateTimeField(field, value);
    case "select":
      return validateSelectField(field, value);
    case "boolean":
      return validateBooleanField(field, value);
  }
}
