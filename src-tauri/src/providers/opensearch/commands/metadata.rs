use crate::repository_cache::db::db_pool;
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use tauri::AppHandle;

use super::super::client::{open_search_client, response_json};
use super::super::models::{ListFieldValuesRequest, LogDataSource, LogField, LogFieldValuePage};
use super::super::query::{
    field_from_caps, field_value_search_body, path_segment, value_to_display_string,
};

const FIELD_VALUE_PAGE_SIZE: usize = 100;
const FIELD_VALUE_CAP: usize = 1000;

#[tauri::command]
pub async fn list_opensearch_aliases(
    app: AppHandle,
    provider_id: String,
) -> Result<Vec<LogDataSource>, String> {
    log::info!("list_opensearch_aliases request received: provider_id={provider_id}");
    let pool = db_pool(&app).await?;
    let client = open_search_client(&app, &pool, &provider_id)?;
    let body = response_json(client.get("/_alias").await?).await?;
    let mut aliases: BTreeMap<String, Vec<String>> = BTreeMap::new();

    for (index, index_value) in object_entries(&body)? {
        let Some(alias_object) = index_value.get("aliases").and_then(Value::as_object) else {
            continue;
        };

        for alias in alias_object.keys() {
            aliases
                .entry(alias.to_string())
                .or_default()
                .push(index.to_string());
        }
    }

    Ok(aliases
        .into_iter()
        .map(|(alias, mut indices)| {
            indices.sort();
            LogDataSource { alias, indices }
        })
        .collect())
}

#[tauri::command]
pub async fn list_opensearch_fields(
    app: AppHandle,
    provider_id: String,
    alias: String,
) -> Result<Vec<LogField>, String> {
    let pool = db_pool(&app).await?;
    let client = open_search_client(&app, &pool, &provider_id)?;
    let body = response_json(
        client
            .get(&format!("/{}/_field_caps?fields=*", path_segment(&alias)))
            .await?,
    )
    .await?;
    let mut fields = base_fields();

    if let Some(field_caps) = body.get("fields").and_then(Value::as_object) {
        for (name, variants) in field_caps {
            if let Some(field) = field_from_caps(name, variants) {
                fields.insert(name.to_string(), field);
            }
        }
    }

    Ok(fields.into_values().collect())
}

#[tauri::command]
pub async fn list_opensearch_field_values(
    app: AppHandle,
    provider_id: String,
    request: ListFieldValuesRequest,
) -> Result<LogFieldValuePage, String> {
    let loaded = request.loaded.unwrap_or(0).min(FIELD_VALUE_CAP);
    if loaded >= FIELD_VALUE_CAP {
        return Ok(LogFieldValuePage {
            values: Vec::new(),
            next_after_key: None,
            has_more: false,
            capped: true,
        });
    }

    let pool = db_pool(&app).await?;
    let client = open_search_client(&app, &pool, &provider_id)?;
    let page_size = FIELD_VALUE_PAGE_SIZE.min(FIELD_VALUE_CAP - loaded);
    let search_body = field_value_search_body(
        &request.field,
        request.query.as_deref(),
        request.after_key.as_deref(),
        page_size,
    );
    let body = response_json(
        client
            .post_json(
                &format!("/{}/_search", path_segment(&request.alias)),
                &search_body,
            )
            .await?,
    )
    .await?;
    let values_agg = body
        .pointer("/aggregations/values")
        .ok_or_else(|| "OpenSearch response did not include field values.".to_string())?;
    let values = values_agg
        .get("buckets")
        .and_then(Value::as_array)
        .map(|buckets| {
            buckets
                .iter()
                .filter_map(|bucket| {
                    bucket
                        .get("key")
                        .and_then(|key| key.get("value"))
                        .map(value_to_display_string)
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let next_after_key = values_agg
        .get("after_key")
        .and_then(|key| key.get("value"))
        .map(value_to_display_string);
    let capped = loaded + values.len() >= FIELD_VALUE_CAP && next_after_key.is_some();

    Ok(LogFieldValuePage {
        values,
        next_after_key: if capped { None } else { next_after_key.clone() },
        has_more: next_after_key.is_some() && !capped,
        capped,
    })
}

fn base_fields() -> BTreeMap<String, LogField> {
    BTreeMap::from([
        (
            "_id".to_string(),
            LogField {
                name: "_id".to_string(),
                field_type: "_id".to_string(),
                searchable: true,
                aggregatable: false,
            },
        ),
        (
            "_index".to_string(),
            LogField {
                name: "_index".to_string(),
                field_type: "_index".to_string(),
                searchable: true,
                aggregatable: true,
            },
        ),
    ])
}

fn object_entries(value: &Value) -> Result<&Map<String, Value>, String> {
    value
        .as_object()
        .ok_or_else(|| "OpenSearch response was not an object.".to_string())
}
