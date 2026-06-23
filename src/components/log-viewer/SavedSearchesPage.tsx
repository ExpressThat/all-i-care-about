import { Bookmark, Pencil, Play, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaveLogSearchDialog } from "@/components/log-viewer/SaveLogSearchDialog";
import {
  deleteSavedLogSearch,
  listSavedLogSearches,
  renameSavedLogSearch,
  type SavedLogSearch,
} from "@/lib/logSearches/savedSearches";
import { resolveTimeRange } from "@/lib/logSearches/timeRange";
import { useSetting } from "@/lib/settings/settingsStore";

export function SavedSearchesPage({
  onOpenSavedSearch,
}: {
  onOpenSavedSearch: (savedSearch: SavedLogSearch) => void;
}) {
  const providers = useSetting("Providers");
  const [savedSearches, setSavedSearches] = useState<SavedLogSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingSearch, setRenamingSearch] = useState<SavedLogSearch | null>(
    null,
  );
  const providersById = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider])),
    [providers],
  );

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setError(null);
    try {
      setSavedSearches(await listSavedLogSearches());
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function renameSearch(name: string) {
    if (!renamingSearch) {
      return;
    }
    try {
      const renamed = await renameSavedLogSearch(renamingSearch.id, name);
      setSavedSearches((current) =>
        current.map((search) =>
          search.id === renamed.id ? renamed : search,
        ),
      );
      setRenamingSearch(null);
      toast.success("Renamed saved search");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function deleteSearch(savedSearch: SavedLogSearch) {
    try {
      await deleteSavedLogSearch(savedSearch.id);
      setSavedSearches((current) =>
        current.filter((search) => search.id !== savedSearch.id),
      );
      toast.success("Deleted saved search");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="flex h-svh min-w-0 flex-col">
      <header className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Saved Searches</h2>
        <p className="text-sm text-muted-foreground">
          Manage saved log search configurations.
        </p>
      </header>

      <section className="min-h-0 flex-1 overflow-auto p-6">
        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-muted-foreground">
            Loading saved searches...
          </div>
        ) : savedSearches.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed text-center">
            <Bookmark
              aria-hidden="true"
              className="mb-3 size-8 text-muted-foreground"
            />
            <h3 className="text-sm font-semibold">No saved searches</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Save a Logs screen search to open it again later.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {savedSearches.map((savedSearch) => {
              const provider = providersById.get(savedSearch.providerId);
              const providerAvailable =
                provider?.type === savedSearch.providerType &&
                savedSearch.providerType === "opensearch" &&
                provider.enabledCapabilities.includes("Logs");
              return (
                <div
                  className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  key={savedSearch.id}
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {savedSearch.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {provider?.displayName ?? "Missing provider"} ·{" "}
                      {savedSearch.dataSource} ·{" "}
                      {resolveTimeRange(savedSearch.timeRange).label} ·{" "}
                      {savedSearch.filters.length} filters · updated{" "}
                      {formatTimestamp(savedSearch.updatedAt)}
                    </p>
                    {!providerAvailable ? (
                      <p className="mt-2 text-xs text-destructive">
                        Provider unavailable for opening.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!providerAvailable}
                      onClick={() => onOpenSavedSearch(savedSearch)}
                      type="button"
                    >
                      <Play aria-hidden="true" className="size-4" />
                      Open
                    </Button>
                    <Button
                      onClick={() => setRenamingSearch(savedSearch)}
                      type="button"
                      variant="outline"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                      Rename
                    </Button>
                    <Button
                      onClick={() => void deleteSearch(savedSearch)}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SaveLogSearchDialog
        defaultName={renamingSearch?.name ?? ""}
        description="Rename this saved log search."
        onOpenChange={(open) => {
          if (!open) {
            setRenamingSearch(null);
          }
        }}
        onSave={(name) => void renameSearch(name)}
        open={renamingSearch !== null}
        saveLabel="Rename"
        title="Rename search"
      />
    </div>
  );
}

function formatTimestamp(value: number) {
  return new Date(value * 1000).toLocaleString();
}
