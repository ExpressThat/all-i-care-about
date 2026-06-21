import type { AccessibleRepository } from "@/lib/repositories/repositoryCache"

const ACCESSIBLE_REPO_STALE_SECONDS = 60 * 60 * 24

export function shouldRefreshAccessibleRepositories(
  repositories: AccessibleRepository[],
) {
  if (repositories.length === 0) {
    return true
  }

  const newestSeenAt = Math.max(
    ...repositories.map((repository) => repository.lastSeenAt),
  )
  return Date.now() / 1000 - newestSeenAt > ACCESSIBLE_REPO_STALE_SECONDS
}
