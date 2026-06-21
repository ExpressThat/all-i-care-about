import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WatchedIssueSource } from "@/lib/issues/issueCache";

export function WatchedIssueSourcesList({
  onRemove,
  sources,
}: {
  onRemove: (source: WatchedIssueSource) => void;
  sources: WatchedIssueSource[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Watched issue sources</h3>
      {sources.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No watched issue sources yet.
        </div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {sources.map((source) => (
            <div
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
              key={source.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {source.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Watched issue source
                </p>
              </div>
              <Button
                aria-label={`Remove ${source.displayName}`}
                onClick={() => onRemove(source)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
