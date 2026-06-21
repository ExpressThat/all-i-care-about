import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProviderField } from "@/lib/providers/providerTypes";
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings";
import { getTextInputType, stringFieldValue } from "./helpers";

export function TextField({
  descriptionId,
  field,
  fieldId,
  isRevealed,
  onChange,
  onToggleReveal,
  showRevealButton,
  value,
}: {
  descriptionId?: string;
  field: ProviderField;
  fieldId: string;
  isRevealed: boolean;
  onChange: (value: ProviderFieldFormValue) => void;
  onToggleReveal: () => void;
  showRevealButton: boolean;
  value: ProviderFieldFormValue | undefined;
}) {
  return (
    <div className="relative">
      <Input
        aria-describedby={descriptionId}
        className={showRevealButton ? "pr-9" : undefined}
        id={fieldId}
        maxLength={"maxLength" in field ? field.maxLength : undefined}
        minLength={"minLength" in field ? field.minLength : undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
        pattern={"pattern" in field ? field.pattern : undefined}
        placeholder={field.placeholder}
        type={getTextInputType(field, isRevealed)}
        value={stringFieldValue(value)}
      />
      {showRevealButton ? (
        <Button
          aria-label={
            isRevealed ? `Hide ${field.label}` : `Reveal ${field.label}`
          }
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={onToggleReveal}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          {isRevealed ? (
            <EyeOff aria-hidden="true" className="size-3.5" />
          ) : (
            <Eye aria-hidden="true" className="size-3.5" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
