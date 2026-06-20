import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { DateTimeProviderField } from "@/lib/providers/providerTypes"
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings"
import { formatDate, isDateDisabled, startOfDayTimestamp } from "./helpers"

export function DateField({
  ariaDescribedBy,
  field,
  fieldId,
  onChange,
  value,
}: {
  ariaDescribedBy?: string
  field: DateTimeProviderField
  fieldId: string
  onChange: (value: ProviderFieldFormValue) => void
  value: number | undefined
}) {
  const selectedDate = value === undefined ? undefined : new Date(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-describedby={ariaDescribedBy}
          className="w-full justify-start"
          id={fieldId}
          type="button"
          variant="outline"
        >
          <CalendarIcon aria-hidden="true" className="size-4" />
          {selectedDate ? formatDate(selectedDate) : field.placeholder ?? "Select date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          disabled={(date) => isDateDisabled(date, field)}
          mode="single"
          onSelect={(date) =>
            onChange(date ? startOfDayTimestamp(date) : "")
          }
          selected={selectedDate}
        />
      </PopoverContent>
    </Popover>
  )
}
