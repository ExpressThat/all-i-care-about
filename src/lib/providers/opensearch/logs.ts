import { invoke } from "@tauri-apps/api/core";

export type LogDataSource = {
  alias: string;
  indices: string[];
};

export type LogField = {
  name: string;
  fieldType: string;
  searchable: boolean;
  aggregatable: boolean;
};

export type LogFilterOperator = "is" | "isNot" | "contains" | "exists";

export type LogSearchFilter = {
  field: string;
  operator: LogFilterOperator;
  value: string;
};

export type LogFieldValuePage = {
  values: string[];
  nextAfterKey?: string;
  hasMore: boolean;
  capped: boolean;
};

export type LogSearchRequest = {
  alias: string;
  start: string;
  end: string;
  histogramInterval?: string;
  filters: LogSearchFilter[];
  size?: number;
};

export type LogEntry = {
  id: string;
  index: string;
  timestamp?: string;
  level?: string;
  message?: string;
  service?: string;
  source: Record<string, unknown>;
};

export type LogHistogramBucket = {
  timestamp: string;
  count: number;
};

export type LogSearchResult = {
  logs: LogEntry[];
  histogram: LogHistogramBucket[];
  total: number;
};

export function listOpenSearchAliases(providerId: string) {
  return invoke<LogDataSource[]>("list_opensearch_aliases", { providerId });
}

export function listOpenSearchFields(providerId: string, alias: string) {
  return invoke<LogField[]>("list_opensearch_fields", { providerId, alias });
}

export function listOpenSearchFieldValues({
  afterKey,
  alias,
  field,
  loaded,
  providerId,
  query,
}: {
  afterKey?: string;
  alias: string;
  field: string;
  loaded?: number;
  providerId: string;
  query?: string;
}) {
  return invoke<LogFieldValuePage>("list_opensearch_field_values", {
    providerId,
    request: {
      alias,
      field,
      query,
      afterKey,
      loaded,
    },
  });
}

export function searchOpenSearchLogs(
  providerId: string,
  request: LogSearchRequest,
) {
  return invoke<LogSearchResult>("search_opensearch_logs", {
    providerId,
    request,
  });
}
