use super::models::{LogEntry, LogField, LogFilterOperator, LogSearchRequest};
use serde_json::{json, Map, Value};

pub fn field_from_caps(name: &str, variants: &Value) -> Option<LogField> {
    let variants = variants.as_object()?;
    let mut field_type = String::new();
    let mut searchable = false;
    let mut aggregatable = false;

    for (variant_type, variant) in variants {
        if field_type.is_empty() {
            field_type = variant_type.to_string();
        }
        searchable |= variant
            .get("searchable")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        aggregatable |= variant
            .get("aggregatable")
            .and_then(Value::as_bool)
            .unwrap_or(false);
    }

    Some(LogField {
        name: name.to_string(),
        field_type,
        searchable,
        aggregatable,
    })
}

pub fn field_value_search_body(
    field: &str,
    query: Option<&str>,
    after_key: Option<&str>,
    page_size: usize,
) -> Value {
    let mut source_terms = Map::new();
    source_terms.insert("field".to_string(), Value::String(field.to_string()));
    source_terms.insert("missing_bucket".to_string(), Value::Bool(false));

    let mut composite = Map::new();
    composite.insert("size".to_string(), json!(page_size));
    composite.insert(
        "sources".to_string(),
        json!([{ "value": { "terms": Value::Object(source_terms) } }]),
    );

    if let Some(after_key) = after_key.filter(|value| !value.is_empty()) {
        composite.insert("after".to_string(), json!({ "value": after_key }));
    }

    let mut body = json!({
        "size": 0,
        "aggs": {
            "values": {
                "composite": Value::Object(composite)
            }
        }
    });

    if let Some(filter) = value_suggestion_filter(field, query) {
        body["query"] = json!({ "bool": { "filter": [filter] } });
    }

    body
}

pub fn log_search_body(request: &LogSearchRequest, size: usize) -> Value {
    json!({
        "size": size,
        "sort": [{ "@timestamp": { "order": "desc", "unmapped_type": "date" } }],
        "query": {
            "bool": {
                "filter": search_filters(request)
            }
        },
        "aggs": {
            "log_count_over_time": {
                "date_histogram": {
                    "field": "@timestamp",
                    "fixed_interval": request.histogram_interval.as_deref().unwrap_or("1h"),
                    "min_doc_count": 0
                }
            }
        }
    })
}

pub fn hit_to_log_entry(hit: &Value) -> LogEntry {
    let source = hit.get("_source").cloned().unwrap_or_else(|| json!({}));
    LogEntry {
        id: hit
            .get("_id")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        index: hit
            .get("_index")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        timestamp: source
            .get("@timestamp")
            .and_then(Value::as_str)
            .map(ToString::to_string),
        level: source
            .get("level")
            .and_then(Value::as_str)
            .map(ToString::to_string),
        message: source
            .get("message")
            .and_then(Value::as_str)
            .map(ToString::to_string),
        service: source
            .get("service")
            .and_then(Value::as_str)
            .map(ToString::to_string),
        source,
    }
}

fn value_suggestion_filter(field: &str, query: Option<&str>) -> Option<Value> {
    let query = query?.trim();
    if query.is_empty() {
        return None;
    }

    Some(field_query(
        "wildcard",
        field,
        json!({
            "value": format!("*{query}*"),
            "case_insensitive": true
        }),
    ))
}

fn search_filters(request: &LogSearchRequest) -> Vec<Value> {
    let mut filters = vec![json!({
        "range": {
            "@timestamp": {
                "gte": request.start,
                "lte": request.end
            }
        }
    })];

    for filter in &request.filters {
        filters.push(match filter.operator {
            LogFilterOperator::Is => field_query("term", &filter.field, json!(filter.value)),
            LogFilterOperator::IsNot => json!({
                "bool": {
                    "must_not": [field_query("term", &filter.field, json!(filter.value))]
                }
            }),
            LogFilterOperator::Contains => field_query("match", &filter.field, json!(filter.value)),
            LogFilterOperator::Exists => json!({ "exists": { "field": filter.field } }),
        });
    }

    filters
}

fn field_query(query_type: &str, field: &str, value: Value) -> Value {
    let mut field_map = Map::new();
    field_map.insert(field.to_string(), value);

    let mut query_map = Map::new();
    query_map.insert(query_type.to_string(), Value::Object(field_map));
    Value::Object(query_map)
}

pub fn value_to_display_string(value: &Value) -> String {
    match value {
        Value::String(value) => value.to_string(),
        Value::Number(value) => value.to_string(),
        Value::Bool(value) => value.to_string(),
        Value::Null => String::new(),
        _ => value.to_string(),
    }
}

pub fn path_segment(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{byte:02X}").chars().collect(),
        })
        .collect()
}
