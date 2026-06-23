import { Check, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listOpenSearchFieldValues,
  type LogField,
  type LogFilterOperator,
  type LogSearchFilter,
} from "@/lib/providers/opensearch/logs";
import { LogFilterChips } from "./LogFilterChips";
import { FieldSearchInput, ValueSearchInput } from "./LogSearchInputs";

const operators: { value: LogFilterOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "isNot", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "exists", label: "exists" },
];

export function LogFilters({
  alias,
  fields,
  filters,
  onFiltersChange,
  providerId,
}: {
  alias: string;
  fields: LogField[];
  filters: LogSearchFilter[];
  onFiltersChange: (filters: LogSearchFilter[]) => void;
  providerId: string;
}) {
  const [field, setField] = useState("");
  const [operator, setOperator] = useState<LogFilterOperator>("is");
  const [value, setValue] = useState("");
  const [valueSearch, setValueSearch] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [valuesLoading, setValuesLoading] = useState(false);
  const [valueError, setValueError] = useState<string | undefined>();
  const [nextAfterKey, setNextAfterKey] = useState<string | undefined>();
  const [capped, setCapped] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const selectedField = fields.find((candidate) => candidate.name === field);
  const showValue = operator !== "exists";
  const canTypeaheadSearch =
    selectedField?.fieldType === "keyword" ||
    selectedField?.fieldType === "text" ||
    selectedField?.fieldType === "_index";

  const filteredFields = useMemo(
    () => fields.filter((candidate) => candidate.searchable),
    [fields],
  );

  useEffect(() => {
    setValues([]);
    setNextAfterKey(undefined);
    setCapped(false);
    setValueError(undefined);

    if (!providerId || !alias || !field || !selectedField?.aggregatable) {
      setValuesLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setValuesLoading(true);
      void listOpenSearchFieldValues({
        alias,
        field,
        providerId,
        query: canTypeaheadSearch ? valueSearch : undefined,
      })
        .then((page) => {
          if (cancelled) {
            return;
          }
          setValues(page.values);
          setNextAfterKey(page.nextAfterKey);
          setCapped(page.capped);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          setValueError(error instanceof Error ? error.message : String(error));
        })
        .finally(() => {
          if (!cancelled) {
            setValuesLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    alias,
    canTypeaheadSearch,
    field,
    providerId,
    selectedField?.aggregatable,
    valueSearch,
  ]);

  useEffect(() => {
    if (editingIndex !== null && !filters[editingIndex]) {
      resetDraft();
    }
  }, [editingIndex, filters]);

  async function loadMoreValues() {
    if (!nextAfterKey || !field) {
      return;
    }
    setValuesLoading(true);
    setValueError(undefined);
    try {
      const page = await listOpenSearchFieldValues({
        afterKey: nextAfterKey,
        alias,
        field,
        loaded: values.length,
        providerId,
        query: canTypeaheadSearch ? valueSearch : undefined,
      });
      setValues((current) => [...current, ...page.values]);
      setNextAfterKey(page.nextAfterKey);
      setCapped(page.capped);
    } catch (error) {
      setValueError(error instanceof Error ? error.message : String(error));
    } finally {
      setValuesLoading(false);
    }
  }

  function resetDraft() {
    setEditingIndex(null);
    setField("");
    setOperator("is");
    setValue("");
    setValueSearch("");
  }

  function editFilter(index: number) {
    const filter = filters[index];
    if (!filter) {
      return;
    }
    setEditingIndex(index);
    setField(filter.field);
    setOperator(filter.operator);
    setValue(filter.value);
    setValueSearch(filter.value);
  }

  function saveFilter() {
    if (!field || (showValue && !value)) {
      return;
    }
    const nextFilter = {
      field,
      operator,
      value: showValue ? value : "",
    };
    if (editingIndex === null) {
      onFiltersChange([...filters, nextFilter]);
      resetDraft();
      return;
    }
    onFiltersChange(
      filters.map((filter, index) =>
        index === editingIndex ? nextFilter : filter,
      ),
    );
    resetDraft();
  }

  return (
    <div className="grid gap-3 border-b px-6 py-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Field
          </span>
          <div className="w-64">
            <FieldSearchInput
              fields={filteredFields}
              onValueChange={setField}
              value={field}
            />
          </div>
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Operator
          </span>
          <Select
            onValueChange={(next) => setOperator(next as LogFilterOperator)}
            value={operator}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((candidate) => (
                <SelectItem key={candidate.value} value={candidate.value}>
                  {candidate.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showValue ? (
          <div className="grid min-w-64 gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Value
            </span>
            <ValueSearchInput
              loading={valuesLoading}
              onSearchChange={setValueSearch}
              onValueChange={setValue}
              suggestions={values}
              value={value}
              valueError={valueError}
            />
          </div>
        ) : null}
        <Button onClick={saveFilter} type="button">
          {editingIndex === null ? (
            <Plus aria-hidden="true" className="size-4" />
          ) : (
            <Check aria-hidden="true" className="size-4" />
          )}
          {editingIndex === null ? "Add filter" : "Save filter"}
        </Button>
        {editingIndex !== null ? (
          <Button onClick={resetDraft} type="button" variant="outline">
            <X aria-hidden="true" className="size-4" />
            Cancel
          </Button>
        ) : null}
        {nextAfterKey ? (
          <Button
            onClick={() => void loadMoreValues()}
            type="button"
            variant="outline"
          >
            Load more values
          </Button>
        ) : null}
        {capped ? (
          <span className="text-xs text-muted-foreground">
            Value suggestions capped at 1000.
          </span>
        ) : null}
      </div>

      <LogFilterChips
        filters={filters}
        onEditFilter={editFilter}
        onFiltersChange={onFiltersChange}
      />
    </div>
  );
}
