import { Bookmark } from "lucide-react";
import type { SavedLogSearch } from "@/lib/logSearches/savedSearches";

export function OpenSavedSearchIndicator({
  savedSearch,
}: {
  savedSearch: SavedLogSearch | null;
}) {
  if (!savedSearch) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex max-w-full items-center gap-2 rounded-md border bg-secondary px-2 py-1 text-secondary-foreground">
        <Bookmark aria-hidden="true" className="size-4 shrink-0" />
        <span className="shrink-0 text-muted-foreground">Open saved search</span>
        <span className="min-w-0 truncate font-medium">{savedSearch.name}</span>
      </span>
    </div>
  );
}
