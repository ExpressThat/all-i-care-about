use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogDataSource {
    pub alias: String,
    pub indices: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogField {
    pub name: String,
    pub field_type: String,
    pub searchable: bool,
    pub aggregatable: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFieldValuesRequest {
    pub alias: String,
    pub field: String,
    pub query: Option<String>,
    pub after_key: Option<String>,
    pub loaded: Option<usize>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogFieldValuePage {
    pub values: Vec<String>,
    pub next_after_key: Option<String>,
    pub has_more: bool,
    pub capped: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogSearchRequest {
    pub alias: String,
    pub start: String,
    pub end: String,
    pub histogram_interval: Option<String>,
    pub filters: Vec<LogSearchFilter>,
    pub size: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogSearchFilter {
    pub field: String,
    pub operator: LogFilterOperator,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LogFilterOperator {
    Is,
    IsNot,
    Contains,
    Exists,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogSearchResult {
    pub logs: Vec<LogEntry>,
    pub histogram: Vec<LogHistogramBucket>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub id: String,
    pub index: String,
    pub timestamp: Option<String>,
    pub level: Option<String>,
    pub message: Option<String>,
    pub service: Option<String>,
    pub source: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogHistogramBucket {
    pub timestamp: String,
    pub count: i64,
}
