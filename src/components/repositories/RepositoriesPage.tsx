import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { GitPullRequest, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listCachedPullRequests,
  listWatchedRepositories,
  type CachedPullRequest,
  type WatchedRepository,
} from "@/lib/repositories/repositoryCache";
import { useSetting } from "@/lib/settings/settingsStore";
import { ManageWatchedRepositoriesDialog } from "./ManageWatchedRepositoriesDialog";
import { RepositoryColumn } from "./RepositoryColumn";
import { RepositorySkeletons } from "./RepositorySkeletons";
import { isGitPrProvider } from "./repositoryUtils";

export function RepositoriesPage() {
  const providers = useSetting("Providers");
  const gitProviders = providers.filter(isGitPrProvider);
  const [manageOpen, setManageOpen] = useState(false);
  const [watchedRepositories, setWatchedRepositories] = useState<
    WatchedRepository[]
  >([]);
  const [pullRequests, setPullRequests] = useState<CachedPullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    let unsubscribeCacheUpdated: (() => void) | undefined;
    let unsubscribePollCompleted: (() => void) | undefined;

    void listen("provider-pr-cache-updated", () => {
      void load();
    }).then((nextUnsubscribe) => {
      unsubscribeCacheUpdated = nextUnsubscribe;
    });

    void listen("provider-pr-poll-completed", () => {
      void load();
    }).then((nextUnsubscribe) => {
      unsubscribePollCompleted = nextUnsubscribe;
    });

    return () => {
      unsubscribeCacheUpdated?.();
      unsubscribePollCompleted?.();
    };
  }, []);

  const pullRequestsByRepository = useMemo(() => {
    const grouped = new Map<string, CachedPullRequest[]>();
    for (const pullRequest of pullRequests) {
      const group = grouped.get(pullRequest.repositoryId) ?? [];
      group.push(pullRequest);
      grouped.set(pullRequest.repositoryId, group);
    }
    return grouped;
  }, [pullRequests]);

  async function load() {
    setError(null);
    try {
      const [repositories, prs] = await Promise.all([
        listWatchedRepositories(),
        listCachedPullRequests(),
      ]);
      setWatchedRepositories(repositories);
      setPullRequests(prs);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-svh min-w-0 flex-col">
      <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Repositories</h2>
          <p className="text-sm text-muted-foreground">
            Watch repositories and scan their open pull requests.
          </p>
        </div>
        <Button onClick={() => setManageOpen(true)} type="button">
          <Settings2 aria-hidden="true" className="size-4" />
          Manage watched repos
        </Button>
      </header>

      <section className="min-h-0 flex-1 overflow-auto p-6">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <RepositorySkeletons />
        ) : watchedRepositories.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed text-center">
            <GitPullRequest
              aria-hidden="true"
              className="mb-3 size-8 text-muted-foreground"
            />
            <h3 className="text-sm font-semibold">No watched repositories</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add a repository to start caching its open pull requests.
            </p>
            <Button
              className="mt-4"
              onClick={() => setManageOpen(true)}
              type="button"
            >
              Manage watched repos
            </Button>
          </div>
        ) : (
          <div className="flex min-h-full gap-4 overflow-x-auto pb-2">
            {watchedRepositories.map((repository) => (
              <RepositoryColumn
                key={repository.id}
                pullRequests={pullRequestsByRepository.get(repository.id) ?? []}
                repository={repository}
              />
            ))}
          </div>
        )}
      </section>

      <ManageWatchedRepositoriesDialog
        gitProviders={gitProviders}
        onChanged={() => void load()}
        onOpenChange={setManageOpen}
        open={manageOpen}
      />
    </div>
  );
}
