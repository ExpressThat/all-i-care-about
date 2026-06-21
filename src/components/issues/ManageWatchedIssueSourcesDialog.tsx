import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderInstance } from "@/lib/providers/providerTypes";
import {
  addWatchedIssueSource,
  listAccessibleIssueSources,
  listWatchedIssueSources,
  refreshAccessibleIssueSources,
  removeWatchedIssueSource,
  type AccessibleIssueSource,
  type WatchedIssueSource,
} from "@/lib/issues/issueCache";
import { AccessibleIssueSourcePicker } from "./AccessibleIssueSourcePicker";
import { WatchedIssueSourcesList } from "./WatchedIssueSourcesList";

const NESTED_SELECT_CLOSE_GRACE_MS = 150;

export function ManageWatchedIssueSourcesDialog({
  issueProviders,
  onChanged,
  onOpenChange,
  open,
}: {
  issueProviders: ProviderInstance[];
  onChanged: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [providerId, setProviderId] = useState("");
  const [watchedSources, setWatchedSources] = useState<WatchedIssueSource[]>(
    [],
  );
  const [accessibleSources, setAccessibleSources] = useState<
    AccessibleIssueSource[]
  >([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerSelectOpen, setProviderSelectOpen] = useState(false);
  const [sourceSelectOpen, setSourceSelectOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerSelectOpenRef = useRef(false);
  const sourceSelectOpenRef = useRef(false);
  const nestedSelectInteractionRef = useRef(false);
  const nestedSelectCloseTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      window.clearTimeout(nestedSelectCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setProviderId((currentProviderId) => {
      if (currentProviderId) {
        return currentProviderId;
      }
      return issueProviders[0]?.id ?? "";
    });
  }, [issueProviders, open]);

  useEffect(() => {
    if (!open || !providerId) {
      return;
    }

    void load(providerId, search);
  }, [open, providerId, search]);

  const watchedSourceIds = useMemo(
    () => new Set(watchedSources.map((source) => source.sourceId)),
    [watchedSources],
  );
  const addableSources = accessibleSources.filter(
    (source) => !watchedSourceIds.has(source.sourceId),
  );
  const selectedSource = accessibleSources.find(
    (source) => source.sourceId === selectedSourceId,
  );

  function updateNestedSelectInteraction() {
    window.clearTimeout(nestedSelectCloseTimerRef.current);

    if (providerSelectOpenRef.current || sourceSelectOpenRef.current) {
      nestedSelectInteractionRef.current = true;
      return;
    }

    nestedSelectCloseTimerRef.current = window.setTimeout(() => {
      nestedSelectInteractionRef.current = false;
    }, NESTED_SELECT_CLOSE_GRACE_MS);
  }

  function handleProviderSelectOpenChange(nextOpen: boolean) {
    providerSelectOpenRef.current = nextOpen;
    setProviderSelectOpen(nextOpen);
    updateNestedSelectInteraction();
  }

  function handleSourceSelectOpenChange(nextOpen: boolean) {
    sourceSelectOpenRef.current = nextOpen;
    setSourceSelectOpen(nextOpen);
    updateNestedSelectInteraction();
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && nestedSelectInteractionRef.current) {
      return;
    }

    onOpenChange(nextOpen);
  }

  async function load(nextProviderId = providerId, nextSearch = search) {
    if (!nextProviderId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [watched, accessible] = await Promise.all([
        listWatchedIssueSources(nextProviderId),
        listAccessibleIssueSources(nextProviderId, nextSearch),
      ]);
      setWatchedSources(watched);
      setAccessibleSources(accessible);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function refreshSources() {
    if (!providerId) {
      return;
    }

    setRefreshing(true);
    setError(null);
    try {
      setAccessibleSources(await refreshAccessibleIssueSources(providerId));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function addSource() {
    if (!selectedSource) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addWatchedIssueSource(
        selectedSource.providerId,
        selectedSource.sourceId,
      );
      setSelectedSourceId("");
      await load(selectedSource.providerId, search);
      onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function removeSource(source: WatchedIssueSource) {
    setError(null);
    try {
      await removeWatchedIssueSource(source.id);
      await load(source.providerId, search);
      onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-none max-w-2xl overflow-visible"
        onInteractOutside={(event) => {
          if (nestedSelectInteractionRef.current) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Manage watched issue sources</DialogTitle>
          <DialogDescription>
            Add repositories or projects, or remove them from the issue watch
            list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {issueProviders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Configure an issue provider before adding watched issue sources.
            </div>
          ) : (
            <>
              {issueProviders.length > 1 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Select
                    open={providerSelectOpen}
                    onOpenChange={handleProviderSelectOpenChange}
                    value={providerId}
                    onValueChange={setProviderId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {issueProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <AccessibleIssueSourcePicker
                loading={loading}
                onAdd={addSource}
                onRefresh={refreshSources}
                onSearchChange={setSearch}
                onSelectOpenChange={handleSourceSelectOpenChange}
                onSelectedSourceIdChange={setSelectedSourceId}
                refreshing={refreshing || !providerId}
                saving={saving}
                search={search}
                selectOpen={sourceSelectOpen}
                selectedSourceId={selectedSourceId}
                sources={addableSources}
              />

              <WatchedIssueSourcesList
                onRemove={(source) => void removeSource(source)}
                sources={watchedSources}
              />
            </>
          )}

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
