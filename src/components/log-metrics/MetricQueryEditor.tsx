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
import type { ProviderInstance } from "@/lib/providers/providerTypes";
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
  logProviders,
  onChange,
  onRemove,
  query,
}: {
  logProviders: ProviderInstance<"opensearch">[];
  onChange: (query: LogMetricQuery) => void;
  onRemove: () => void;
  query: LogMetricQuery;
}) {
  const [dataSources, setDataSources] = useState<LogDataSource[]>([]);
  const [fields, setFields] = useState<LogField[]>([]);
  const numericFields = useMemo(
    () => fields.filter((field) => field.aggregatable),
    [fields],
  );

  useEffect(() => {
    if (!query.providerId) {
      setDataSources([]);
      return;
    }
    let cancelled = false;
    void listLogMetricDataSources(query.providerType, query.providerId).then(
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
  }, [query.providerId, query.providerType, query.dataSource]);

  useEffect(() => {
    if (!query.providerId || !query.dataSource) {
      setFields([]);
      return;
    }
    let cancelled = false;
    void listLogMetricFields(
      query.providerType,
      query.providerId,
      query.dataSource,
    ).then((nextFields) => {
      if (!cancelled) {
        setFields(nextFields);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query.providerId, query.providerType, query.dataSource]);

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
            Provider
          </span>
          <Select
            onValueChange={(providerId) =>
              onChange({
                ...query,
                dataSource: "",
                providerId,
                providerType: "opensearch",
              })
            }
            value={query.providerId}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {logProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          providerId={query.providerId}
        />
      ) : null}
    </div>
  );
}
