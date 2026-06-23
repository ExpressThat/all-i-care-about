import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { LogField } from "@/lib/providers/opensearch/logs";

export function MetricGroupByPicker({
  fields,
  onChange,
  value,
}: {
  fields: LogField[];
  onChange: (fields: string[]) => void;
  value: string[];
}) {
  const [open, setOpen] = useState(false);
  const searchableFields = useMemo(
    () => fields.filter((field) => field.aggregatable || field.searchable),
    [fields],
  );

  function toggleField(field: string) {
    onChange(value.includes(field)
      ? value.filter((candidate) => candidate !== field)
      : [...value, field]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="min-w-72 justify-start" type="button" variant="outline">
          {value.length > 0 ? value.join(", ") : "Select group fields"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search group fields..." />
          <CommandList>
            <CommandEmpty>No fields found.</CommandEmpty>
            <CommandGroup>
              {searchableFields.map((field) => (
                <CommandItem
                  key={field.name}
                  onSelect={() => toggleField(field.name)}
                  value={field.name}
                >
                  <Check
                    aria-hidden="true"
                    className={cn("size-4", value.includes(field.name) ? "opacity-100" : "opacity-0")}
                  />
                  <span>{field.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{field.fieldType}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
