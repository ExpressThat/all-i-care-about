use super::db::row_to_accessible_issue_source;
use super::models::AccessibleIssueSource;
use crate::provider_security::get_provider_type;
use crate::providers::list_accessible_issue_sources as list_provider_issue_sources;
use crate::providers::types::ProviderContext;
use crate::repository_cache::db::{db_pool, now_seconds};
use tauri::AppHandle;

#[tauri::command]
pub async fn list_accessible_issue_sources(
    app: AppHandle,
    provider_id: String,
    search: Option<String>,
) -> Result<Vec<AccessibleIssueSource>, String> {
    log::debug!(
        "list_accessible_issue_sources request received: provider_id={}, search={:?}",
        provider_id,
        search
    );
    let pool = db_pool(&app).await?;
    let search = search.unwrap_or_default();
    let rows = if search.trim().is_empty() {
        sqlx::query(
            r#"
            SELECT provider_id, source_id, source_key, name, display_name, web_url, updated_at, last_seen_at
            FROM accessible_issue_sources
            WHERE provider_id = ?
            ORDER BY display_name COLLATE NOCASE
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
            SELECT provider_id, source_id, source_key, name, display_name, web_url, updated_at, last_seen_at
            FROM accessible_issue_sources
            WHERE provider_id = ? AND display_name LIKE ?
            ORDER BY display_name COLLATE NOCASE
            LIMIT 200
            "#,
        )
        .bind(&provider_id)
        .bind(pattern)
        .fetch_all(&pool)
        .await
    }
    .map_err(|error| format!("Failed to list accessible issue sources: {error}"))?;

    rows.into_iter()
        .map(row_to_accessible_issue_source)
        .collect::<Result<Vec<_>, _>>()
        .map(|sources| {
            log::info!(
                "list_accessible_issue_sources completed: provider_id={}, results={}",
                provider_id,
                sources.len()
            );
            sources
        })
}

#[tauri::command]
pub async fn refresh_accessible_issue_sources(
    app: AppHandle,
    provider_id: String,
) -> Result<Vec<AccessibleIssueSource>, String> {
    log::info!("refresh_accessible_issue_sources request received: provider_id={provider_id}");
    let pool = db_pool(&app).await?;
    let provider_type = get_provider_type(&app, &provider_id)?;
    let context = ProviderContext {
        app: &app,
        pool: &pool,
        provider_id: &provider_id,
        provider_type,
    };
    let sources = list_provider_issue_sources(&context).await?;
    let provider_count = sources.len();
    log::info!(
        "refresh_accessible_issue_sources fetched provider sources: provider_id={}, count={}",
        provider_id,
        provider_count
    );
    let seen_at = now_seconds();

    for source in sources {
        sqlx::query(
            r#"
            INSERT INTO accessible_issue_sources (
                provider_id, source_id, source_key, name, display_name, web_url, updated_at, last_seen_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id, source_id) DO UPDATE SET
                source_key = excluded.source_key,
                name = excluded.name,
                display_name = excluded.display_name,
                web_url = excluded.web_url,
                updated_at = excluded.updated_at,
                last_seen_at = excluded.last_seen_at
            "#,
        )
        .bind(&provider_id)
        .bind(source.id)
        .bind(source.key)
        .bind(source.name)
        .bind(source.display_name)
        .bind(source.web_url)
        .bind(source.updated_at)
        .bind(seen_at)
        .execute(&pool)
        .await
        .map_err(|error| format!("Failed to cache accessible issue source: {error}"))?;
    }

    let cached = list_accessible_issue_sources(app, provider_id.clone(), None).await?;
    log::info!(
        "refresh_accessible_issue_sources completed: provider_id={}, fetched={}, cached_results={}",
        provider_id,
        provider_count,
        cached.len()
    );
    Ok(cached)
}
