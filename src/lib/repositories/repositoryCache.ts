import { invoke } from "@tauri-apps/api/core";

export type WatchedRepository = {
  id: string;
  providerId: string;
  owner: string;
  name: string;
  fullName: string;
  isActive: boolean;
  pullsEtag: string | null;
  lastCheckedAt: number | null;
};

export type CachedPullRequest = {
  id: string;
  repositoryId: string;
  number: number;
  title: string;
  authorLogin: string;
  authorAvatarUrl: string | null;
  state: string;
  updatedAt: string;
  htmlUrl: string;
};

export type AccessibleRepository = {
  providerId: string;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  isArchived: boolean;
  updatedAt: string | null;
  lastSeenAt: number;
};

export function listWatchedRepositories(providerId?: string) {
  return invoke<WatchedRepository[]>("list_watched_repositories", {
    providerId,
  });
}

export function addWatchedRepository(
  providerId: string,
  owner: string,
  name: string,
) {
  return invoke<WatchedRepository>("add_watched_repository", {
    providerId,
    owner,
    name,
  });
}

export function removeWatchedRepository(repositoryId: string) {
  return invoke<void>("remove_watched_repository", {
    repositoryId,
  });
}

export function listCachedPullRequests(repositoryId?: string) {
  return invoke<CachedPullRequest[]>("list_cached_pull_requests", {
    repositoryId,
  });
}

export function listAccessibleRepositories(
  providerId: string,
  search?: string,
) {
  return invoke<AccessibleRepository[]>("list_accessible_repositories", {
    providerId,
    search,
  });
}

export function refreshAccessibleRepositories(providerId: string) {
  return invoke<AccessibleRepository[]>("refresh_accessible_repositories", {
    providerId,
  });
}

export function triggerProviderPrPoll() {
  return invoke<void>("trigger_provider_pr_poll");
}

export function getProviderRateLimitUsed(
  providerId: string,
  windowSeconds: number,
) {
  return invoke<number>("get_provider_rate_limit_used", {
    providerId,
    windowSeconds,
  });
}
