import { Copy, Pencil, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaveLogSearchDialog } from "@/components/log-viewer/SaveLogSearchDialog";
import {
  deleteSavedLogMetric,
  evaluateLogMetric,
  listSavedLogMetrics,
  renameSavedLogMetric,
  saveLogMetric,
  type SavedLogMetric,
} from "@/lib/logMetrics/metrics";

export function SavedMetricsPage({
  onOpenMetric,
}: {
  onOpenMetric: (metric: SavedLogMetric) => void;
}) {
  const [metrics, setMetrics] = useState<SavedLogMetric[]>([]);
  const [renaming, setRenaming] = useState<SavedLogMetric | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setMetrics(await listSavedLogMetrics());
  }

  async function evaluate(metric: SavedLogMetric) {
    const evaluation = await evaluateLogMetric(metric.id);
    setMetrics((current) =>
      current.map((candidate) =>
        candidate.id === metric.id
          ? { ...candidate, latestEvaluation: evaluation }
          : candidate,
      ),
    );
  }

  async function duplicate(metric: SavedLogMetric) {
    const saved = await saveLogMetric({
      definition: metric.definition,
      name: `${metric.name} copy`,
    });
    setMetrics((current) => [saved, ...current]);
  }

  async function remove(metric: SavedLogMetric) {
    await deleteSavedLogMetric(metric.id);
    setMetrics((current) => current.filter((candidate) => candidate.id !== metric.id));
  }

  async function rename(name: string) {
    if (!renaming) {
      return;
    }
    try {
      const renamed = await renameSavedLogMetric(renaming.id, name);
      setMetrics((current) =>
        current.map((metric) => (metric.id === renamed.id ? renamed : metric)),
      );
      setRenaming(null);
      toast.success("Renamed metric");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Saved Metrics</h2>
        <p className="text-sm text-muted-foreground">
          Manage saved log metric definitions.
        </p>
      </header>
      <section className="themed-scrollbar grid gap-3 overflow-auto p-6">
        {metrics.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No saved metrics yet.
          </div>
        ) : (
          metrics.map((metric) => (
            <div
              className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              key={metric.id}
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{metric.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {metric.latestEvaluation?.status ?? "not evaluated"} ·{" "}
                  {metric.latestEvaluation?.value ?? "-"} {metric.definition.unit}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onOpenMetric(metric)} type="button">
                  <Play aria-hidden="true" className="size-4" />
                  Open
                </Button>
                <Button onClick={() => void evaluate(metric)} type="button" variant="outline">
                  Evaluate
                </Button>
                <Button onClick={() => void duplicate(metric)} type="button" variant="outline">
                  <Copy aria-hidden="true" className="size-4" />
                  Duplicate
                </Button>
                <Button onClick={() => setRenaming(metric)} type="button" variant="ghost">
                  <Pencil aria-hidden="true" className="size-4" />
                  Rename
                </Button>
                <Button onClick={() => void remove(metric)} type="button" variant="ghost">
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
      <SaveLogSearchDialog
        defaultName={renaming?.name ?? ""}
        description="Rename this saved metric."
        onOpenChange={(open) => {
          if (!open) {
            setRenaming(null);
          }
        }}
        onSave={(name) => void rename(name)}
        open={renaming !== null}
        saveLabel="Rename"
        title="Rename metric"
      />
    </div>
  );
}
