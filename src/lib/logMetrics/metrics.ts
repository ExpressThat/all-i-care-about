import { invoke } from "@tauri-apps/api/core";
import type { ProviderType } from "@/lib/providers/providerTypes";
import type { LogField, LogSearchFilter } from "@/lib/providers/opensearch/logs";
import {
  listOpenSearchAliases,
  listOpenSearchFields,
  listOpenSearchFieldValues,
  type LogDataSource,
} from "@/lib/providers/opensearch/logs";
import type { LogTimeRange } from "@/lib/logSearches/timeRange";

export type MetricAggregation =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "cardinality"
  | "percentile";

export type ThresholdComparison = "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
export type MetricStatus = "notEvaluated" | "ok" | "triggered" | "error";

export type MetricThreshold = {
  enabled: boolean;
  comparison: ThresholdComparison;
  value: number;
};

export type LogMetricQuery = {
  id: string;
  providerId: string;
  providerType: ProviderType;
  dataSource: string;
  filters: LogSearchFilter[];
  aggregation: MetricAggregation;
  field?: string;
  percentile?: number;
};

export type LogMetricDefinition = {
  timeRange: LogTimeRange;
  groupBy: string[];
  queries: LogMetricQuery[];
  formula: string;
  unit?: string;
  threshold?: MetricThreshold;
};

export type LogMetricGroupValue = {
  key: Record<string, string>;
  value: number;
  triggered: boolean;
};

export type LogMetricEvaluation = {
  value?: number;
  groups: LogMetricGroupValue[];
  queryValues: Record<string, number>;
  status: MetricStatus;
  triggered: boolean;
  error?: string;
  evaluatedAt: number;
};

export type SavedLogMetric = {
  id: string;
  name: string;
  definition: LogMetricDefinition;
  latestEvaluation?: LogMetricEvaluation;
  createdAt: number;
  updatedAt: number;
};

export type SaveLogMetricRequest = {
  id?: string;
  name: string;
  definition: LogMetricDefinition;
};

export type MetricVisualization =
  | "number"
  | "status"
  | "gauge"
  | "table"
  | "bar"
  | "horizontalBar"
  | "line"
  | "area"
  | "pie";

export type DashboardWidget = {
  id: string;
  metricIds: string[];
  visualization: MetricVisualization;
  title?: string;
  layout: Record<string, unknown>;
  options: Record<string, unknown>;
};

export type MetricDashboardDefinition = {
  widgets: DashboardWidget[];
};

export type MetricDashboard = {
  id: string;
  name: string;
  definition: MetricDashboardDefinition;
  createdAt: number;
  updatedAt: number;
};

export type AlertGroupRule =
  | {
      type: "metric";
      metricId: string;
      threshold?: MetricThreshold;
    }
  | {
      type: "any" | "all" | "none";
      children: AlertGroupRule[];
    }
  | {
      type: "atLeast";
      count: number;
      children: AlertGroupRule[];
    };

export type MetricAlertGroupDefinition = {
  enabled: boolean;
  rule: AlertGroupRule;
};

export type MetricAlertGroupState = {
  triggered: boolean;
  triggeredCount: number;
  evaluatedAt: number;
};

export type MetricAlertGroup = {
  id: string;
  name: string;
  definition: MetricAlertGroupDefinition;
  latestState?: MetricAlertGroupState;
  createdAt: number;
  updatedAt: number;
};

export function listSavedLogMetrics() {
  return invoke<SavedLogMetric[]>("list_saved_log_metrics");
}

export function saveLogMetric(request: SaveLogMetricRequest) {
  return invoke<SavedLogMetric>("save_log_metric", { request });
}

export function renameSavedLogMetric(id: string, name: string) {
  return invoke<SavedLogMetric>("rename_saved_log_metric", { id, name });
}

export function deleteSavedLogMetric(id: string) {
  return invoke<void>("delete_saved_log_metric", { id });
}

export function evaluateLogMetric(id: string) {
  return invoke<LogMetricEvaluation>("evaluate_log_metric", { id });
}

export function evaluateLogMetricPreview(request: SaveLogMetricRequest) {
  return invoke<LogMetricEvaluation>("evaluate_log_metric_preview", {
    request,
  });
}

export function listMetricDashboards() {
  return invoke<MetricDashboard[]>("list_log_metric_dashboards");
}

export function saveMetricDashboard(request: {
  id?: string;
  name: string;
  definition: MetricDashboardDefinition;
}) {
  return invoke<MetricDashboard>("save_log_metric_dashboard", { request });
}

export function deleteMetricDashboard(id: string) {
  return invoke<void>("delete_log_metric_dashboard", { id });
}

export function listMetricAlertGroups() {
  return invoke<MetricAlertGroup[]>("list_log_metric_alert_groups");
}

export function saveMetricAlertGroup(request: {
  id?: string;
  name: string;
  definition: MetricAlertGroupDefinition;
}) {
  return invoke<MetricAlertGroup>("save_log_metric_alert_group", { request });
}

export function deleteMetricAlertGroup(id: string) {
  return invoke<void>("delete_log_metric_alert_group", { id });
}

export function triggerLogMetricEvaluation() {
  return invoke<void>("trigger_log_metric_evaluation");
}

export function listLogMetricDataSources(
  providerType: ProviderType,
  providerId: string,
) {
  if (providerType === "opensearch") {
    return listOpenSearchAliases(providerId);
  }
  return Promise.resolve([] satisfies LogDataSource[]);
}

export function listLogMetricFields(
  providerType: ProviderType,
  providerId: string,
  dataSource: string,
) {
  if (providerType === "opensearch") {
    return listOpenSearchFields(providerId, dataSource);
  }
  return Promise.resolve([] satisfies LogField[]);
}

export function listLogMetricFieldValues({
  dataSource,
  field,
  providerId,
  providerType,
  query,
}: {
  dataSource: string;
  field: string;
  providerId: string;
  providerType: ProviderType;
  query?: string;
}) {
  if (providerType === "opensearch") {
    return listOpenSearchFieldValues({
      alias: dataSource,
      field,
      providerId,
      query,
    });
  }
  return Promise.resolve({ values: [], hasMore: false, capped: false });
}
