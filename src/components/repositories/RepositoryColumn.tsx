import ReactTimeAgo from "react-time-ago"
import type {
  CachedPullRequest,
  WatchedRepository,
} from "@/lib/repositories/repositoryCache"
import {
  formatDateTime,
  formatRelativeTime,
  parseDate,
} from "./repositoryUtils"

export function RepositoryColumn({
  pullRequests,
  repository,
}: {
  pullRequests: CachedPullRequest[]
  repository: WatchedRepository
}) {
  return (
    <article className="flex max-h-full w-80 shrink-0 flex-col rounded-lg border bg-card text-card-foreground">
      <header className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">
              {repository.fullName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Watched
              {repository.lastCheckedAt
                ? ` · checked ${formatRelativeTime(repository.lastCheckedAt)}`
                : ""}
            </p>
          </div>
          <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
            {pullRequests.length}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {pullRequests.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No cached open pull requests.
          </div>
        ) : (
          pullRequests.map((pullRequest) => {
            const updatedAt = parseDate(pullRequest.updatedAt)

            return (
              <a
                className="block rounded-md border p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                href={pullRequest.htmlUrl}
                key={pullRequest.id}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-medium">
                    {pullRequest.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    #{pullRequest.number}
                  </span>
                </div>
                <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  {pullRequest.authorAvatarUrl ? (
                    <img
                      alt=""
                      className="size-5 shrink-0 rounded-full bg-muted"
                      src={pullRequest.authorAvatarUrl}
                    />
                  ) : (
                    <div className="size-5 shrink-0 rounded-full bg-muted" />
                  )}
                  <span className="truncate">{pullRequest.authorLogin}</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] capitalize text-secondary-foreground">
                    {pullRequest.state}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {updatedAt ? (

                      <ReactTimeAgo date={updatedAt} locale="en-US" />
                    ) : (
                      pullRequest.updatedAt
                    )}
                  </span>
                </div>
              </a>
            )
          })
        )}
      </div>
    </article>
  )
}
