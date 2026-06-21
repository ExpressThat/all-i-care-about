import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WatchedRepository } from "@/lib/repositories/repositoryCache"

export function WatchedRepositoriesList({
  onRemove,
  repositories,
}: {
  onRemove: (repository: WatchedRepository) => void
  repositories: WatchedRepository[]
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Watched repositories</h3>
      {repositories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No watched repositories yet.
        </div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {repositories.map((repository) => (
            <div
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
              key={repository.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {repository.fullName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Watched repository
                </p>
              </div>
              <Button
                aria-label={`Remove ${repository.fullName}`}
                onClick={() => onRemove(repository)}
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
  )
}
