use super::db::{db_pool, now_seconds};
use reqwest::header::HeaderMap;
use sqlx::{Pool, Row, Sqlite};
use tauri::{AppHandle, Emitter};
use url::Url;

#[tauri::command]
pub async fn get_provider_rate_limit_used(
    app: AppHandle,
    provider_id: String,
    window_seconds: i64,
) -> Result<i64, String> {
    let pool = db_pool(&app).await?;
    let since = now_seconds() - window_seconds.max(0);
    let row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(rate_limit_used), 0) AS used
        FROM provider_request_log
        WHERE provider_id = ? AND created_at >= ?
        "#,
    )
    .bind(provider_id)
    .bind(since)
    .fetch_one(&pool)
    .await
    .map_err(|error| format!("Failed to load provider rate-limit usage: {error}"))?;

    row.try_get::<i64, _>("used")
        .map_err(|error| format!("Failed to read provider rate-limit usage: {error}"))
}

pub async fn log_provider_request(
    app: &AppHandle,
    pool: &Pool<Sqlite>,
    provider_id: &str,
    provider_type: &str,
    method: &str,
    url: &str,
    status_code: Option<u16>,
    success: bool,
    rate_limit_used: i64,
) -> Result<(), String> {
    let parsed_url = Url::parse(url).map_err(|error| format!("Invalid request URL: {error}"))?;
    let origin = parsed_url.origin().ascii_serialization();
    let mut path = parsed_url.path().to_string();
    if let Some(query) = parsed_url.query() {
        path.push('?');
        path.push_str(query);
    }

    sqlx::query(
        r#"
        INSERT INTO provider_request_log (
            provider_id, provider_type, method, origin, path, status_code, success, rate_limit_used, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(provider_id)
    .bind(provider_type)
    .bind(method)
    .bind(origin)
    .bind(path)
    .bind(status_code.map(i64::from))
    .bind(if success { 1 } else { 0 })
    .bind(rate_limit_used)
    .bind(now_seconds())
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to log provider request: {error}"))?;

    let _ = app.emit("provider-request-log-updated", provider_id);
    Ok(())
}

pub fn consumed_rate_limit_units(status_code: u16, headers: &HeaderMap) -> i64 {
    if status_code == 304 {
        return 0;
    }

    if headers.contains_key("x-ratelimit-remaining") || headers.contains_key("x-ratelimit-used") {
        return 1;
    }

    0
}
