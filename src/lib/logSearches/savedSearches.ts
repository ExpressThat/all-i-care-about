import { invoke } from "@tauri-apps/api/core";
import type { ProviderType } from "@/lib/providers/providerTypes";
import type { LogSearchFilter } from "@/lib/providers/opensearch/logs";
import type { LogTimeRange } from "./timeRange";

export type SavedLogSearch = {
  id: string;
  name: string;
  providerId: string;
  providerType: ProviderType;
  dataSource: string;
  timeRange: LogTimeRange;
  filters: LogSearchFilter[];
  createdAt: number;
  updatedAt: number;
};

export type SaveLogSearchRequest = {
  id?: string;
  name: string;
  providerId: string;
  providerType: ProviderType;
  dataSource: string;
  timeRange: LogTimeRange;
  filters: LogSearchFilter[];
};

export function listSavedLogSearches() {
  return invoke<SavedLogSearch[]>("list_saved_log_searches");
}

export function saveLogSearch(request: SaveLogSearchRequest) {
  return invoke<SavedLogSearch>("save_log_search", { request });
}

export function renameSavedLogSearch(id: string, name: string) {
  return invoke<SavedLogSearch>("rename_saved_log_search", { id, name });
}

export function deleteSavedLogSearch(id: string) {
  return invoke<void>("delete_saved_log_search", { id });
}
