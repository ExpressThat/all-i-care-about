import type { LogMetricEvaluation } from "@/lib/logMetrics/metrics";

export function MetricPreview({
  evaluation,
  unit,
}: {
  evaluation: LogMetricEvaluation;
  unit?: string;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="text-sm font-semibold">Preview</div>
      {evaluation.error ? (
        <div className="text-sm text-destructive">{evaluation.error}</div>
      ) : null}
      <div className="text-2xl font-semibold">
        {evaluation.value ?? "-"} {unit}
      </div>
      {evaluation.groups.length > 0 ? (
        <div className="grid gap-1 text-sm">
          {evaluation.groups.slice(0, 10).map((group, index) => (
            <div className="flex justify-between gap-3 border-b py-1" key={index}>
              <span className="truncate">{Object.values(group.key).join(" / ")}</span>
              <span>{group.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
