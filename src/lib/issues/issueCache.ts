import { invoke } from "@tauri-apps/api/core";

export type AccessibleIssueSource = {
  providerId: string;
  sourceId: string;
  sourceKey: string;
  name: string;
  displayName: string;
  webUrl: string | null;
  updatedAt: string | null;
  lastSeenAt: number;
};

export type WatchedIssueSource = {
  id: string;
  providerId: string;
  sourceId: string;
  sourceKey: string;
  name: string;
  displayName: string;
  webUrl: string | null;
  issuesEtag: string | null;
  lastCheckedAt: number | null;
};

export type CachedIssueStatus = {
  id: string;
  sourceWatchId: string;
  statusId: string;
  name: string;
  category: string | null;
  position: number;
  visible: boolean;
};

export type CachedIssue = {
  id: string;
  sourceWatchId: string;
  key: string;
  title: string;
  statusId: string;
  statusName: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  updatedAt: string;
  htmlUrl: string;
};

export function listWatchedIssueSources(providerId?: string) {
  return invoke<WatchedIssueSource[]>("list_watched_issue_sources", {
    providerId,
  });
}

export function addWatchedIssueSource(providerId: string, sourceId: string) {
  return invoke<WatchedIssueSource>("add_watched_issue_source", {
    providerId,
    sourceId,
  });
}

export function removeWatchedIssueSource(sourceWatchId: string) {
  return invoke<void>("remove_watched_issue_source", {
    sourceWatchId,
  });
}

export function listAccessibleIssueSources(
  providerId: string,
  search?: string,
) {
  return invoke<AccessibleIssueSource[]>("list_accessible_issue_sources", {
    providerId,
    search,
  });
}

export function refreshAccessibleIssueSources(providerId: string) {
  return invoke<AccessibleIssueSource[]>("refresh_accessible_issue_sources", {
    providerId,
  });
}

export function listCachedIssueStatuses(sourceWatchId?: string) {
  return invoke<CachedIssueStatus[]>("list_cached_issue_statuses", {
    sourceWatchId,
  });
}

export function setVisibleIssueStatuses(
  sourceWatchId: string,
  visibleStatusIds: string[],
) {
  return invoke<CachedIssueStatus[]>("set_visible_issue_statuses", {
    sourceWatchId,
    visibleStatusIds,
  });
}

export function listCachedIssues(sourceWatchId?: string) {
  return invoke<CachedIssue[]>("list_cached_issues", {
    sourceWatchId,
  });
}

export function triggerProviderIssuePoll() {
  return invoke<void>("trigger_provider_issue_poll");
}
