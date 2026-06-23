use super::client::{open_search_client, response_json};
use super::models::{LogFilterOperator, LogSearchFilter};
use super::query::path_segment;
use crate::log_metrics::models::{
    ExecutedMetricGroup, ExecutedMetricQuery, LogMetricQuery, MetricAggregation,
    ResolvedMetricTimeRange,
};
use crate::repository_cache::db::db_pool;
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use tauri::AppHandle;

pub async fn execute_metric_query(
    app: &AppHandle,
    provider_id: &str,
    query: &LogMetricQuery,
    group_by: &[String],
    range: &ResolvedMetricTimeRange,
) -> Result<ExecutedMetricQuery, String> {
    let pool = db_pool(app).await?;
    let client = open_search_client(app, &pool, provider_id)?;
    let body = response_json(
        client
            .post_json(
                &format!("/{}/_search", path_segment(&query.data_source)),
                &metric_body(query, group_by, range)?,
            )
            .await?,
    )
    .await?;

    Ok(ExecutedMetricQuery {
        query_id: query.id.clone(),
        total: scalar_value(&body, query),
        groups: grouped_values(&body, query, group_by),
    })
}

fn metric_body(
    query: &LogMetricQuery,
    group_by: &[String],
    range: &ResolvedMetricTimeRange,
) -> Result<Value, String> {
    let mut body = json!({
        "size": 0,
        "track_total_hits": true,
        "query": { "bool": { "filter": filters(query, range) } }
    });

    if group_by.is_empty() {
        if let Some(agg) = metric_aggregation(query)? {
            body["aggs"] = json!({ "metric_value": agg });
        }
        return Ok(body);
    }

    let sources = group_by
        .iter()
        .map(|field| json!({ field: { "terms": { "field": field, "missing_bucket": false } } }))
        .collect::<Vec<_>>();
    let mut grouped = json!({
        "composite": {
            "size": 100,
            "sources": sources
        }
    });
    if let Some(agg) = metric_aggregation(query)? {
        grouped["aggs"] = json!({ "metric_value": agg });
    }
    body["aggs"] = json!({ "groups": grouped });
    Ok(body)
}

fn metric_aggregation(query: &LogMetricQuery) -> Result<Option<Value>, String> {
    match query.aggregation {
        MetricAggregation::Count => Ok(None),
        MetricAggregation::Sum => Ok(Some(field_agg("sum", query)?)),
        MetricAggregation::Avg => Ok(Some(field_agg("avg", query)?)),
        MetricAggregation::Min => Ok(Some(field_agg("min", query)?)),
        MetricAggregation::Max => Ok(Some(field_agg("max", query)?)),
        MetricAggregation::Cardinality => Ok(Some(field_agg("cardinality", query)?)),
        MetricAggregation::Percentile => {
            let field = required_field(query)?;
            Ok(Some(json!({
                "percentiles": {
                    "field": field,
                    "percents": [query.percentile.unwrap_or(95.0)]
                }
            })))
        }
    }
}

fn field_agg(kind: &str, query: &LogMetricQuery) -> Result<Value, String> {
    Ok(json!({ kind: { "field": required_field(query)? } }))
}

fn required_field(query: &LogMetricQuery) -> Result<&str, String> {
    query
        .field
        .as_deref()
        .filter(|field| !field.trim().is_empty())
        .ok_or_else(|| format!("Aggregation {:?} requires a field.", query.aggregation))
}

fn scalar_value(body: &Value, query: &LogMetricQuery) -> f64 {
    match query.aggregation {
        MetricAggregation::Count => body
            .pointer("/hits/total/value")
            .and_then(Value::as_f64)
            .unwrap_or(0.0),
        MetricAggregation::Percentile => {
            let percentile = query.percentile.unwrap_or(95.0).to_string();
            body.pointer(&format!("/aggregations/metric_value/values/{percentile}"))
                .and_then(Value::as_f64)
                .unwrap_or(0.0)
        }
        _ => body
            .pointer("/aggregations/metric_value/value")
            .and_then(Value::as_f64)
            .unwrap_or(0.0),
    }
}

fn grouped_values(
    body: &Value,
    query: &LogMetricQuery,
    group_by: &[String],
) -> Vec<ExecutedMetricGroup> {
    body.pointer("/aggregations/groups/buckets")
        .and_then(Value::as_array)
        .map(|buckets| {
            buckets
                .iter()
                .map(|bucket| ExecutedMetricGroup {
                    key: group_key(bucket, group_by),
                    value: group_value(bucket, query),
                })
                .collect()
        })
        .unwrap_or_default()
}

fn group_key(bucket: &Value, group_by: &[String]) -> BTreeMap<String, String> {
    let key_value = bucket.get("key").and_then(Value::as_object);
    group_by
        .iter()
        .filter_map(|field| {
            Some((
                field.clone(),
                display_value(key_value?.get(field).unwrap_or(&Value::Null)),
            ))
        })
        .collect()
}

fn group_value(bucket: &Value, query: &LogMetricQuery) -> f64 {
    match query.aggregation {
        MetricAggregation::Count => bucket.get("doc_count").and_then(Value::as_f64).unwrap_or(0.0),
        MetricAggregation::Percentile => {
            let percentile = query.percentile.unwrap_or(95.0).to_string();
            bucket
                .pointer(&format!("/metric_value/values/{percentile}"))
                .and_then(Value::as_f64)
                .unwrap_or(0.0)
        }
        _ => bucket
            .pointer("/metric_value/value")
            .and_then(Value::as_f64)
            .unwrap_or(0.0),
    }
}

fn filters(query: &LogMetricQuery, range: &ResolvedMetricTimeRange) -> Vec<Value> {
    let mut filters = vec![json!({
        "range": { "@timestamp": { "gte": range.start, "lte": range.end } }
    })];
    filters.extend(query.filters.iter().map(filter_query));
    filters
}

fn filter_query(filter: &LogSearchFilter) -> Value {
    match filter.operator {
        LogFilterOperator::Is => field_query("term", &filter.field, json!(filter.value)),
        LogFilterOperator::IsNot => json!({
            "bool": { "must_not": [field_query("term", &filter.field, json!(filter.value))] }
        }),
        LogFilterOperator::Contains => field_query("match", &filter.field, json!(filter.value)),
        LogFilterOperator::Exists => json!({ "exists": { "field": filter.field } }),
    }
}

fn field_query(query_type: &str, field: &str, value: Value) -> Value {
    let mut field_map = Map::new();
    field_map.insert(field.to_string(), value);
    let mut query_map = Map::new();
    query_map.insert(query_type.to_string(), Value::Object(field_map));
    Value::Object(query_map)
}

fn display_value(value: &Value) -> String {
    match value {
        Value::String(value) => value.clone(),
        Value::Number(value) => value.to_string(),
        Value::Bool(value) => value.to_string(),
        Value::Null => String::new(),
        _ => value.to_string(),
    }
}
