import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProviderSelectOption,
  SelectProviderField,
} from "@/lib/providers/providerTypes";
import type { ProviderFieldFormValue } from "@/lib/providers/providerSettings";
import { resolveSelectOptions } from "./helpers";

export function SelectField({
  ariaDescribedBy,
  field,
  fieldId,
  onChange,
  value,
}: {
  ariaDescribedBy?: string;
  field: SelectProviderField;
  fieldId: string;
  onChange: (value: ProviderFieldFormValue) => void;
  value: string;
}) {
  const [options, setOptions] = useState<readonly ProviderSelectOption[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let isMounted = true;
    setState("loading");

    Promise.resolve(resolveSelectOptions(field))
      .then((nextOptions) => {
        if (!isMounted) {
          return;
        }
        setOptions(nextOptions);
        setState("idle");
      })
      .catch((error: unknown) => {
        console.error(`Failed to load options for "${field.key}".`, error);
        if (isMounted) {
          setOptions([]);
          setState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [field]);

  return (
    <div className="grid gap-1">
      <Select
        disabled={state !== "idle" || options.length === 0}
        onValueChange={onChange}
        value={value}
      >
        <SelectTrigger
          aria-describedby={ariaDescribedBy}
          className="w-full"
          id={fieldId}
        >
          <SelectValue placeholder={field.placeholder ?? "Select an option"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {state === "loading" ? (
        <span className="text-xs text-muted-foreground">
          Loading options...
        </span>
      ) : null}
      {state === "error" ? (
        <span className="text-xs text-destructive">
          Failed to load options.
        </span>
      ) : null}
    </div>
  );
}
