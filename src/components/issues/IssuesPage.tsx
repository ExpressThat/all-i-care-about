import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Settings2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listCachedIssues,
  listCachedIssueStatuses,
  listWatchedIssueSources,
  type CachedIssue,
  type CachedIssueStatus,
  type WatchedIssueSource,
} from "@/lib/issues/issueCache";
import { useSetting } from "@/lib/settings/settingsStore";
import { IssueColumnSettingsDialog } from "./IssueColumnSettingsDialog";
import { IssueColumn } from "./IssueColumn";
import { IssueSkeletons } from "./IssueSkeletons";
import { IssueSourceTabs } from "./IssueSourceTabs";
import { ManageWatchedIssueSourcesDialog } from "./ManageWatchedIssueSourcesDialog";
import { formatRelativeTime, isIssueProvider } from "./issueUtils";

export function IssuesPage() {
  const providers = useSetting("Providers");
  const issueProviders = providers.filter(isIssueProvider);
  const [manageOpen, setManageOpen] = useState(false);
  const [watchedSources, setWatchedSources] = useState<WatchedIssueSource[]>(
    [],
  );
  const [activeSourceId, setActiveSourceId] = useState("");
  const [statuses, setStatuses] = useState<CachedIssueStatus[]>([]);
  const [issues, setIssues] = useState<CachedIssue[]>([]);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [columnSettingsSource, setColumnSettingsSource] =
    useState<WatchedIssueSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void listen("provider-issue-cache-updated", () => {
      void load();
    }).then((nextUnsubscribe) => {
      unsubscribe = nextUnsubscribe;
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const activeSource =
    watchedSources.find((source) => source.id === activeSourceId) ??
    watchedSources[0];

  useEffect(() => {
    if (watchedSources.length === 0) {
      setActiveSourceId("");
      return;
    }

    setActiveSourceId((currentSourceId) => {
      if (watchedSources.some((source) => source.id === currentSourceId)) {
        return currentSourceId;
      }
      return watchedSources[0].id;
    });
  }, [watchedSources]);

  useEffect(() => {
    if (!activeSource?.id) {
      setStatuses([]);
      setIssues([]);
      return;
    }

    void loadSource(activeSource.id);
  }, [activeSource?.id]);

  const issuesByStatus = useMemo(() => {
    const grouped = new Map<string, CachedIssue[]>();
    for (const issue of issues) {
      const group = grouped.get(issue.statusId) ?? [];
      group.push(issue);
      grouped.set(issue.statusId, group);
    }
    return grouped;
  }, [issues]);
  const visibleStatuses = statuses.filter((status) => status.visible);

  async function load() {
    setError(null);
    try {
      const sources = await listWatchedIssueSources();
      setWatchedSources(sources);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadSource(sourceWatchId: string) {
    setError(null);
    try {
      const [nextStatuses, nextIssues] = await Promise.all([
        listCachedIssueStatuses(sourceWatchId),
        listCachedIssues(sourceWatchId),
      ]);
      setStatuses(nextStatuses);
      setIssues(nextIssues);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleChanged() {
    void load();
  }

  function openColumnSettings(source: WatchedIssueSource) {
    setActiveSourceId(source.id);
    setColumnSettingsSource(source);
    setColumnSettingsOpen(true);
  }

  return (
    <div className="flex h-svh min-w-0 flex-col">
      <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Issues</h2>
          <p className="text-sm text-muted-foreground">
            Watch issue sources and scan their current statuses.
          </p>
        </div>
        <Button onClick={() => setManageOpen(true)} type="button">
          <Settings2 aria-hidden="true" className="size-4" />
          Manage watched issue sources
        </Button>
      </header>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {issueProviders.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed text-center">
            <Ticket
              aria-hidden="true"
              className="mb-3 size-8 text-muted-foreground"
            />
            <h3 className="text-sm font-semibold">No issue providers</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Enable the Issue capability on GitHub or Jira to watch issue
              sources.
            </p>
          </div>
        ) : loading ? (
          <IssueSkeletons />
        ) : watchedSources.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed text-center">
            <Ticket
              aria-hidden="true"
              className="mb-3 size-8 text-muted-foreground"
            />
            <h3 className="text-sm font-semibold">No watched issue sources</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add a repository or Jira project to start caching issues.
            </p>
            <Button
              className="mt-4"
              onClick={() => setManageOpen(true)}
              type="button"
            >
              Manage watched issue sources
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <IssueSourceTabs
              activeSourceId={activeSource?.id ?? ""}
              onActiveSourceIdChange={setActiveSourceId}
              onOpenColumnSettings={openColumnSettings}
              sources={watchedSources}
            />

            {activeSource ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {activeSource.displayName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Watched
                      {activeSource.lastCheckedAt
                        ? ` · checked ${formatRelativeTime(activeSource.lastCheckedAt)}`
                        : ""}
                    </p>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {issues.length}
                  </span>
                </div>

                {statuses.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No cached statuses yet.
                  </div>
                ) : visibleStatuses.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No columns selected for this source.
                  </div>
                ) : (
                  <div className="themed-scrollbar flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
                    {visibleStatuses.map((status) => (
                      <IssueColumn
                        issues={issuesByStatus.get(status.statusId) ?? []}
                        key={status.id}
                        status={status}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <ManageWatchedIssueSourcesDialog
        issueProviders={issueProviders}
        onChanged={handleChanged}
        onOpenChange={setManageOpen}
        open={manageOpen}
      />
      <IssueColumnSettingsDialog
        onOpenChange={setColumnSettingsOpen}
        onSaved={(nextStatuses) => setStatuses(nextStatuses)}
        open={columnSettingsOpen}
        source={columnSettingsSource}
      />
    </div>
  );
}
