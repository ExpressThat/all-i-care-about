import { SlidersHorizontal } from "lucide-react";
import type { WatchedIssueSource } from "@/lib/issues/issueCache";

export function IssueSourceTabs({
  activeSourceId,
  onActiveSourceIdChange,
  onOpenColumnSettings,
  sources,
}: {
  activeSourceId: string;
  onActiveSourceIdChange: (sourceId: string) => void;
  onOpenColumnSettings: (source: WatchedIssueSource) => void;
  sources: WatchedIssueSource[];
}) {
  return (
    <div className="themed-scrollbar flex gap-2 overflow-x-auto border-b pb-2">
      {sources.map((source) => (
        <div
          className={
            source.id === activeSourceId
              ? "flex shrink-0 items-center overflow-hidden rounded-md bg-primary text-sm font-medium text-primary-foreground"
              : "flex shrink-0 items-center overflow-hidden rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          }
          key={source.id}
        >
          <button
            className="px-3 py-2"
            onClick={() => onActiveSourceIdChange(source.id)}
            type="button"
          >
            {source.displayName}
          </button>
          <button
            aria-label={`Configure columns for ${source.displayName}`}
            className={
              source.id === activeSourceId
                ? "mr-1 rounded-sm p-1 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground"
                : "mr-1 rounded-sm p-1 transition-colors hover:bg-background/60 hover:text-foreground"
            }
            onClick={() => onOpenColumnSettings(source)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
