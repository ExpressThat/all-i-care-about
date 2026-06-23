import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
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
import { MetricFormulaBuilder } from "./MetricFormulaBuilder";
import { MetricGroupByPicker } from "./MetricGroupByPicker";
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
  listLogMetricFields,
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
import type { LogField } from "@/lib/providers/opensearch/logs";

const comparisons: ThresholdComparison[] = ["gt", "gte", "lt", "lte", "eq", "neq"];
const defaultThreshold = {
  comparison: "gt" as ThresholdComparison,
  enabled: true,
  value: 0,
};
const unitOptions = ["count", "ms", "seconds", "percent", "bytes", "requests", "errors", "custom"];

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
  const [groupFields, setGroupFields] = useState<LogField[]>([]);

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
  const canSave = Boolean(
    name.trim() &&
    definition.providerId &&
    definition.queries.every(isValidQuery) &&
    isValidFormula(definition),
  );

  useEffect(() => {
    const dataSource = definition.queries.find((query) => query.dataSource)?.dataSource;
    if (!definition.providerId || !dataSource) {
      setGroupFields([]);
      return;
    }
    let cancelled = false;
    void listLogMetricFields(definition.providerType, definition.providerId, dataSource).then((fields) => {
      if (!cancelled) {
        setGroupFields(fields);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [definition.providerId, definition.providerType, definition.queries]);

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

  const selectedUnit = unitOptions.includes(definition.unit ?? "") ? definition.unit : "custom";

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
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Provider</span>
              <Select
                onValueChange={(providerId) =>
                  setDefinition((current) => ({
                    ...current,
                    providerId,
                    providerType: "opensearch",
                    groupBy: [],
                    queries: current.queries.map((query) => ({
                      ...query,
                      dataSource: "",
                      filters: [],
                    })),
                  }))
                }
                value={definition.providerId}
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
            <MetricTimeRangeControls range={definition.timeRange} onChange={updateTimeRange} />
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Unit</span>
              <Select
                onValueChange={(unit) =>
                  setDefinition((current) => ({ ...current, unit: unit === "custom" ? "" : unit }))
                }
                value={selectedUnit}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedUnit === "custom" ? (
              <Input
                className="w-32"
                onChange={(event) =>
                  setDefinition((current) => ({ ...current, unit: event.currentTarget.value }))
                }
                placeholder="custom unit"
                value={definition.unit ?? ""}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Group by fields</span>
              <MetricGroupByPicker
                fields={groupFields}
                onChange={(groupBy) => setDefinition((current) => ({ ...current, groupBy }))}
                value={definition.groupBy}
              />
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Formula</span>
              <MetricFormulaBuilder
                formula={definition.formula}
                formulaConfig={definition.formulaConfig}
                onFormulaChange={(formula) => setDefinition((current) => ({ ...current, formula }))}
                onFormulaConfigChange={(formulaConfig) =>
                  setDefinition((current) => ({
                    ...current,
                    formula: formulaConfig.type === "advanced" ? formulaConfig.expression : current.formula,
                    formulaConfig,
                  }))
                }
                queries={definition.queries}
              />
            </div>
          </div>
        </div>

        {definition.queries.map((query, index) => (
          <MetricQueryEditor
            key={`${query.id}-${index}`}
            onChange={(nextQuery) => updateQuery(index, nextQuery)}
            onRemove={() =>
              setDefinition((current) => ({
                ...current,
                queries: current.queries.filter((_, currentIndex) => currentIndex !== index),
              }))
            }
            providerId={definition.providerId}
            providerType={definition.providerType}
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

function isValidQuery(query: LogMetricQuery) {
  if (!query.id.trim() || !query.dataSource) {
    return false;
  }
  if (query.aggregation === "count") {
    return true;
  }
  return Boolean(query.field);
}

function isValidFormula(definition: LogMetricDefinition) {
  const queryIds = new Set(definition.queries.map((query) => query.id));
  const formula = definition.formulaConfig;
  if (formula.type === "single") {
    return queryIds.has(formula.queryId);
  }
  if (formula.type === "advanced") {
    return formula.expression.trim().length > 0;
  }
  if (["difference", "ratio", "percentage"].includes(formula.operation)) {
    return formula.operands.length === 2 && formula.operands.every((operand) => queryIds.has(operand));
  }
  if (formula.operands.length < 2) {
    return false;
  }
  return formula.operands.every((operand) => queryIds.has(operand));
}
