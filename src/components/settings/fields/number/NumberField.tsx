import { Input } from "@/components/ui/input"
import type { ProviderField } from "@/lib/providers/providerTypes"
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"
import { numberInputValue } from "./helpers"

export function NumberField({
  descriptionId,
  field,
  fieldId,
  onChange,
  value,
}: {
  descriptionId?: string
  field: Extract<ProviderField, { type: "number" }>
  fieldId: string
  onChange: (value: ProviderFieldFormValue) => void
  value: ProviderFieldFormValue | undefined
}) {
  return (
    <Input
      aria-describedby={descriptionId}
      id={fieldId}
      max={field.max}
      min={field.min}
      onChange={(event) => {
        const nextValue = event.currentTarget.value
        onChange(nextValue ? Number(nextValue) : "")
      }}
      placeholder={field.placeholder}
      step={field.step}
      type="number"
      value={numberInputValue(value)}
    />
  )
}
