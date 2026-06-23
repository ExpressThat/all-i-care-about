use crate::provider_security::metadata::ProviderType;
use crate::repository_cache::db::{db_pool, now_seconds, random_id};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::Row;
use tauri::AppHandle;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedLogSearch {
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub provider_type: ProviderType,
    pub data_source: String,
    pub time_range: Value,
    pub filters: Value,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLogSearchRequest {
    pub id: Option<String>,
    pub name: String,
    pub provider_id: String,
    pub provider_type: ProviderType,
    pub data_source: String,
    pub time_range: Value,
    pub filters: Value,
}

#[tauri::command]
pub async fn list_saved_log_searches(app: AppHandle) -> Result<Vec<SavedLogSearch>, String> {
    log::debug!("list_saved_log_searches request received");
    let pool = db_pool(&app).await?;
    let rows = sqlx::query(
        r#"
        SELECT id, name, provider_id, provider_type, data_source, time_range_json, filters_json, created_at, updated_at
        FROM saved_log_searches
        ORDER BY updated_at DESC, name COLLATE NOCASE
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Failed to list saved log searches: {error}"))?;

    rows.into_iter().map(row_to_saved_log_search).collect()
}

#[tauri::command]
pub async fn save_log_search(
    app: AppHandle,
    request: SaveLogSearchRequest,
) -> Result<SavedLogSearch, String> {
    let name = clean_name(&request.name)?;
    let provider_id = clean_required(&request.provider_id, "Provider id")?;
    let data_source = clean_required(&request.data_source, "Data source")?;
    let id = request
        .id
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(|| random_id("log_search"));
    let now = now_seconds();
    let pool = db_pool(&app).await?;
    let time_range_json = serde_json::to_string(&request.time_range)
        .map_err(|error| format!("Failed to serialize saved search time range: {error}"))?;
    let filters_json = serde_json::to_string(&request.filters)
        .map_err(|error| format!("Failed to serialize saved search filters: {error}"))?;

    sqlx::query(
        r#"
        INSERT INTO saved_log_searches (
            id, name, provider_id, provider_type, data_source, time_range_json, filters_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            provider_id = excluded.provider_id,
            provider_type = excluded.provider_type,
            data_source = excluded.data_source,
            time_range_json = excluded.time_range_json,
            filters_json = excluded.filters_json,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(&id)
    .bind(name)
    .bind(provider_id)
    .bind(provider_type_key(&request.provider_type))
    .bind(data_source)
    .bind(time_range_json)
    .bind(filters_json)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|error| format!("Failed to save log search: {error}"))?;

    load_saved_log_search(&pool, &id).await
}

#[tauri::command]
pub async fn rename_saved_log_search(
    app: AppHandle,
    id: String,
    name: String,
) -> Result<SavedLogSearch, String> {
    let name = clean_name(&name)?;
    let now = now_seconds();
    let pool = db_pool(&app).await?;
    let result = sqlx::query(
        r#"
        UPDATE saved_log_searches
        SET name = ?, updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(name)
    .bind(now)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|error| format!("Failed to rename saved log search: {error}"))?;

    if result.rows_affected() == 0 {
        return Err("Saved log search was not found.".to_string());
    }

    load_saved_log_search(&pool, &id).await
}

#[tauri::command]
pub async fn delete_saved_log_search(app: AppHandle, id: String) -> Result<(), String> {
    log::info!("delete_saved_log_search request received: id={id}");
    let pool = db_pool(&app).await?;
    sqlx::query("DELETE FROM saved_log_searches WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Failed to delete saved log search: {error}"))?;
    Ok(())
}

async fn load_saved_log_search(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    id: &str,
) -> Result<SavedLogSearch, String> {
    let row = sqlx::query(
        r#"
        SELECT id, name, provider_id, provider_type, data_source, time_range_json, filters_json, created_at, updated_at
        FROM saved_log_searches
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|error| format!("Failed to load saved log search: {error}"))?;

    row_to_saved_log_search(row)
}

fn row_to_saved_log_search(row: sqlx::sqlite::SqliteRow) -> Result<SavedLogSearch, String> {
    let provider_type: String = row
        .try_get("provider_type")
        .map_err(|error| format!("Failed to read saved search provider type: {error}"))?;
    let time_range_json: String = row
        .try_get("time_range_json")
        .map_err(|error| format!("Failed to read saved search time range: {error}"))?;
    let filters_json: String = row
        .try_get("filters_json")
        .map_err(|error| format!("Failed to read saved search filters: {error}"))?;

    Ok(SavedLogSearch {
        id: row
            .try_get("id")
            .map_err(|error| format!("Failed to read saved search id: {error}"))?,
        name: row
            .try_get("name")
            .map_err(|error| format!("Failed to read saved search name: {error}"))?,
        provider_id: row
            .try_get("provider_id")
            .map_err(|error| format!("Failed to read saved search provider id: {error}"))?,
        provider_type: parse_provider_type(&provider_type)?,
        data_source: row
            .try_get("data_source")
            .map_err(|error| format!("Failed to read saved search data source: {error}"))?,
        time_range: parse_json(&time_range_json, "time range")?,
        filters: parse_json(&filters_json, "filters")?,
        created_at: row
            .try_get("created_at")
            .map_err(|error| format!("Failed to read saved search created time: {error}"))?,
        updated_at: row
            .try_get("updated_at")
            .map_err(|error| format!("Failed to read saved search updated time: {error}"))?,
    })
}

fn parse_provider_type(value: &str) -> Result<ProviderType, String> {
    match value {
        "github" => Ok(ProviderType::Github),
        "atlassian" => Ok(ProviderType::Atlassian),
        "opensearch" => Ok(ProviderType::OpenSearch),
        _ => Err(format!("Unsupported saved search provider type: {value}")),
    }
}

fn provider_type_key(provider_type: &ProviderType) -> &'static str {
    match provider_type {
        ProviderType::Github => "github",
        ProviderType::Atlassian => "atlassian",
        ProviderType::OpenSearch => "opensearch",
    }
}

fn parse_json(value: &str, label: &str) -> Result<Value, String> {
    serde_json::from_str(value)
        .map_err(|error| format!("Failed to parse saved search {label}: {error}"))
}

fn clean_name(value: &str) -> Result<String, String> {
    let value = clean_required(value, "Name")?;
    if value.len() > 120 {
        return Err("Saved search name must be 120 characters or fewer.".to_string());
    }
    Ok(value)
}

fn clean_required(value: &str, label: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{label} is required."));
    }
    Ok(value.to_string())
}
