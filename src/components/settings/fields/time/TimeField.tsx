import { Input } from "@/components/ui/input"
import type { DateTimeProviderField } from "@/lib/providers/providerTypes"
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"
import { numberFieldValue, timeInputValue, timeValueFromInput } from "./helpers"

export function TimeField({
  descriptionId,
  field,
  fieldId,
  onChange,
  value,
}: {
  descriptionId?: string
  field: DateTimeProviderField
  fieldId: string
  onChange: (value: ProviderFieldFormValue) => void
  value: ProviderFieldFormValue | undefined
}) {
  return (
    <Input
      aria-describedby={descriptionId}
      id={fieldId}
      max={field.max !== undefined ? timeInputValue(field.max) : undefined}
      min={field.min !== undefined ? timeInputValue(field.min) : undefined}
      onChange={(event) =>
        onChange(timeValueFromInput(event.currentTarget.value) ?? "")
      }
      type="time"
      value={value === undefined ? "" : timeInputValue(numberFieldValue(value))}
    />
  )
}
