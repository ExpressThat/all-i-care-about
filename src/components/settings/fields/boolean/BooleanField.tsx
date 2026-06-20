import { Switch } from "@/components/ui/switch"
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"

export function BooleanField({
  descriptionId,
  fieldId,
  onChange,
  value,
}: {
  descriptionId?: string
  fieldId: string
  onChange: (value: ProviderFieldFormValue) => void
  value: ProviderFieldFormValue | undefined
}) {
  return (
    <div className="flex h-8 items-center">
      <Switch
        aria-describedby={descriptionId}
        checked={value === true}
        id={fieldId}
        onCheckedChange={onChange}
      />
    </div>
  )
}
