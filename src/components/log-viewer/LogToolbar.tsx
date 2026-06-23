import { RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderInstance } from "@/lib/providers/providerTypes";
import type { LogDataSource } from "@/lib/providers/opensearch/logs";
import {
  type LogTimeRange,
  type RelativeTimeUnit,
  resolveTimeRange,
  toDatetimeLocalValue,
} from "@/lib/logSearches/timeRange";

const relativeUnits: RelativeTimeUnit[] = ["minutes", "hours", "days"];

export function LogToolbar({
  aliases,
  hasActiveSavedSearch,
  loading,
  onAliasChange,
  onProviderChange,
  onRefresh,
  onSaveAsNew,
  onSaveSearch,
  onTimeRangeChange,
  providerId,
  providers,
  selectedAlias,
  timeRange,
}: {
  aliases: LogDataSource[];
  hasActiveSavedSearch: boolean;
  loading: boolean;
  onAliasChange: (alias: string) => void;
  onProviderChange: (providerId: string) => void;
  onRefresh: () => void;
  onSaveAsNew: () => void;
  onSaveSearch: () => void;
  onTimeRangeChange: (range: LogTimeRange) => void;
  providerId: string;
  providers: ProviderInstance<"opensearch">[];
  selectedAlias: string;
  timeRange: LogTimeRange;
}) {
  const resolved = resolveTimeRange(timeRange);

  return (
    <div className="grid gap-3 border-b px-6 py-4">
      <div className="flex flex-wrap items-end gap-3">
        {providers.length > 1 ? (
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Provider
            </span>
            <Select onValueChange={onProviderChange} value={providerId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Index alias
          </span>
          <Select
            disabled={aliases.length === 0}
            onValueChange={onAliasChange}
            value={selectedAlias}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a data source" />
            </SelectTrigger>
            <SelectContent>
              {aliases.map((source) => (
                <SelectItem key={source.alias} value={source.alias}>
                  {source.alias}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Range
          </span>
          <Select
            onValueChange={(mode) => {
              if (mode === "absolute") {
                const end = new Date();
                const start = new Date(end.getTime() - 15 * 60 * 60 * 1000);
                onTimeRangeChange({
                  mode: "absolute",
                  start: toDatetimeLocalValue(start),
                  end: toDatetimeLocalValue(end),
                });
              } else {
                onTimeRangeChange({
                  mode: "relative",
                  amount: 15,
                  unit: "hours",
                });
              }
            }}
            value={timeRange.mode}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relative">Relative</SelectItem>
              <SelectItem value="absolute">Absolute</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {timeRange.mode === "relative" ? (
          <>
            <Input
              className="w-24"
              min={1}
              onChange={(event) =>
                onTimeRangeChange({
                  ...timeRange,
                  amount: Number(event.currentTarget.value),
                })
              }
              type="number"
              value={timeRange.amount}
            />
            <Select
              onValueChange={(unit) =>
                onTimeRangeChange({
                  ...timeRange,
                  unit: unit as RelativeTimeUnit,
                })
              }
              value={timeRange.unit}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {relativeUnits.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit} ago
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <>
            <Input
              className="w-48"
              onChange={(event) =>
                onTimeRangeChange({
                  ...timeRange,
                  start: event.currentTarget.value,
                })
              }
              type="datetime-local"
              value={timeRange.start}
            />
            <Input
              className="w-48"
              onChange={(event) =>
                onTimeRangeChange({
                  ...timeRange,
                  end: event.currentTarget.value,
                })
              }
              type="datetime-local"
              value={timeRange.end}
            />
          </>
        )}

        <Button
          disabled={loading || !providerId || !selectedAlias}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Refresh
        </Button>
        <Button
          disabled={!providerId || !selectedAlias}
          onClick={onSaveSearch}
          type="button"
          variant="outline"
        >
          <Save aria-hidden="true" className="size-4" />
          {hasActiveSavedSearch ? "Update search" : "Save search"}
        </Button>
        {hasActiveSavedSearch ? (
          <Button
            disabled={!providerId || !selectedAlias}
            onClick={onSaveAsNew}
            type="button"
            variant="ghost"
          >
            Save as new
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{resolved.label}</p>
    </div>
  );
}
