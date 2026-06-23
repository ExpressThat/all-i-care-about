import { ScrollText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LogFilters } from "@/components/log-viewer/LogFilters";
import { LogHistogram } from "@/components/log-viewer/LogHistogram";
import { LogResults } from "@/components/log-viewer/LogResults";
import { LogToolbar } from "@/components/log-viewer/LogToolbar";
import { OpenSavedSearchIndicator } from "@/components/log-viewer/OpenSavedSearchIndicator";
import { SaveLogSearchDialog } from "@/components/log-viewer/SaveLogSearchDialog";
import {
  saveLogSearch,
  type SavedLogSearch,
} from "@/lib/logSearches/savedSearches";
import { useOpenSearchLogs } from "./useOpenSearchLogs";

type SaveDialogMode = "create" | "copy";

export function LogsPage({
  onSavedSearchApplied,
  savedSearchToOpen,
}: {
  onSavedSearchApplied?: () => void;
  savedSearchToOpen?: SavedLogSearch | null;
}) {
  const [saveDialogMode, setSaveDialogMode] =
    useState<SaveDialogMode | null>(null);
  const {
    activeSavedSearch,
    aliases,
    error,
    fields,
    filters,
    loading,
    logProviders,
    providerId,
    refreshLogs,
    result,
    selectedAlias,
    setFilters,
    setProviderId,
    setSelectedAlias,
    setActiveSavedSearch,
    setTimeRange,
    timeRange,
  } = useOpenSearchLogs({
    openedSavedSearch: savedSearchToOpen,
    onOpenedSavedSearchApplied: onSavedSearchApplied,
  });

  async function saveCurrentSearch(name: string, id?: string) {
    try {
      const savedSearch = await saveLogSearch({
        id,
        name,
        providerId,
        providerType: "opensearch",
        dataSource: selectedAlias,
        timeRange,
        filters,
      });
      setActiveSavedSearch(savedSearch);
      setSaveDialogMode(null);
      toast.success("Saved log search");
      return savedSearch;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async function updateSearch() {
    if (!activeSavedSearch) {
      setSaveDialogMode("create");
      return;
    }
    await saveCurrentSearch(activeSavedSearch.name, activeSavedSearch.id);
  }

  async function saveNamedSearch(name: string) {
    await saveCurrentSearch(name);
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Logs</h2>
        <p className="text-sm text-muted-foreground">
          View configured logging provider output.
        </p>
        <OpenSavedSearchIndicator savedSearch={activeSavedSearch} />
      </header>

      {logProviders.length === 0 ? (
        <section className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex min-h-80 w-full max-w-xl flex-col items-center justify-center rounded-lg border border-dashed text-center">
            <ScrollText
              aria-hidden="true"
              className="mb-3 size-8 text-muted-foreground"
            />
            <h3 className="text-sm font-semibold">No log providers</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add an OpenSearch provider with the Logs capability to search
              logs.
            </p>
          </div>
        </section>
      ) : (
        <div className="themed-scrollbar min-h-0 flex-1 overflow-y-auto">
          <LogToolbar
            aliases={aliases}
            hasActiveSavedSearch={activeSavedSearch !== null}
            loading={loading}
            onAliasChange={setSelectedAlias}
            onProviderChange={setProviderId}
            onRefresh={() => void refreshLogs()}
            onSaveAsNew={() => setSaveDialogMode("copy")}
            onSaveSearch={() => void updateSearch()}
            onTimeRangeChange={setTimeRange}
            providerId={providerId}
            providers={logProviders}
            selectedAlias={selectedAlias}
            timeRange={timeRange}
          />
          {selectedAlias ? (
            <LogFilters
              alias={selectedAlias}
              fields={fields}
              filters={filters}
              onFiltersChange={setFilters}
              providerId={providerId}
            />
          ) : null}
          <section className="grid min-h-0 gap-4 p-6">
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {aliases.length === 0 && !loading ? (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                <ScrollText
                  aria-hidden="true"
                  className="mb-3 size-8 text-muted-foreground"
                />
                <h3 className="text-sm font-semibold">No aliases found</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Create an OpenSearch alias for your log index to search it
                  here.
                </p>
              </div>
            ) : (
              <>
                <LogHistogram buckets={result.histogram} loading={loading} />
                <LogResults logs={result.logs} total={result.total} />
              </>
            )}
          </section>
        </div>
      )}
      <SaveLogSearchDialog
        defaultName={
          saveDialogMode === "copy" && activeSavedSearch
            ? `${activeSavedSearch.name} copy`
            : ""
        }
        onOpenChange={(open) => {
          if (!open) {
            setSaveDialogMode(null);
          }
        }}
        onSave={(name) => void saveNamedSearch(name)}
        open={saveDialogMode !== null}
      />
    </div>
  );
}
