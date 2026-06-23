import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Responsive, type ResponsiveLayouts } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricWidget } from "./MetricWidget";
import {
  listMetricDashboards,
  listSavedLogMetrics,
  deleteMetricDashboard,
  saveMetricDashboard,
  type DashboardWidget,
  type MetricDashboard,
  type MetricVisualization,
  type SavedLogMetric,
} from "@/lib/logMetrics/metrics";

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

export function MetricDashboardsPage() {
  const [dashboards, setDashboards] = useState<MetricDashboard[]>([]);
  const [metrics, setMetrics] = useState<SavedLogMetric[]>([]);
  const [activeId, setActiveId] = useState("");
  const [dashboardName, setDashboardName] = useState("");
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLElement>(null);
  const activeDashboard = dashboards.find((dashboard) => dashboard.id === activeId);
  const metricsById = useMemo(
    () => new Map(metrics.map((metric) => [metric.id, metric])),
    [metrics],
  );

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setDashboardName(activeDashboard?.name ?? "");
  }, [activeDashboard?.id, activeDashboard?.name]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  async function load() {
    const [nextDashboards, nextMetrics] = await Promise.all([
      listMetricDashboards(),
      listSavedLogMetrics(),
    ]);
    setDashboards(nextDashboards);
    setMetrics(nextMetrics);
    setActiveId((current) => current || nextDashboards[0]?.id || "");
  }

  async function createDashboard() {
    const saved = await saveMetricDashboard({
      name: "New dashboard",
      definition: { widgets: [] },
    });
    setDashboards((current) => [saved, ...current]);
    setActiveId(saved.id);
  }

  async function addWidget(visualization: MetricVisualization) {
    if (!activeDashboard) {
      return;
    }
    const widgetId = `widget_${Date.now()}`;
    const widget: DashboardWidget = {
      id: widgetId,
      layout: { lg: defaultWidgetLayout(widgetId, visualization) },
      metricIds: [],
      options: {},
      visualization,
    };
    await saveDashboardWidgets([...activeDashboard.definition.widgets, widget]);
  }

  async function saveDashboardWidgets(widgets: DashboardWidget[]) {
    if (!activeDashboard) {
      return;
    }
    const saved = await saveMetricDashboard({
      id: activeDashboard.id,
      name: activeDashboard.name,
      definition: { widgets },
    });
    setDashboards((current) => current.map((dashboard) => (dashboard.id === saved.id ? saved : dashboard)));
  }

  async function renameDashboard() {
    if (!activeDashboard || !dashboardName.trim()) {
      return;
    }
    const saved = await saveMetricDashboard({
      id: activeDashboard.id,
      name: dashboardName,
      definition: activeDashboard.definition,
    });
    setDashboards((current) => current.map((dashboard) => (dashboard.id === saved.id ? saved : dashboard)));
  }

  async function deleteDashboard() {
    if (!activeDashboard) {
      return;
    }
    await deleteMetricDashboard(activeDashboard.id);
    setDashboards((current) => {
      const next = current.filter((dashboard) => dashboard.id !== activeDashboard.id);
      setActiveId(next[0]?.id ?? "");
      return next;
    });
  }

  async function updateWidget(nextWidget: DashboardWidget) {
    if (!activeDashboard) {
      return;
    }
    await saveDashboardWidgets(
      activeDashboard.definition.widgets.map((widget) =>
        widget.id === nextWidget.id ? nextWidget : widget,
      ),
    );
  }

  async function removeWidget(widgetId: string) {
    if (!activeDashboard) {
      return;
    }
    await saveDashboardWidgets(
      activeDashboard.definition.widgets.filter((widget) => widget.id !== widgetId),
    );
  }

  async function saveLayout(layouts: ResponsiveLayouts) {
    if (!activeDashboard) {
      return;
    }
    await saveDashboardWidgets(
      activeDashboard.definition.widgets.map((widget) => ({
        ...widget,
        layout: {
          ...widget.layout,
          lg: layouts.lg?.find((layout) => layout.i === widget.id) ?? widget.layout.lg,
          md: layouts.md?.find((layout) => layout.i === widget.id) ?? widget.layout.md,
          sm: layouts.sm?.find((layout) => layout.i === widget.id) ?? widget.layout.sm,
        },
      })),
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Metric Dashboards</h2>
          <p className="text-sm text-muted-foreground">Arrange saved metrics as dashboard widgets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select onValueChange={setActiveId} value={activeId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select dashboard" />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map((dashboard) => (
                <SelectItem key={dashboard.id} value={dashboard.id}>
                  {dashboard.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void createDashboard()} type="button">
            <Plus aria-hidden="true" className="size-4" />
            Dashboard
          </Button>
          {activeDashboard ? (
            <>
              <Input
                className="w-48"
                onChange={(event) => setDashboardName(event.currentTarget.value)}
                value={dashboardName}
              />
              <Button disabled={!dashboardName.trim()} onClick={() => void renameDashboard()} type="button" variant="outline">
                <Save aria-hidden="true" className="size-4" />
                Rename
              </Button>
              <Button onClick={() => void deleteDashboard()} type="button" variant="ghost">
                <Trash2 aria-hidden="true" className="size-4" />
                Delete
              </Button>
            </>
          ) : null}
          <Select onValueChange={(visualization) => void addWidget(visualization as MetricVisualization)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Add widget" />
            </SelectTrigger>
            <SelectContent>
              {visualizations.map((visualization) => (
                <SelectItem key={visualization} value={visualization}>
                  {visualization}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      <section className="themed-scrollbar min-h-0 flex-1 overflow-auto p-4" ref={containerRef}>
        {activeDashboard && width > 0 ? (
          <Responsive
            breakpoints={{ lg: 1024, md: 768, sm: 0 }}
            className="min-h-full"
            cols={{ lg: 12, md: 8, sm: 4 }}
            layouts={layoutsFor(activeDashboard.definition.widgets)}
            onLayoutChange={(_, layouts) => void saveLayout(layouts as ResponsiveLayouts)}
            rowHeight={64}
            width={width}
          >
            {activeDashboard.definition.widgets.map((widget) => (
              <div key={widget.id}>
                <MetricWidget
                  allMetrics={metrics}
                  metrics={widget.metricIds
                    .map((metricId) => metricsById.get(metricId))
                    .filter((metric): metric is SavedLogMetric => Boolean(metric))}
                  onMetricIdsChange={(metricIds) =>
                    void updateWidget({ ...widget, metricIds })
                  }
                  onRemove={() => void removeWidget(widget.id)}
                  onVisualizationChange={(visualization) =>
                    void updateWidget({ ...widget, visualization })
                  }
                  widget={widget}
                />
              </div>
            ))}
          </Responsive>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Create a dashboard to add metric widgets.
          </div>
        )}
      </section>
    </div>
  );
}

function layoutsFor(widgets: DashboardWidget[]): ResponsiveLayouts {
  return {
    lg: widgets.map((widget, index) => ({
      ...defaultWidgetLayout(widget.id, widget.visualization),
      x: (index % 3) * 4,
      y: Math.floor(index / 3) * 4,
      ...(typeof widget.layout.lg === "object" ? widget.layout.lg : {}),
    })),
  };
}

function defaultWidgetLayout(id: string, visualization: MetricVisualization) {
  return {
    h: visualization === "table" ? 5 : 4,
    i: id,
    w: visualization === "table" ? 6 : 4,
    x: 0,
    y: Infinity,
  };
}
