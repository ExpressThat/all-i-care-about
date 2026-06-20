import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { ProviderField } from "@/lib/providers/providerTypes"
import {
  type ProviderFieldFormValue,
  getFieldFormKey,
} from "@/lib/providers/providerSettings"
import { BooleanField } from "../boolean/BooleanField"
import { DateField } from "../date/DateField"
import { DateTimeField } from "../datetime/DateTimeField"
import { NumberField } from "../number/NumberField"
import { SelectField } from "../select/SelectField"
import { getFieldLayoutClassName } from "../shared/settings"
import { TextField } from "../text/TextField"
import { stringFieldValue } from "../text/helpers"
import { TextareaField } from "../textarea/TextareaField"
import { TimeField } from "../time/TimeField"
import { numberFieldValue } from "../time/helpers"

export function ProviderFieldsEditor({
  fieldValues,
  fields,
  onChange,
  onToggleReveal,
  path,
  revealedFields,
}: {
  fieldValues: Record<string, ProviderFieldFormValue>
  fields: readonly ProviderField[]
  onChange: (fieldKey: string, value: ProviderFieldFormValue) => void
  onToggleReveal: (fieldKey: string) => void
  path: string[]
  revealedFields: Set<string>
}) {
  const defaultOpenGroups = fields
    .filter((field) => field.type === "group" && field.defaultOpen)
    .map((field) => getFieldFormKey(path, field.key))

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {fields.map((field) => {
        const fieldKey = getFieldFormKey(path, field.key)

        if (field.type === "group") {
          return (
            <Accordion
              className="md:col-span-2"
              defaultValue={defaultOpenGroups}
              key={fieldKey}
              type="multiple"
            >
              <AccordionItem value={fieldKey}>
                <AccordionTrigger>
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold">
                      {field.label}
                    </span>
                    {field.description ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {field.description}
                      </span>
                    ) : null}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ProviderFieldsEditor
                    fieldValues={fieldValues}
                    fields={field.fields}
                    onChange={onChange}
                    onToggleReveal={onToggleReveal}
                    path={[...path, field.key]}
                    revealedFields={revealedFields}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )
        }

        return (
          <ProviderFieldInput
            className={getFieldLayoutClassName(field)}
            field={field}
            fieldKey={fieldKey}
            isRevealed={revealedFields.has(fieldKey)}
            key={fieldKey}
            onChange={(value) => onChange(fieldKey, value)}
            onToggleReveal={() => onToggleReveal(fieldKey)}
            value={fieldValues[fieldKey]}
          />
        )
      })}
    </div>
  )
}

function ProviderFieldInput({
  className,
  field,
  fieldKey,
  isRevealed,
  onChange,
  onToggleReveal,
  value,
}: {
  className?: string
  field: ProviderField
  fieldKey: string
  isRevealed: boolean
  onChange: (value: ProviderFieldFormValue) => void
  onToggleReveal: () => void
  value: ProviderFieldFormValue | undefined
}) {
  const fieldId = `provider-field-${fieldKey.split(".").join("-")}`
  const descriptionId = `${fieldId}-description`

  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium" htmlFor={fieldId}>
        {field.label}
      </label>
      <ProviderFieldControl
        descriptionId={field.description ? descriptionId : undefined}
        field={field}
        fieldId={fieldId}
        isRevealed={isRevealed}
        onChange={onChange}
        onToggleReveal={onToggleReveal}
        value={value}
      />
      {field.description ? (
        <span className="text-xs text-muted-foreground" id={descriptionId}>
          {field.description}
        </span>
      ) : null}
    </div>
  )
}

function ProviderFieldControl({
  descriptionId,
  field,
  fieldId,
  isRevealed,
  onChange,
  onToggleReveal,
  value,
}: {
  descriptionId?: string
  field: ProviderField
  fieldId: string
  isRevealed: boolean
  onChange: (value: ProviderFieldFormValue) => void
  onToggleReveal: () => void
  value: ProviderFieldFormValue | undefined
}) {
  switch (field.type) {
    case "textarea":
      return (
        <TextareaField
          descriptionId={descriptionId}
          field={field}
          fieldId={fieldId}
          onChange={onChange}
          value={value}
        />
      )
    case "boolean":
      return (
        <BooleanField
          descriptionId={descriptionId}
          fieldId={fieldId}
          onChange={onChange}
          value={value}
        />
      )
    case "select":
      return (
        <SelectField
          ariaDescribedBy={descriptionId}
          field={field}
          fieldId={fieldId}
          onChange={onChange}
          value={stringFieldValue(value)}
        />
      )
    case "date":
      return (
        <DateField
          ariaDescribedBy={descriptionId}
          field={field}
          fieldId={fieldId}
          onChange={onChange}
          value={numberFieldValue(value)}
        />
      )
    case "time":
      return (
        <TimeField
          descriptionId={descriptionId}
          field={field}
          fieldId={fieldId}
          onChange={onChange}
          value={value}
        />
      )
    case "datetime":
      return (
        <DateTimeField
          ariaDescribedBy={descriptionId}
          field={field}
          fieldId={fieldId}
          onChange={onChange}
          value={numberFieldValue(value)}
        />
      )
    case "number":
      return (
        <NumberField
          descriptionId={descriptionId}
          field={field}
          fieldId={fieldId}
          onChange={onChange}
          value={value}
        />
      )
    case "email":
    case "secret":
    case "text":
    case "url":
      return (
        <TextField
          descriptionId={descriptionId}
          field={field}
          fieldId={fieldId}
          isRevealed={isRevealed}
          onChange={onChange}
          onToggleReveal={onToggleReveal}
          showRevealButton={field.type === "secret"}
          value={value}
        />
      )
  }
}
