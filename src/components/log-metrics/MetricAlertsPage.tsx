import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  MetricAlertRuleEditor,
  defaultGroupRule,
} from "./MetricAlertRuleEditor";
import {
  deleteMetricAlertGroup,
  listMetricAlertGroups,
  listSavedLogMetrics,
  saveMetricAlertGroup,
  type AlertGroupRule,
  type MetricAlertGroup,
  type SavedLogMetric,
} from "@/lib/logMetrics/metrics";

export function MetricAlertsPage() {
  const [groups, setGroups] = useState<MetricAlertGroup[]>([]);
  const [metrics, setMetrics] = useState<SavedLogMetric[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [name, setName] = useState("");
  const [rule, setRule] = useState<AlertGroupRule>(() => defaultGroupRule());

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [nextGroups, nextMetrics] = await Promise.all([
      listMetricAlertGroups(),
      listSavedLogMetrics(),
    ]);
    setGroups(nextGroups);
    setMetrics(nextMetrics);
  }

  async function saveGroup() {
    const saved = await saveMetricAlertGroup({
      id: editingId ?? undefined,
      name,
      definition: { enabled, rule },
    });
    setGroups((current) =>
      current.some((group) => group.id === saved.id)
        ? current.map((group) => (group.id === saved.id ? saved : group))
        : [saved, ...current],
    );
    resetForm();
  }

  async function toggleEnabled(group: MetricAlertGroup, nextEnabled: boolean) {
    const saved = await saveMetricAlertGroup({
      id: group.id,
      name: group.name,
      definition: { ...group.definition, enabled: nextEnabled },
    });
    setGroups((current) =>
      current.map((candidate) => (candidate.id === saved.id ? saved : candidate)),
    );
  }

  async function remove(group: MetricAlertGroup) {
    await deleteMetricAlertGroup(group.id);
    setGroups((current) => current.filter((candidate) => candidate.id !== group.id));
    if (editingId === group.id) {
      resetForm();
    }
  }

  function edit(group: MetricAlertGroup) {
    setEditingId(group.id);
    setEnabled(group.definition.enabled);
    setName(group.name);
    setRule(group.definition.rule);
  }

  function resetForm() {
    setEditingId(null);
    setEnabled(true);
    setName("");
    setRule(defaultGroupRule());
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Metric Alerts</h2>
        <p className="text-sm text-muted-foreground">
          Combine metric thresholds into nested alert groups.
        </p>
      </header>
      <section className="themed-scrollbar grid gap-4 overflow-auto p-6">
        <div className="grid gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="w-64"
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Alert group name"
              value={name}
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              Enabled
            </label>
            <Button disabled={!name || !hasMetricRule(rule)} onClick={() => void saveGroup()} type="button">
              <Plus aria-hidden="true" className="size-4" />
              {editingId ? "Update group" : "Save group"}
            </Button>
            {editingId ? (
              <Button onClick={resetForm} type="button" variant="outline">
                Cancel
              </Button>
            ) : null}
          </div>
          <MetricAlertRuleEditor metrics={metrics} onChange={setRule} rule={rule} />
        </div>

        {groups.map((group) => (
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={group.id}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold">{group.name}</h3>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {group.definition.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {group.latestState?.triggered ? "Triggered" : "Not triggered"} ·{" "}
                {group.latestState?.triggeredCount ?? 0} matching conditions ·{" "}
                {ruleSummary(group.definition.rule, metrics)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Switch
                checked={group.definition.enabled}
                onCheckedChange={(checked) => void toggleEnabled(group, checked)}
              />
              <Button onClick={() => edit(group)} type="button" variant="outline">
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Button>
              <Button onClick={() => void remove(group)} type="button" variant="ghost">
                <Trash2 aria-hidden="true" className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function hasMetricRule(rule: AlertGroupRule): boolean {
  if (rule.type === "metric") {
    return Boolean(rule.metricId);
  }
  return rule.children.some(hasMetricRule);
}

function ruleSummary(rule: AlertGroupRule, metrics: SavedLogMetric[]): string {
  if (rule.type === "metric") {
    return metrics.find((metric) => metric.id === rule.metricId)?.name ?? "Missing metric";
  }
  const label = rule.type === "atLeast" ? `at least ${rule.count}` : rule.type;
  return `${label} (${rule.children.length})`;
}
