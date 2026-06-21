import ReactTimeAgo from "react-time-ago";
import type {
  CachedIssue,
  CachedIssueStatus,
} from "@/lib/issues/issueCache";
import { formatDateTime, parseDate } from "./issueUtils";

export function IssueColumn({
  issues,
  status,
}: {
  issues: CachedIssue[];
  status: CachedIssueStatus;
}) {
  return (
    <article className="flex h-full w-80 shrink-0 flex-col rounded-lg border bg-card text-card-foreground">
      <header className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{status.name}</h3>
            {status.category ? (
              <p className="text-xs text-muted-foreground">
                {status.category}
              </p>
            ) : null}
          </div>
          <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
            {issues.length}
          </span>
        </div>
      </header>

      <div className="themed-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {issues.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No cached issues.
          </div>
        ) : (
          issues.map((issue) => {
            const updatedAt = parseDate(issue.updatedAt);

            return (
              <a
                className="block rounded-md border p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                href={issue.htmlUrl}
                key={issue.id}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-medium">
                    {issue.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {issue.key}
                  </span>
                </div>

                <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  {issue.authorAvatarUrl ? (
                    <img
                      alt=""
                      className="size-5 shrink-0 rounded-full bg-muted"
                      src={issue.authorAvatarUrl}
                    />
                  ) : (
                    <div className="size-5 shrink-0 rounded-full bg-muted" />
                  )}
                  <span className="truncate">
                    {issue.authorName ?? "Unknown author"}
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
                    {issue.statusName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {updatedAt ? (
                      <>
                        {formatDateTime(issue.updatedAt)} (
                        <ReactTimeAgo date={updatedAt} locale="en-US" />)
                      </>
                    ) : (
                      issue.updatedAt
                    )}
                  </span>
                </div>
              </a>
            );
          })
        )}
      </div>
    </article>
  );
}
