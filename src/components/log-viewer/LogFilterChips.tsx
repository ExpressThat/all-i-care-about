import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  LogFilterOperator,
  LogSearchFilter,
} from "@/lib/providers/opensearch/logs";

const operatorLabels: Record<LogFilterOperator, string> = {
  contains: "contains",
  exists: "exists",
  is: "is",
  isNot: "is not",
};

export function LogFilterChips({
  filters,
  onEditFilter,
  onFiltersChange,
}: {
  filters: LogSearchFilter[];
  onEditFilter: (index: number) => void;
  onFiltersChange: (filters: LogSearchFilter[]) => void;
}) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter, index) => (
        <div
          className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
          key={`${filter.field}-${filter.operator}-${filter.value}-${index}`}
        >
          <span>
            {filter.field} {operatorLabels[filter.operator]}
            {filter.operator !== "exists" ? ` ${filter.value}` : ""}
          </span>
          <Button
            aria-label={`Edit ${filter.field} filter`}
            className="size-5 text-secondary-foreground hover:text-foreground"
            onClick={() => onEditFilter(index)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil aria-hidden="true" className="size-3" />
          </Button>
          <Button
            aria-label={`Remove ${filter.field} filter`}
            className="size-5 text-secondary-foreground hover:text-foreground"
            onClick={() =>
              onFiltersChange(filters.filter((_, current) => current !== index))
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
