import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { LogField } from "@/lib/providers/opensearch/logs";

export function FieldSearchInput({
  fields,
  onValueChange,
  value,
}: {
  fields: LogField[];
  onValueChange: (field: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const filteredFields = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return fields;
    }
    return fields.filter((field) =>
      field.name.toLowerCase().includes(normalized),
    );
  }, [fields, search]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Select a field"
          value={search}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setSearch}
            placeholder="Search fields..."
            value={search}
          />
          <CommandList>
            <CommandEmpty>No fields found.</CommandEmpty>
            <CommandGroup>
              {filteredFields.map((field) => (
                <CommandItem
                  key={field.name}
                  onSelect={() => {
                    onValueChange(field.name);
                    setSearch(field.name);
                    setOpen(false);
                  }}
                  value={field.name}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "size-4",
                      field.name === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>{field.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {field.fieldType}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ValueSearchInput({
  loading,
  onSearchChange,
  onValueChange,
  suggestions,
  value,
  valueError,
}: {
  loading: boolean;
  onSearchChange: (search: string) => void;
  onValueChange: (value: string) => void;
  suggestions: string[];
  value: string;
  valueError?: string;
}) {
  const [open, setOpen] = useState(false);
  const trimmedValue = value.trim();
  const showFreeform =
    trimmedValue.length > 0 && !suggestions.includes(trimmedValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          onChange={(event) => {
            onValueChange(event.currentTarget.value);
            onSearchChange(event.currentTarget.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Type or choose a value"
          value={value}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={(nextValue) => {
              onValueChange(nextValue);
              onSearchChange(nextValue);
            }}
            placeholder="Search values..."
            value={value}
          />
          <CommandList>
            {loading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Searching matching values...
              </div>
            ) : null}
            {valueError ? (
              <div className="px-3 py-2 text-sm text-destructive">
                {valueError}
              </div>
            ) : null}
            <CommandEmpty>
              {loading ? "Searching..." : "No matching values found."}
            </CommandEmpty>
            <CommandGroup>
              {showFreeform ? (
                <CommandItem
                  onSelect={() => {
                    onValueChange(trimmedValue);
                    setOpen(false);
                  }}
                  value={trimmedValue}
                >
                  Use "{trimmedValue}"
                </CommandItem>
              ) : null}
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  onSelect={() => {
                    onValueChange(suggestion);
                    onSearchChange(suggestion);
                    setOpen(false);
                  }}
                  value={suggestion}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "size-4",
                      suggestion === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{suggestion}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
