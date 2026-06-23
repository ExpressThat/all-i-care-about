use crate::repository_cache::db::db_pool;
use serde_json::Value;
use tauri::AppHandle;

use super::super::client::{open_search_client, response_json};
use super::super::models::{LogHistogramBucket, LogSearchRequest, LogSearchResult};
use super::super::query::{hit_to_log_entry, log_search_body, path_segment};

#[tauri::command]
pub async fn search_opensearch_logs(
    app: AppHandle,
    provider_id: String,
    request: LogSearchRequest,
) -> Result<LogSearchResult, String> {
    let pool = db_pool(&app).await?;
    let client = open_search_client(&app, &pool, &provider_id)?;
    let size = request.size.unwrap_or(100).clamp(1, 500);
    let body = response_json(
        client
            .post_json(
                &format!("/{}/_search", path_segment(&request.alias)),
                &log_search_body(&request, size),
            )
            .await?,
    )
    .await?;

    Ok(LogSearchResult {
        histogram: histogram_from_response(&body),
        logs: body
            .pointer("/hits/hits")
            .and_then(Value::as_array)
            .map(|hits| hits.iter().map(hit_to_log_entry).collect::<Vec<_>>())
            .unwrap_or_default(),
        total: body
            .pointer("/hits/total/value")
            .and_then(Value::as_i64)
            .unwrap_or(0),
    })
}

fn histogram_from_response(body: &Value) -> Vec<LogHistogramBucket> {
    body.pointer("/aggregations/log_count_over_time/buckets")
        .and_then(Value::as_array)
        .map(|buckets| {
            buckets
                .iter()
                .filter_map(|bucket| {
                    Some(LogHistogramBucket {
                        timestamp: bucket.get("key_as_string")?.as_str()?.to_string(),
                        count: bucket.get("doc_count")?.as_i64()?,
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}
