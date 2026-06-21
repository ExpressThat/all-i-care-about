use super::db::row_to_cached_issue;
use super::models::CachedIssue;
use crate::repository_cache::db::db_pool;
use tauri::AppHandle;

#[tauri::command]
pub async fn list_cached_issues(
    app: AppHandle,
    source_watch_id: Option<String>,
) -> Result<Vec<CachedIssue>, String> {
    log::debug!(
        "list_cached_issues request received: source_watch_id={:?}",
        source_watch_id
    );
    let pool = db_pool(&app).await?;
    let rows = if let Some(source_watch_id) = source_watch_id {
        sqlx::query(
            r#"
            SELECT id, source_watch_id, key, title, status_id, status_name, author_name,
                   author_avatar_url, assignee_name, assignee_avatar_url, updated_at, html_url
            FROM issues
            WHERE source_watch_id = ?
            ORDER BY updated_at DESC
            "#,
        )
        .bind(source_watch_id)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query(
            r#"
            SELECT id, source_watch_id, key, title, status_id, status_name, author_name,
                   author_avatar_url, assignee_name, assignee_avatar_url, updated_at, html_url
            FROM issues
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(&pool)
        .await
    }
    .map_err(|error| format!("Failed to list cached issues: {error}"))?;

    let row_count = rows.len();
    let issues = rows
        .into_iter()
        .map(row_to_cached_issue)
        .collect::<Result<Vec<_>, _>>()?;
    log::info!("list_cached_issues completed: results={row_count}");
    Ok(issues)
}
