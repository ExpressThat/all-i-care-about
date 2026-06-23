import { Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricQueryEditor } from "./MetricQueryEditor";
import { MetricPreview } from "./MetricPreview";
import { MetricTimeRangeControls } from "./MetricTimeRangeControls";
import {
  defaultMetricDefinition,
  defaultMetricQuery,
  nextQueryId,
  normalizeMetricDefinition,
} from "./metricDefaults";
import {
  evaluateLogMetricPreview,
  saveLogMetric,
  type LogMetricDefinition,
  type LogMetricEvaluation,
  type LogMetricQuery,
  type SavedLogMetric,
  type ThresholdComparison,
} from "@/lib/logMetrics/metrics";
import type { LogTimeRange } from "@/lib/logSearches/timeRange";
import { useSetting } from "@/lib/settings/settingsStore";
import type { ProviderInstance } from "@/lib/providers/providerTypes";

const comparisons: ThresholdComparison[] = ["gt", "gte", "lt", "lte", "eq", "neq"];
const defaultThreshold = {
  comparison: "gt" as ThresholdComparison,
  enabled: true,
  value: 0,
};

export function MetricBuilderPage({
  metricToOpen,
  onMetricApplied,
}: {
  metricToOpen?: SavedLogMetric | null;
  onMetricApplied?: () => void;
}) {
  const providers = useSetting("Providers");
  const logProviders = providers.filter(
    (provider): provider is ProviderInstance<"opensearch"> =>
      provider.type === "opensearch" &&
      provider.enabledCapabilities.includes("Logs"),
  );
  const fallbackProviderId = logProviders[0]?.id ?? "";
  const [activeMetric, setActiveMetric] = useState<SavedLogMetric | null>(null);
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState<LogMetricDefinition>(() =>
    defaultMetricDefinition(fallbackProviderId),
  );
  const [preview, setPreview] = useState<LogMetricEvaluation | null>(null);

  useEffect(() => {
    if (!metricToOpen) {
      return;
    }
    setActiveMetric(metricToOpen);
    setName(metricToOpen.name);
    setDefinition(normalizeMetricDefinition(metricToOpen.definition, fallbackProviderId));
    onMetricApplied?.();
  }, [fallbackProviderId, metricToOpen, onMetricApplied]);

  const threshold = definition.threshold ?? undefined;
  const hasActiveMetric = activeMetric !== null;
  const canSave = name.trim() && definition.queries.every((query) => query.providerId && query.dataSource);

  function updateTimeRange(timeRange: LogTimeRange) {
    setDefinition((current) => ({ ...current, timeRange }));
  }

  function updateQuery(index: number, query: LogMetricQuery) {
    setDefinition((current) => ({
      ...current,
      queries: current.queries.map((candidate, currentIndex) =>
        currentIndex === index ? query : candidate,
      ),
    }));
  }

  function addQuery() {
    setDefinition((current) => ({
      ...current,
      queries: [
        ...current.queries,
        defaultMetricQuery(nextQueryId(current.queries), fallbackProviderId),
      ],
    }));
  }

  async function previewMetric() {
    const result = await evaluateLogMetricPreview({ name: name || "Preview", definition });
    setPreview(result);
  }

  async function saveMetric(id?: string) {
    try {
      const saved = await saveLogMetric({ id, name, definition });
      setActiveMetric(saved);
      toast.success("Saved log metric");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  const groupByText = useMemo(() => definition.groupBy.join(", "), [definition.groupBy]);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Metrics</h2>
        <p className="text-sm text-muted-foreground">
          Build provider-generic metrics from log queries.
        </p>
        {activeMetric ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Editing saved metric <span className="font-medium text-foreground">{activeMetric.name}</span>
          </p>
        ) : null}
      </header>
      <section className="themed-scrollbar grid gap-4 overflow-auto p-6">
        <div className="grid gap-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <Input className="w-72" onChange={(event) => setName(event.currentTarget.value)} value={name} />
            </div>
            <MetricTimeRangeControls range={definition.timeRange} onChange={updateTimeRange} />
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Unit</span>
              <Input
                className="w-28"
                onChange={(event) =>
                  setDefinition((current) => ({ ...current, unit: event.currentTarget.value }))
                }
                placeholder="count"
                value={definition.unit ?? ""}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Group by fields</span>
              <Input
                className="w-96"
                onChange={(event) =>
                  setDefinition((current) => ({
                    ...current,
                    groupBy: event.currentTarget.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="service, environment"
                value={groupByText}
              />
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Formula</span>
              <Input
                className="w-72"
                onChange={(event) =>
                  setDefinition((current) => ({ ...current, formula: event.currentTarget.value }))
                }
                placeholder="A / B * 100"
                value={definition.formula}
              />
            </div>
          </div>
        </div>

        {definition.queries.map((query, index) => (
          <MetricQueryEditor
            key={`${query.id}-${index}`}
            logProviders={logProviders}
            onChange={(nextQuery) => updateQuery(index, nextQuery)}
            onRemove={() =>
              setDefinition((current) => ({
                ...current,
                queries: current.queries.filter((_, currentIndex) => currentIndex !== index),
              }))
            }
            query={query}
          />
        ))}

        <Button className="w-fit" onClick={addQuery} type="button" variant="outline">
          <Plus aria-hidden="true" className="size-4" />
          Add query
        </Button>

        <div className="grid gap-3 rounded-lg border p-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={threshold?.enabled ?? false}
              onCheckedChange={(checked) =>
                setDefinition((current) => ({
                  ...current,
                  threshold: {
                    comparison: current.threshold?.comparison ?? "gt",
                    enabled: checked === true,
                    value: current.threshold?.value ?? 0,
                  },
                }))
              }
            />
            Enable threshold
          </label>
          {threshold?.enabled ? (
            <div className="flex flex-wrap gap-3">
              <Select
                onValueChange={(comparison) =>
                  setDefinition((current) => ({
                    ...current,
                    threshold: {
                      ...(current.threshold ?? { enabled: true, value: 0, comparison: "gt" }),
                      comparison: comparison as ThresholdComparison,
                    },
                  }))
                }
                value={threshold.comparison ?? "gt"}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {comparisons.map((comparison) => (
                    <SelectItem key={comparison} value={comparison}>
                      {comparison}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-32"
                onChange={(event) => {
                  const nextValue = Number(event.currentTarget.value);
                  setDefinition((current) => ({
                    ...current,
                    threshold: {
                      ...(current.threshold ?? defaultThreshold),
                      value: nextValue,
                    },
                  }));
                }}
                type="number"
                value={threshold.value ?? 0}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void previewMetric()} type="button" variant="outline">
            Preview
          </Button>
          <Button disabled={!canSave} onClick={() => void saveMetric(activeMetric?.id)} type="button">
            <Save aria-hidden="true" className="size-4" />
            {hasActiveMetric ? "Update metric" : "Save metric"}
          </Button>
          {hasActiveMetric ? (
            <Button disabled={!canSave} onClick={() => void saveMetric()} type="button" variant="ghost">
              Save as new
            </Button>
          ) : null}
        </div>

        {preview ? <MetricPreview evaluation={preview} unit={definition.unit} /> : null}
      </section>
    </div>
  );
}
