use super::db::{db_pool, row_to_cached_pull_request};
use super::models::CachedPullRequest;
use tauri::AppHandle;

#[tauri::command]
pub async fn list_cached_pull_requests(
    app: AppHandle,
    repository_id: Option<String>,
) -> Result<Vec<CachedPullRequest>, String> {
    log::debug!(
        "list_cached_pull_requests request received: repository_id={:?}",
        repository_id
    );
    let pool = db_pool(&app).await?;
    let rows = if let Some(repository_id) = repository_id {
        sqlx::query(
            r#"
            SELECT id, repository_id, number, title, author_login, author_avatar_url, state, updated_at, html_url
            FROM pull_requests
            WHERE repository_id = ?
            ORDER BY updated_at DESC
            "#,
        )
        .bind(repository_id)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query(
            r#"
            SELECT id, repository_id, number, title, author_login, author_avatar_url, state, updated_at, html_url
            FROM pull_requests
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(&pool)
        .await
    }
    .map_err(|error| format!("Failed to list cached pull requests: {error}"))?;

    let row_count = rows.len();
    let pull_requests = rows
        .into_iter()
        .map(row_to_cached_pull_request)
        .collect::<Result<Vec<_>, _>>()?;
    log::info!("list_cached_pull_requests completed: results={row_count}");
    Ok(pull_requests)
}
