import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listCachedIssueStatuses,
  setVisibleIssueStatuses,
  type CachedIssueStatus,
  type WatchedIssueSource,
} from "@/lib/issues/issueCache";

export function IssueColumnSettingsDialog({
  onOpenChange,
  onSaved,
  open,
  source,
}: {
  onOpenChange: (open: boolean) => void;
  onSaved: (statuses: CachedIssueStatus[]) => void;
  open: boolean;
  source: WatchedIssueSource | null;
}) {
  const [statuses, setStatuses] = useState<CachedIssueStatus[]>([]);
  const [visibleStatusIds, setVisibleStatusIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !source) {
      return;
    }

    void loadStatuses(source.id);
  }, [open, source?.id]);

  const allVisible = useMemo(
    () =>
      statuses.length > 0 &&
      statuses.every((status) => visibleStatusIds.has(status.statusId)),
    [statuses, visibleStatusIds],
  );

  async function loadStatuses(sourceWatchId: string) {
    setLoading(true);
    setError(null);
    try {
      const nextStatuses = await listCachedIssueStatuses(sourceWatchId);
      setStatuses(nextStatuses);
      setVisibleStatusIds(
        new Set(
          nextStatuses
            .filter((status) => status.visible)
            .map((status) => status.statusId),
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  function setStatusVisible(statusId: string, visible: boolean) {
    setVisibleStatusIds((currentVisibleStatusIds) => {
      const nextVisibleStatusIds = new Set(currentVisibleStatusIds);
      if (visible) {
        nextVisibleStatusIds.add(statusId);
      } else {
        nextVisibleStatusIds.delete(statusId);
      }
      return nextVisibleStatusIds;
    });
  }

  function setAllVisible(visible: boolean) {
    setVisibleStatusIds(
      visible ? new Set(statuses.map((status) => status.statusId)) : new Set(),
    );
  }

  async function save() {
    if (!source) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const nextStatuses = await setVisibleIssueStatuses(
        source.id,
        Array.from(visibleStatusIds),
      );
      onSaved(nextStatuses);
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue columns</DialogTitle>
          <DialogDescription>
            {source
              ? `Choose which columns to show for ${source.displayName}.`
              : "Choose which columns to show."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Loading columns...
            </div>
          ) : statuses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No cached columns yet.
            </div>
          ) : (
            <>
              <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <Checkbox
                  checked={allVisible}
                  onCheckedChange={(checked) => setAllVisible(checked === true)}
                />
                <span className="font-medium">Show all columns</span>
              </label>
              <div className="themed-scrollbar max-h-80 space-y-2 overflow-y-auto pr-1">
                {statuses.map((status) => (
                  <label
                    className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                    key={status.id}
                  >
                    <Checkbox
                      checked={visibleStatusIds.has(status.statusId)}
                      onCheckedChange={(checked) =>
                        setStatusVisible(status.statusId, checked === true)
                      }
                    />
                    <span className="min-w-0 truncate">{status.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={loading || saving || !source || statuses.length === 0}
            onClick={save}
            type="button"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
