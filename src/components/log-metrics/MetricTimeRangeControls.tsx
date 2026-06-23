import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultLogTimeRange,
  type LogTimeRange,
  type RelativeTimeUnit,
} from "@/lib/logSearches/timeRange";

const units: RelativeTimeUnit[] = ["minutes", "hours", "days"];

export function MetricTimeRangeControls({
  onChange,
  range,
}: {
  onChange: (range: LogTimeRange) => void;
  range: LogTimeRange;
}) {
  return (
    <>
      <Select
        onValueChange={(mode) =>
          onChange(
            mode === "absolute"
              ? {
                  end: new Date().toISOString(),
                  mode: "absolute",
                  start: new Date().toISOString(),
                }
              : defaultLogTimeRange(),
          )
        }
        value={range.mode}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="relative">Relative</SelectItem>
          <SelectItem value="absolute">Absolute</SelectItem>
        </SelectContent>
      </Select>
      {range.mode === "relative" ? (
        <>
          <Input
            className="w-24"
            min={1}
            onChange={(event) =>
              onChange({ ...range, amount: Number(event.currentTarget.value) })
            }
            type="number"
            value={range.amount}
          />
          <Select
            onValueChange={(unit) =>
              onChange({ ...range, unit: unit as RelativeTimeUnit })
            }
            value={range.unit}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        <>
          <Input
            className="w-56"
            onChange={(event) => onChange({ ...range, start: event.currentTarget.value })}
            value={range.start}
          />
          <Input
            className="w-56"
            onChange={(event) => onChange({ ...range, end: event.currentTarget.value })}
            value={range.end}
          />
        </>
      )}
    </>
  );
}
