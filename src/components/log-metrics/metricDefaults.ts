import type { LogMetricDefinition, LogMetricQuery, MetricAggregation, MetricThreshold } from "@/lib/logMetrics/metrics";
import { defaultLogTimeRange } from "@/lib/logSearches/timeRange";
import type { LogFilterOperator, LogSearchFilter } from "@/lib/providers/opensearch/logs";

export function defaultMetricDefinition(providerId: string): LogMetricDefinition {
  return {
    formula: "A",
    groupBy: [],
    queries: [defaultMetricQuery("A", providerId)],
    timeRange: defaultLogTimeRange(),
    unit: "count",
  };
}

export function defaultMetricQuery(id: string, providerId: string): LogMetricQuery {
  return {
    aggregation: "count",
    dataSource: "",
    filters: [],
    id,
    providerId,
    providerType: "opensearch",
  };
}

export function nextQueryId(queries: LogMetricQuery[]) {
  return String.fromCharCode(65 + queries.length);
}

const aggregations = new Set<MetricAggregation>([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "cardinality",
  "percentile",
]);

const filterOperators = new Set<LogFilterOperator>([
  "is",
  "isNot",
  "contains",
  "exists",
]);

export function normalizeMetricDefinition(
  definition: LogMetricDefinition,
  fallbackProviderId: string,
): LogMetricDefinition {
  const rawDefinition = definition as unknown as Record<string, unknown>;
  const rawQueries = Array.isArray(rawDefinition.queries)
    ? rawDefinition.queries
    : [];
  const queries = rawQueries.length
    ? rawQueries.map((query, index) =>
        normalizeMetricQuery(query, index, fallbackProviderId),
      )
    : [defaultMetricQuery("A", fallbackProviderId)];

  return {
    formula: readString(rawDefinition.formula) || queries[0]?.id || "A",
    groupBy: readStringArray(rawDefinition.groupBy),
    queries,
    threshold: normalizeThreshold(rawDefinition.threshold),
    timeRange: definition.timeRange ?? defaultLogTimeRange(),
    unit: readString(rawDefinition.unit) || undefined,
  };
}

function normalizeMetricQuery(
  query: unknown,
  index: number,
  fallbackProviderId: string,
): LogMetricQuery {
  const rawQuery = query as Record<string, unknown>;
  const aggregation = readString(rawQuery.aggregation);

  return {
    aggregation: aggregations.has(aggregation as MetricAggregation)
      ? (aggregation as MetricAggregation)
      : "count",
    dataSource:
      readString(rawQuery.dataSource) ||
      readString(rawQuery.alias),
    field: readString(rawQuery.field) || undefined,
    filters: normalizeFilters(rawQuery.filters),
    id: readString(rawQuery.id) || String.fromCharCode(65 + index),
    percentile: readNumber(rawQuery.percentile),
    providerId:
      readString(rawQuery.providerId) ||
      readString(rawQuery.provider_id) ||
      fallbackProviderId,
    providerType: (readString(rawQuery.providerType) || "opensearch") as LogMetricQuery["providerType"],
  };
}

function normalizeFilters(filters: unknown): LogSearchFilter[] {
  if (!Array.isArray(filters)) {
    return [];
  }

  return filters.flatMap((filter) => {
    const rawFilter = filter as Record<string, unknown>;
    const field = readString(rawFilter.field);
    if (!field) {
      return [];
    }
    return [{
      field,
      operator: normalizeFilterOperator(rawFilter.operator),
      value: readString(rawFilter.value),
    }];
  });
}

function normalizeFilterOperator(operator: unknown): LogFilterOperator {
  const value = readString(operator);
  if (filterOperators.has(value as LogFilterOperator)) {
    return value as LogFilterOperator;
  }
  if (value === "is_not" || value === "is-not") {
    return "isNot";
  }
  return "is";
}

function normalizeThreshold(threshold: unknown): MetricThreshold | undefined {
  if (!threshold || typeof threshold !== "object") {
    return undefined;
  }
  const rawThreshold = threshold as Record<string, unknown>;
  return {
    comparison: normalizeComparison(rawThreshold.comparison),
    enabled: rawThreshold.enabled === true,
    value: readNumber(rawThreshold.value) ?? 0,
  };
}

function normalizeComparison(comparison: unknown): MetricThreshold["comparison"] {
  const value = readString(comparison);
  if (value === "gte" || value === "lt" || value === "lte" || value === "eq" || value === "neq") {
    return value;
  }
  return "gt";
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
