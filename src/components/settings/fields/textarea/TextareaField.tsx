import { Textarea } from "@/components/ui/textarea"
import type { TextProviderField } from "@/lib/providers/providerTypes"
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"
import { stringFieldValue } from "../text/helpers"

export function TextareaField({
  descriptionId,
  field,
  fieldId,
  onChange,
  value,
}: {
  descriptionId?: string
  field: TextProviderField
  fieldId: string
  onChange: (value: ProviderFieldFormValue) => void
  value: ProviderFieldFormValue | undefined
}) {
  return (
    <Textarea
      aria-describedby={descriptionId}
      id={fieldId}
      maxLength={field.maxLength}
      minLength={field.minLength}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={field.placeholder}
      value={stringFieldValue(value)}
    />
  )
}
