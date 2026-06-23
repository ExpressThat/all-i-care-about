import { Plus, Trash2 } from "lucide-react";
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
import type {
  AlertGroupRule,
  MetricThreshold,
  SavedLogMetric,
  ThresholdComparison,
} from "@/lib/logMetrics/metrics";

const comparisons: ThresholdComparison[] = ["gt", "gte", "lt", "lte", "eq", "neq"];

export function MetricAlertRuleEditor({
  metrics,
  onChange,
  onRemove,
  rule,
}: {
  metrics: SavedLogMetric[];
  onChange: (rule: AlertGroupRule) => void;
  onRemove?: () => void;
  rule: AlertGroupRule;
}) {
  if (rule.type === "metric") {
    return (
      <div className="grid gap-3 rounded-md border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            onValueChange={(metricId) => onChange({ ...rule, metricId })}
            value={rule.metricId}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((metric) => (
                <SelectItem key={metric.id} value={metric.id}>
                  {metric.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(rule.threshold)}
              onCheckedChange={(checked) =>
                onChange({
                  ...rule,
                  threshold: checked === true ? defaultThreshold() : undefined,
                })
              }
            />
            Override threshold
          </label>
          {onRemove ? (
            <Button onClick={onRemove} size="icon" type="button" variant="ghost">
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
        {rule.threshold ? (
          <ThresholdEditor
            onChange={(threshold) => onChange({ ...rule, threshold })}
            threshold={rule.threshold}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          onValueChange={(type) => onChange(convertGroupRule(rule, type))}
          value={rule.type}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="atLeast">At least</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        {rule.type === "atLeast" ? (
          <Input
            className="w-24"
            min={1}
            onChange={(event) =>
              onChange({ ...rule, count: Number(event.currentTarget.value) })
            }
            type="number"
            value={rule.count}
          />
        ) : null}
        <Button
          onClick={() => onChange({ ...rule, children: [...rule.children, defaultMetricRule(metrics)] })}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" />
          Metric
        </Button>
        <Button
          onClick={() => onChange({ ...rule, children: [...rule.children, defaultGroupRule()] })}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" />
          Group
        </Button>
        {onRemove ? (
          <Button onClick={onRemove} size="icon" type="button" variant="ghost">
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="grid gap-2 border-l pl-3">
        {rule.children.length === 0 ? (
          <div className="text-sm text-muted-foreground">No conditions yet.</div>
        ) : (
          rule.children.map((child, index) => (
            <MetricAlertRuleEditor
              key={index}
              metrics={metrics}
              onChange={(nextChild) =>
                onChange({
                  ...rule,
                  children: rule.children.map((candidate, currentIndex) =>
                    currentIndex === index ? nextChild : candidate,
                  ),
                })
              }
              onRemove={() =>
                onChange({
                  ...rule,
                  children: rule.children.filter((_, currentIndex) => currentIndex !== index),
                })
              }
              rule={child}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function defaultGroupRule(): AlertGroupRule {
  return { type: "any", children: [] };
}

function defaultMetricRule(metrics: SavedLogMetric[]): AlertGroupRule {
  return { type: "metric", metricId: metrics[0]?.id ?? "" };
}

function defaultThreshold(): MetricThreshold {
  return { comparison: "gt", enabled: true, value: 0 };
}

function convertGroupRule(rule: Exclude<AlertGroupRule, { type: "metric" }>, type: string): AlertGroupRule {
  if (type === "atLeast") {
    return { type: "atLeast", count: "count" in rule ? rule.count : 1, children: rule.children };
  }
  return { type: type as "any" | "all" | "none", children: rule.children };
}

function ThresholdEditor({
  onChange,
  threshold,
}: {
  onChange: (threshold: MetricThreshold) => void;
  threshold: MetricThreshold;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        onValueChange={(comparison) =>
          onChange({ ...threshold, comparison: comparison as ThresholdComparison })
        }
        value={threshold.comparison}
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
        onChange={(event) =>
          onChange({ ...threshold, value: Number(event.currentTarget.value) })
        }
        type="number"
        value={threshold.value}
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={threshold.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...threshold, enabled: checked === true })
          }
        />
        Enabled
      </label>
    </div>
  );
}
