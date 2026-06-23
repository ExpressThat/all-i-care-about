import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { X } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  DashboardWidget,
  MetricVisualization,
  SavedLogMetric,
} from "@/lib/logMetrics/metrics";

const chartConfig = { value: { label: "Value", color: "var(--primary)" } } satisfies ChartConfig;
const visualizations: MetricVisualization[] = [
  "number",
  "status",
  "gauge",
  "table",
  "bar",
  "horizontalBar",
  "line",
  "area",
  "pie",
];

export function MetricWidget({
  allMetrics,
  metrics,
  onMetricIdsChange,
  onRemove,
  onVisualizationChange,
  widget,
}: {
  allMetrics: SavedLogMetric[];
  metrics: SavedLogMetric[];
  onMetricIdsChange: (metricIds: string[]) => void;
  onRemove: () => void;
  onVisualizationChange: (visualization: MetricVisualization) => void;
  widget: DashboardWidget;
}) {
  const primaryMetric = metrics[0];
  const title = widget.title || titleForWidget(widget.visualization, metrics);
  const evaluation = primaryMetric?.latestEvaluation;
  const value = evaluation?.value ?? 0;
  const data = chartDataFor(metrics, title);
  const tableRows = tableRowsFor(metrics);
  const thresholdValue = primaryMetric?.definition.threshold?.value;
  const gaugeValue =
    thresholdValue && thresholdValue > 0
      ? Math.min(100, Math.round((Math.abs(value) / Math.abs(thresholdValue)) * 100))
      : Math.min(100, Math.max(0, Math.round(Math.abs(value))));
  const anyTriggered = metrics.some((metric) => metric.latestEvaluation?.triggered);
  const allOk = metrics.length > 0 && metrics.every((metric) => metric.latestEvaluation?.status === "ok");
  const statusTone = anyTriggered
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : allOk
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "border-muted bg-muted/40 text-muted-foreground";

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-7 px-2 text-xs" type="button" variant="outline">
                {metrics.length || "Metrics"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Metrics</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allMetrics.length === 0 ? (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  No saved metrics.
                </div>
              ) : (
                allMetrics.map((metric) => (
                  <DropdownMenuCheckboxItem
                    checked={widget.metricIds.includes(metric.id)}
                    key={metric.id}
                    onCheckedChange={(checked) =>
                      onMetricIdsChange(toggleMetricId(widget.metricIds, metric.id, checked === true))
                    }
                    onSelect={(event) => event.preventDefault()}
                  >
                    <span className="truncate">{metric.name}</span>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Select onValueChange={(value) => onVisualizationChange(value as MetricVisualization)} value={widget.visualization}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visualizations.map((visualization) => (
                <SelectItem key={visualization} value={visualization}>
                  {visualization}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="size-7" onClick={onRemove} size="icon" type="button" variant="ghost">
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-3">
        {metrics.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Select metrics for this widget.
          </div>
        ) : widget.visualization === "number" ? (
          <div className="flex h-full flex-col justify-center">
            <div className="text-3xl font-semibold">
              {evaluation?.value ?? "-"} {primaryMetric.definition.unit}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {evaluation?.status ?? "not evaluated"}
            </div>
          </div>
        ) : widget.visualization === "status" ? (
          <div className={`flex h-full flex-col justify-center rounded-md border p-4 ${statusTone}`}>
            <div className="text-xs font-medium uppercase tracking-wide">
              {evaluation?.status ?? "not evaluated"}
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {metrics.filter((metric) => metric.latestEvaluation?.triggered).length} / {metrics.length}
            </div>
            <div className="mt-2 text-sm">
              {anyTriggered ? "Threshold triggered" : "Threshold clear"}
            </div>
          </div>
        ) : widget.visualization === "gauge" ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center">
            <ChartContainer className="h-full max-h-48 w-full" config={chartConfig}>
              <RadialBarChart
                data={[{ fill: "var(--color-value)", name: "value", value: gaugeValue }]}
                endAngle={0}
                innerRadius="70%"
                outerRadius="100%"
                startAngle={180}
              >
                <RadialBar background cornerRadius={8} dataKey="value" />
              </RadialBarChart>
            </ChartContainer>
            <div className="-mt-6 text-center">
              <div className="text-2xl font-semibold">
                {evaluation?.value ?? "-"} {primaryMetric.definition.unit}
              </div>
              <div className="text-xs text-muted-foreground">
                {thresholdValue ? `${gaugeValue}% of threshold` : `${gaugeValue}%`}
              </div>
            </div>
          </div>
        ) : widget.visualization === "table" ? (
          <div className="themed-scrollbar h-full overflow-auto text-sm">
            {tableRows.map((row) => (
              <div className="flex justify-between gap-3 border-b py-1" key={row.label}>
                <span className="truncate">{row.label}</span>
                <span className="shrink-0">{row.value} {row.unit}</span>
              </div>
            ))}
          </div>
        ) : widget.visualization === "bar" || widget.visualization === "horizontalBar" ? (
          <ChartContainer className="h-full w-full" config={chartConfig}>
            <BarChart data={data} layout={widget.visualization === "horizontalBar" ? "vertical" : "horizontal"}>
              <CartesianGrid vertical={false} />
              {widget.visualization === "horizontalBar" ? <YAxis dataKey="label" type="category" /> : <XAxis dataKey="label" />}
              {widget.visualization === "horizontalBar" ? <XAxis type="number" /> : null}
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={2} />
            </BarChart>
          </ChartContainer>
        ) : widget.visualization === "line" ? (
          <ChartContainer className="h-full w-full" config={chartConfig}>
            <LineChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="value" dot={data.length < 20} stroke="var(--color-value)" strokeWidth={2} type="monotone" />
            </LineChart>
          </ChartContainer>
        ) : widget.visualization === "area" ? (
          <ChartContainer className="h-full w-full" config={chartConfig}>
            <AreaChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="value" fill="var(--color-value)" fillOpacity={0.25} stroke="var(--color-value)" type="monotone" />
            </AreaChart>
          </ChartContainer>
        ) : widget.visualization === "pie" ? (
          <ChartContainer className="h-full w-full" config={chartConfig}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={data} dataKey="value" nameKey="label">
                {data.map((row, index) => (
                  <Cell
                    fill={index === 0 ? "var(--color-value)" : `hsl(var(--muted-foreground) / ${Math.max(0.25, 0.85 - index * 0.12)})`}
                    key={row.label}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          null
        )}
      </div>
    </div>
  );
}

function titleForWidget(visualization: MetricVisualization, metrics: SavedLogMetric[]) {
  if (metrics.length === 1) {
    return metrics[0].name;
  }
  return `${visualization} widget`;
}

function toggleMetricId(metricIds: string[], metricId: string, checked: boolean) {
  if (checked) {
    return metricIds.includes(metricId) ? metricIds : [...metricIds, metricId];
  }
  return metricIds.filter((candidate) => candidate !== metricId);
}

function chartDataFor(metrics: SavedLogMetric[], fallbackLabel: string) {
  if (metrics.length === 1) {
    const metric = metrics[0];
    const grouped = metric.latestEvaluation?.groups.map((group) => ({
      label: Object.values(group.key).join(" / "),
      value: group.value,
    })) ?? [];
    return grouped.length > 0
      ? grouped
      : [{ label: metric.name || fallbackLabel, value: metric.latestEvaluation?.value ?? 0 }];
  }

  return metrics.map((metric) => ({
    label: metric.name,
    value: metric.latestEvaluation?.value ?? 0,
  }));
}

function tableRowsFor(metrics: SavedLogMetric[]) {
  return metrics.flatMap((metric) => {
    const groups = metric.latestEvaluation?.groups ?? [];
    if (groups.length === 0) {
      return [{
        label: metric.name,
        unit: metric.definition.unit ?? "",
        value: metric.latestEvaluation?.value ?? "-",
      }];
    }

    return groups.map((group) => ({
      label: `${metric.name} · ${Object.values(group.key).join(" / ")}`,
      unit: metric.definition.unit ?? "",
      value: group.value,
    }));
  });
}
