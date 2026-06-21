import type { ProviderInstance } from "@/lib/providers/providerTypes";
import { providerSupportsCapability } from "@/lib/providers/registry";

export function isIssueProvider(provider: ProviderInstance) {
  return providerSupportsCapability(provider, "issue", "Issue");
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(timestampSeconds: number) {
  const seconds = Math.max(0, Math.round(Date.now() / 1000 - timestampSeconds));

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}
