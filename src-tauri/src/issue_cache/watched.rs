use super::db::row_to_watched_issue_source;
use super::models::WatchedIssueSource;
use super::poll::poll_issue_source;
use crate::repository_cache::db::{db_pool, now_seconds, random_id};
use sqlx::{Pool, Sqlite};
use tauri::AppHandle;

#[tauri::command]
pub async fn list_watched_issue_sources(
    app: AppHandle,
    provider_id: Option<String>,
) -> Result<Vec<WatchedIssueSource>, String> {
    log::debug!(
        "list_watched_issue_sources request received: provider_id={:?}",
        provider_id
    );
    let pool = db_pool(&app).await?;
    let rows = if let Some(provider_id) = provider_id {
        sqlx::query(
            r#"
            SELECT id, provider_id, source_id, source_key, name, display_name, web_url, issues_etag, last_checked_at
            FROM watched_issue_sources
            WHERE provider_id = ?
            ORDER BY display_name COLLATE NOCASE
            "#,
        )
        .bind(provider_id)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query(
            r#"
            SELECT id, provider_id, source_id, source_key, name, display_name, web_url, issues_etag, last_checked_at
            FROM watched_issue_sources
            ORDER BY display_name COLLATE NOCASE
            "#,
        )
        .fetch_all(&pool)
        .await
    }
    .map_err(|error| format!("Failed to list watched issue sources: {error}"))?;

    let row_count = rows.len();
    let sources = rows
        .into_iter()
        .map(row_to_watched_issue_source)
        .collect::<Result<Vec<_>, _>>()?;
    log::info!("list_watched_issue_sources completed: results={row_count}");
    Ok(sources)
}

#[tauri::command]
pub async fn add_watched_issue_source(
    app: AppHandle,
    provider_id: String,
    source_id: String,
) -> Result<WatchedIssueSource, String> {
    log::info!(
        "add_watched_issue_source request received: provider_id={}, source_id={}",
        provider_id,
        source_id
    );
    let pool = db_pool(&app).await?;
    let source = sqlx::query(
        r#"
        SELECT provider_id, source_id, source_key, name, display_name, web_url, updated_at, last_seen_at
        FROM accessible_issue_sources
        WHERE provider_id = ? AND source_id = ?
        "#,
    )
    .bind(&provider_id)
    .bind(&source_id)
    .fetch_one(&pool)
    .await
    .map_err(|error| format!("Failed to load accessible issue source: {error}"))?;
    let id = random_id("issue_source");
    let now = now_seconds();

    sqlx::query(
        r#"
        INSERT INTO watched_issue_sources (
            id, provider_id, source_id, source_key, name, display_name, web_url, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider_id, source_id) DO UPDATE SET
            source_key = excluded.source_key,
            name = excluded.name,
            display_name = excluded.display_name,
            web_url = excluded.web_url,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(id)
    .bind(&provider_id)
    .bind(source_id_from_row(&source)?)
    .bind(source_key_from_row(&source)?)
    .bind(name_from_row(&source)?)
    .bind(display_name_from_row(&source)?)
    .bind(web_url_from_row(&source)?)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|error| format!("Failed to add watched issue source: {error}"))?;

    let watched = load_watched_issue_source(&pool, &provider_id, &source_id).await?;
    if let Err(error) = poll_issue_source(&app, &pool, &watched).await {
        log::error!(
            "Initial issue source poll failed after adding watched source: source_watch_id={}, display_name={}, error={}",
            watched.id,
            watched.display_name,
            error
        );
    }
    log::info!(
        "add_watched_issue_source completed: source_watch_id={}, display_name={}",
        watched.id,
        watched.display_name
    );
    Ok(watched)
}

#[tauri::command]
pub async fn remove_watched_issue_source(
    app: AppHandle,
    source_watch_id: String,
) -> Result<(), String> {
    log::info!("remove_watched_issue_source request received: source_watch_id={source_watch_id}");
    let pool = db_pool(&app).await?;
    let result = sqlx::query("DELETE FROM watched_issue_sources WHERE id = ?")
        .bind(source_watch_id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Failed to remove watched issue source: {error}"))?;
    log::info!(
        "remove_watched_issue_source completed: rows_affected={}",
        result.rows_affected()
    );
    Ok(())
}

#[tauri::command]
pub async fn trigger_provider_issue_poll(app: AppHandle) -> Result<(), String> {
    log::info!("trigger_provider_issue_poll request received");
    let pool = db_pool(&app).await?;
    let rows = sqlx::query(
        r#"
        SELECT id, provider_id, source_id, source_key, name, display_name, web_url, issues_etag, last_checked_at
        FROM watched_issue_sources
        ORDER BY display_name COLLATE NOCASE
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Failed to load watched issue sources: {error}"))?;

    let row_count = rows.len();
    log::debug!("trigger_provider_issue_poll loaded sources: count={row_count}");
    for row in rows {
        let source = row_to_watched_issue_source(row)?;
        poll_issue_source(&app, &pool, &source).await?;
    }

    log::info!("trigger_provider_issue_poll completed: sources_polled={row_count}");
    Ok(())
}

async fn load_watched_issue_source(
    pool: &Pool<Sqlite>,
    provider_id: &str,
    source_id: &str,
) -> Result<WatchedIssueSource, String> {
    log::debug!(
        "Loading watched issue source: provider_id={}, source_id={}",
        provider_id,
        source_id
    );
    let row = sqlx::query(
        r#"
        SELECT id, provider_id, source_id, source_key, name, display_name, web_url, issues_etag, last_checked_at
        FROM watched_issue_sources
        WHERE provider_id = ? AND source_id = ?
        "#,
    )
    .bind(provider_id)
    .bind(source_id)
    .fetch_one(pool)
    .await
    .map_err(|error| format!("Failed to load watched issue source: {error}"))?;

    row_to_watched_issue_source(row)
}

fn source_id_from_row(row: &sqlx::sqlite::SqliteRow) -> Result<String, String> {
    sqlx::Row::try_get(row, "source_id")
        .map_err(|error| format!("Failed to read source id: {error}"))
}

fn source_key_from_row(row: &sqlx::sqlite::SqliteRow) -> Result<String, String> {
    sqlx::Row::try_get(row, "source_key")
        .map_err(|error| format!("Failed to read source key: {error}"))
}

fn name_from_row(row: &sqlx::sqlite::SqliteRow) -> Result<String, String> {
    sqlx::Row::try_get(row, "name").map_err(|error| format!("Failed to read source name: {error}"))
}

fn display_name_from_row(row: &sqlx::sqlite::SqliteRow) -> Result<String, String> {
    sqlx::Row::try_get(row, "display_name")
        .map_err(|error| format!("Failed to read source display name: {error}"))
}

fn web_url_from_row(row: &sqlx::sqlite::SqliteRow) -> Result<Option<String>, String> {
    sqlx::Row::try_get(row, "web_url")
        .map_err(|error| format!("Failed to read source URL: {error}"))
}
