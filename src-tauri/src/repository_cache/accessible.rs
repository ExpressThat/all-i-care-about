use super::db::{db_pool, now_seconds, row_to_accessible_repository};
use super::models::AccessibleRepository;
use crate::provider_security::get_provider_type;
use crate::providers::list_accessible_repositories as list_provider_repositories;
use crate::providers::types::ProviderContext;
use tauri::AppHandle;

#[tauri::command]
pub async fn list_accessible_repositories(
    app: AppHandle,
    provider_id: String,
    search: Option<String>,
) -> Result<Vec<AccessibleRepository>, String> {
    log::debug!(
        "list_accessible_repositories request received: provider_id={}, search={:?}",
        provider_id,
        search
    );
    let pool = db_pool(&app).await?;
    let search = search.unwrap_or_default();
    let rows = if search.trim().is_empty() {
        sqlx::query(
            r#"
            SELECT provider_id, owner, name, full_name, is_private, is_archived, updated_at, last_seen_at
            FROM accessible_repositories
            WHERE provider_id = ?
            ORDER BY full_name COLLATE NOCASE
            LIMIT 200
            "#,
        )
        .bind(&provider_id)
        .fetch_all(&pool)
        .await
    } else {
        let pattern = format!("%{}%", search.trim());
        sqlx::query(
            r#"
            SELECT provider_id, owner, name, full_name, is_private, is_archived, updated_at, last_seen_at
            FROM accessible_repositories
            WHERE provider_id = ? AND full_name LIKE ?
            ORDER BY full_name COLLATE NOCASE
            LIMIT 200
            "#,
        )
        .bind(&provider_id)
        .bind(pattern)
        .fetch_all(&pool)
        .await
    }
    .map_err(|error| format!("Failed to list accessible repositories: {error}"))?;

    let row_count = rows.len();
    let repositories = rows
        .into_iter()
        .map(row_to_accessible_repository)
        .collect::<Result<Vec<_>, _>>()?;
    log::info!(
        "list_accessible_repositories completed: provider_id={}, results={}",
        provider_id,
        row_count
    );
    Ok(repositories)
}

#[tauri::command]
pub async fn refresh_accessible_repositories(
    app: AppHandle,
    provider_id: String,
) -> Result<Vec<AccessibleRepository>, String> {
    log::info!("refresh_accessible_repositories request received: provider_id={provider_id}");
    let pool = db_pool(&app).await?;
    let provider_type = get_provider_type(&app, &provider_id)?;
    let context = ProviderContext {
        app: &app,
        pool: &pool,
        provider_id: &provider_id,
        provider_type,
    };
    let repositories = list_provider_repositories(&context).await?;
    let provider_count = repositories.len();
    log::info!(
        "refresh_accessible_repositories fetched provider repositories: provider_id={}, count={}",
        provider_id,
        provider_count
    );
    let seen_at = now_seconds();

    for repository in repositories {
        sqlx::query(
            r#"
            INSERT INTO accessible_repositories (
                provider_id, owner, name, full_name, is_private, is_archived, updated_at, last_seen_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id, full_name) DO UPDATE SET
                owner = excluded.owner,
                name = excluded.name,
                is_private = excluded.is_private,
                is_archived = excluded.is_archived,
                updated_at = excluded.updated_at,
                last_seen_at = excluded.last_seen_at
            "#,
        )
        .bind(&provider_id)
        .bind(repository.owner)
        .bind(repository.name)
        .bind(repository.full_name)
        .bind(if repository.is_private { 1 } else { 0 })
        .bind(if repository.is_archived { 1 } else { 0 })
        .bind(repository.updated_at)
        .bind(seen_at)
        .execute(&pool)
        .await
        .map_err(|error| format!("Failed to cache accessible repository: {error}"))?;
    }

    let cached = list_accessible_repositories(app, provider_id.clone(), None).await?;
    log::info!(
        "refresh_accessible_repositories completed: provider_id={}, fetched={}, cached_results={}",
        provider_id,
        provider_count,
        cached.len()
    );
    Ok(cached)
}
