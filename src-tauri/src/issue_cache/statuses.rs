use std::collections::HashSet;

use super::db::row_to_cached_issue_status;
use super::models::CachedIssueStatus;
use crate::repository_cache::db::db_pool;
use tauri::AppHandle;

#[tauri::command]
pub async fn list_cached_issue_statuses(
    app: AppHandle,
    source_watch_id: Option<String>,
) -> Result<Vec<CachedIssueStatus>, String> {
    log::debug!(
        "list_cached_issue_statuses request received: source_watch_id={:?}",
        source_watch_id
    );
    let pool = db_pool(&app).await?;
    let rows = if let Some(source_watch_id) = source_watch_id {
        sqlx::query(
            r#"
            SELECT
                issue_statuses.id,
                issue_statuses.source_watch_id,
                issue_statuses.status_id,
                issue_statuses.name,
                issue_statuses.category,
                issue_statuses.position,
                CASE WHEN hidden_issue_statuses.status_id IS NULL THEN 1 ELSE 0 END AS visible
            FROM issue_statuses
            LEFT JOIN hidden_issue_statuses
                ON hidden_issue_statuses.source_watch_id = issue_statuses.source_watch_id
                AND hidden_issue_statuses.status_id = issue_statuses.status_id
            WHERE issue_statuses.source_watch_id = ?
            ORDER BY issue_statuses.position, issue_statuses.name COLLATE NOCASE
            "#,
        )
        .bind(source_watch_id)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query(
            r#"
            SELECT
                issue_statuses.id,
                issue_statuses.source_watch_id,
                issue_statuses.status_id,
                issue_statuses.name,
                issue_statuses.category,
                issue_statuses.position,
                CASE WHEN hidden_issue_statuses.status_id IS NULL THEN 1 ELSE 0 END AS visible
            FROM issue_statuses
            LEFT JOIN hidden_issue_statuses
                ON hidden_issue_statuses.source_watch_id = issue_statuses.source_watch_id
                AND hidden_issue_statuses.status_id = issue_statuses.status_id
            ORDER BY issue_statuses.source_watch_id, issue_statuses.position, issue_statuses.name COLLATE NOCASE
            "#,
        )
        .fetch_all(&pool)
        .await
    }
    .map_err(|error| format!("Failed to list cached issue statuses: {error}"))?;

    let row_count = rows.len();
    let statuses = rows
        .into_iter()
        .map(row_to_cached_issue_status)
        .collect::<Result<Vec<_>, _>>()?;
    log::info!("list_cached_issue_statuses completed: results={row_count}");
    Ok(statuses)
}

#[tauri::command]
pub async fn set_visible_issue_statuses(
    app: AppHandle,
    source_watch_id: String,
    visible_status_ids: Vec<String>,
) -> Result<Vec<CachedIssueStatus>, String> {
    log::debug!(
        "set_visible_issue_statuses request received: source_watch_id={}, visible_count={}",
        source_watch_id,
        visible_status_ids.len()
    );
    let pool = db_pool(&app).await?;
    let rows = sqlx::query(
        r#"
        SELECT status_id
        FROM issue_statuses
        WHERE source_watch_id = ?
        "#,
    )
    .bind(&source_watch_id)
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Failed to list issue statuses for visibility update: {error}"))?;
    let visible_status_ids = visible_status_ids.into_iter().collect::<HashSet<_>>();
    let hidden_status_ids = rows
        .into_iter()
        .map(|row| {
            sqlx::Row::try_get::<String, _>(&row, "status_id")
                .map_err(|error| format!("Failed to read issue status id: {error}"))
        })
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .filter(|status_id| !visible_status_ids.contains(status_id))
        .collect::<Vec<_>>();

    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| format!("Failed to start issue status visibility transaction: {error}"))?;

    sqlx::query("DELETE FROM hidden_issue_statuses WHERE source_watch_id = ?")
        .bind(&source_watch_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to clear hidden issue statuses: {error}"))?;

    for status_id in hidden_status_ids {
        sqlx::query(
            r#"
            INSERT INTO hidden_issue_statuses (source_watch_id, status_id)
            VALUES (?, ?)
            "#,
        )
        .bind(&source_watch_id)
        .bind(status_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to save hidden issue status: {error}"))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("Failed to commit issue status visibility update: {error}"))?;

    list_cached_issue_statuses(app, Some(source_watch_id)).await
}
