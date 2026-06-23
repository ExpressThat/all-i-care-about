import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogFilters } from "@/components/log-viewer/LogFilters";
import type { ProviderType } from "@/lib/providers/providerTypes";
import {
  listLogMetricDataSources,
  listLogMetricFields,
  type LogMetricQuery,
  type MetricAggregation,
} from "@/lib/logMetrics/metrics";
import type { LogDataSource, LogField } from "@/lib/providers/opensearch/logs";

const aggregations: MetricAggregation[] = [
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "cardinality",
  "percentile",
];

export function MetricQueryEditor({
  onChange,
  onRemove,
  providerId,
  providerType,
  query,
}: {
  onChange: (query: LogMetricQuery) => void;
  onRemove: () => void;
  providerId: string;
  providerType: ProviderType;
  query: LogMetricQuery;
}) {
  const [dataSources, setDataSources] = useState<LogDataSource[]>([]);
  const [fields, setFields] = useState<LogField[]>([]);
  const numericFields = useMemo(
    () => fields.filter((field) => field.aggregatable && isAggregationField(query.aggregation, field)),
    [fields, query.aggregation],
  );

  useEffect(() => {
    if (!providerId) {
      setDataSources([]);
      return;
    }
    let cancelled = false;
    void listLogMetricDataSources(providerType, providerId).then(
      (sources) => {
        if (cancelled) {
          return;
        }
        setDataSources(sources);
        if (!query.dataSource && sources[0]) {
          onChange({ ...query, dataSource: sources[0].alias });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [providerId, providerType, query.dataSource]);

  useEffect(() => {
    if (!providerId || !query.dataSource) {
      setFields([]);
      return;
    }
    let cancelled = false;
    void listLogMetricFields(
      providerType,
      providerId,
      query.dataSource,
    ).then((nextFields) => {
      if (!cancelled) {
        setFields(nextFields);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [providerId, providerType, query.dataSource]);

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Query id
          </span>
          <Input
            className="w-20"
            onChange={(event) =>
              onChange({ ...query, id: event.currentTarget.value })
            }
            value={query.id}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Data source
          </span>
          <Select
            onValueChange={(dataSource) => onChange({ ...query, dataSource })}
            value={query.dataSource}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              {dataSources.map((source) => (
                <SelectItem key={source.alias} value={source.alias}>
                  {source.alias}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Aggregation
          </span>
          <Select
            onValueChange={(aggregation) =>
              onChange({
                ...query,
                aggregation: aggregation as MetricAggregation,
              })
            }
            value={query.aggregation}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aggregations.map((aggregation) => (
                <SelectItem key={aggregation} value={aggregation}>
                  {aggregation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {query.aggregation !== "count" ? (
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Field
            </span>
            <Select
              onValueChange={(field) => onChange({ ...query, field })}
              value={query.field}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {query.aggregation === "percentile" ? (
          <Input
            className="w-24"
            max={100}
            min={0}
            onChange={(event) =>
              onChange({ ...query, percentile: Number(event.currentTarget.value) })
            }
            type="number"
            value={query.percentile ?? 95}
          />
        ) : null}
        <Button onClick={onRemove} type="button" variant="ghost">
          <Trash2 aria-hidden="true" className="size-4" />
          Remove
        </Button>
      </div>
      {query.dataSource ? (
        <LogFilters
          alias={query.dataSource}
          fields={fields}
          filters={query.filters}
          onFiltersChange={(filters) => onChange({ ...query, filters })}
          providerId={providerId}
        />
      ) : null}
    </div>
  );
}

function isAggregationField(aggregation: MetricAggregation, field: LogField) {
  if (aggregation === "cardinality") {
    return field.aggregatable;
  }
  if (aggregation === "count") {
    return false;
  }
  return ["integer", "long", "short", "byte", "float", "double", "half_float", "scaled_float", "date"].includes(field.fieldType);
}
