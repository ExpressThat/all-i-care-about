use crate::provider_security::metadata::ProviderType;
use crate::providers::opensearch::models::LogSearchFilter;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricTimeRange {
    pub mode: String,
    pub amount: Option<i64>,
    pub unit: Option<String>,
    pub start: Option<String>,
    pub end: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricDefinition {
    pub provider_id: String,
    pub provider_type: ProviderType,
    pub time_range: MetricTimeRange,
    pub group_by: Vec<String>,
    pub queries: Vec<LogMetricQuery>,
    pub formula: String,
    pub formula_config: MetricFormulaConfig,
    pub unit: Option<String>,
    pub threshold: Option<MetricThreshold>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricQuery {
    pub id: String,
    pub data_source: String,
    pub filters: Vec<LogSearchFilter>,
    pub aggregation: MetricAggregation,
    pub field: Option<String>,
    pub percentile: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MetricAggregation {
    Count,
    Sum,
    Avg,
    Min,
    Max,
    Cardinality,
    Percentile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum MetricFormulaConfig {
    Single {
        #[serde(rename = "queryId")]
        query_id: String,
    },
    Operation {
        operation: MetricFormulaOperation,
        operands: Vec<String>,
    },
    Advanced { expression: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MetricFormulaOperation {
    Sum,
    Difference,
    Ratio,
    Percentage,
    Min,
    Max,
    Average,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricThreshold {
    pub enabled: bool,
    pub comparison: ThresholdComparison,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ThresholdComparison {
    Gt,
    Gte,
    Lt,
    Lte,
    Eq,
    Neq,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricEvaluation {
    pub value: Option<f64>,
    pub groups: Vec<LogMetricGroupValue>,
    pub query_values: BTreeMap<String, f64>,
    pub status: MetricStatus,
    pub triggered: bool,
    pub error: Option<String>,
    pub evaluated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricGroupValue {
    pub key: BTreeMap<String, String>,
    pub value: f64,
    pub triggered: bool,
}

#[derive(Debug, Clone)]
pub struct ResolvedMetricTimeRange {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Clone)]
pub struct ExecutedMetricQuery {
    pub query_id: String,
    pub total: f64,
    pub groups: Vec<ExecutedMetricGroup>,
}

#[derive(Debug, Clone)]
pub struct ExecutedMetricGroup {
    pub key: BTreeMap<String, String>,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MetricStatus {
    NotEvaluated,
    Ok,
    Triggered,
    Error,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedLogMetric {
    pub id: String,
    pub name: String,
    pub definition: LogMetricDefinition,
    pub latest_evaluation: Option<LogMetricEvaluation>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLogMetricRequest {
    pub id: Option<String>,
    pub name: String,
    pub definition: LogMetricDefinition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricDashboardDefinition {
    pub widgets: Vec<LogMetricDashboardWidget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricDashboardWidget {
    pub id: String,
    pub metric_ids: Vec<String>,
    pub visualization: MetricVisualization,
    pub title: Option<String>,
    pub layout: Value,
    pub options: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MetricVisualization {
    Number,
    Status,
    Gauge,
    Table,
    Bar,
    HorizontalBar,
    Line,
    Area,
    Pie,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricDashboard {
    pub id: String,
    pub name: String,
    pub definition: LogMetricDashboardDefinition,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLogMetricDashboardRequest {
    pub id: Option<String>,
    pub name: String,
    pub definition: LogMetricDashboardDefinition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricAlertGroupDefinition {
    pub enabled: bool,
    pub rule: AlertGroupRule,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AlertGroupRule {
    Metric {
        #[serde(rename = "metricId")]
        metric_id: String,
        threshold: Option<MetricThreshold>,
    },
    Any {
        children: Vec<AlertGroupRule>,
    },
    All {
        children: Vec<AlertGroupRule>,
    },
    AtLeast {
        count: usize,
        children: Vec<AlertGroupRule>,
    },
    None {
        children: Vec<AlertGroupRule>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricAlertGroupState {
    pub triggered: bool,
    pub triggered_count: usize,
    pub evaluated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMetricAlertGroup {
    pub id: String,
    pub name: String,
    pub definition: LogMetricAlertGroupDefinition,
    pub latest_state: Option<LogMetricAlertGroupState>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLogMetricAlertGroupRequest {
    pub id: Option<String>,
    pub name: String,
    pub definition: LogMetricAlertGroupDefinition,
}
