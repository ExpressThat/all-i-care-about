import { ScrollText } from "lucide-react";
import { LogFilters } from "@/components/log-viewer/LogFilters";
import { LogHistogram } from "@/components/log-viewer/LogHistogram";
import { LogResults } from "@/components/log-viewer/LogResults";
import { LogToolbar } from "@/components/log-viewer/LogToolbar";
import { useOpenSearchLogs } from "./useOpenSearchLogs";

export function LogsPage() {
  const {
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
    setTimeRange,
    timeRange,
  } = useOpenSearchLogs();

  return (
    <div className="flex h-svh min-w-0 flex-col">
      <header className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Logs</h2>
        <p className="text-sm text-muted-foreground">
          View configured logging provider output.
        </p>
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
        <>
          <LogToolbar
            aliases={aliases}
            loading={loading}
            onAliasChange={setSelectedAlias}
            onProviderChange={setProviderId}
            onRefresh={() => void refreshLogs()}
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
          <section className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden p-6">
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
        </>
      )}
    </div>
  );
}
