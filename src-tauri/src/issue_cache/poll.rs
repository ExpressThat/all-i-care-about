use super::models::WatchedIssueSource;
use crate::provider_security::get_provider_type;
use crate::providers::types::{ProviderContext, ProviderIssueSource};
use crate::providers::{list_issue_statuses, list_issues};
use crate::repository_cache::db::now_seconds;
use sqlx::{Pool, Sqlite};
use tauri::{AppHandle, Emitter};

pub async fn poll_issue_source(
    app: &AppHandle,
    pool: &Pool<Sqlite>,
    watched: &WatchedIssueSource,
) -> Result<(), String> {
    log::debug!(
        "Polling issue source: source_watch_id={}, display_name={}, provider_id={}, last_checked_at={:?}, has_etag={}",
        watched.id,
        watched.display_name,
        watched.provider_id,
        watched.last_checked_at,
        watched.issues_etag.is_some()
    );
    let provider_type = get_provider_type(app, &watched.provider_id)?;
    let context = ProviderContext {
        app,
        pool,
        provider_id: &watched.provider_id,
        provider_type,
    };
    let provider_source = ProviderIssueSource {
        id: watched.source_id.clone(),
        key: watched.source_key.clone(),
        name: watched.name.clone(),
        display_name: watched.display_name.clone(),
        web_url: watched.web_url.clone(),
        updated_at: None,
    };
    let statuses = list_issue_statuses(&context, &provider_source).await?;
    let page = list_issues(&context, &provider_source, watched.issues_etag.as_deref()).await?;
    let checked_at = now_seconds();

    if page.not_modified {
        log::info!(
            "Issue source poll not modified: source_watch_id={}, display_name={}",
            watched.id,
            watched.display_name
        );
        sqlx::query(
            "UPDATE watched_issue_sources SET last_checked_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(checked_at)
        .bind(checked_at)
        .bind(&watched.id)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to update issue source check time: {error}"))?;
        return Ok(());
    }

    if page.failed {
        log::error!(
            "Issue source poll returned failed provider page: source_watch_id={}, display_name={}",
            watched.id,
            watched.display_name
        );
        return Ok(());
    }

    let status_count = statuses.len();
    let issue_count = page.issues.len();
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| format!("Failed to start issue cache transaction: {error}"))?;

    sqlx::query("DELETE FROM issue_statuses WHERE source_watch_id = ?")
        .bind(&watched.id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to clear cached issue statuses: {error}"))?;
    sqlx::query("DELETE FROM issues WHERE source_watch_id = ?")
        .bind(&watched.id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to clear cached issues: {error}"))?;

    for status in statuses {
        sqlx::query(
            r#"
            INSERT INTO issue_statuses (
                id, source_watch_id, status_id, name, category, position
            )
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(format!("{}:{}", watched.id, status.id))
        .bind(&watched.id)
        .bind(status.id)
        .bind(status.name)
        .bind(status.category)
        .bind(status.position)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to cache issue status: {error}"))?;
    }

    for issue in page.issues {
        sqlx::query(
            r#"
            INSERT INTO issues (
                id, source_watch_id, key, title, status_id, status_name, author_name,
                author_avatar_url, assignee_name, assignee_avatar_url, updated_at, html_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(issue.id)
        .bind(&watched.id)
        .bind(issue.key)
        .bind(issue.title)
        .bind(issue.status_id)
        .bind(issue.status_name)
        .bind(issue.author_name)
        .bind(issue.author_avatar_url)
        .bind(issue.assignee_name)
        .bind(issue.assignee_avatar_url)
        .bind(issue.updated_at)
        .bind(issue.html_url)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to cache issue: {error}"))?;
    }

    sqlx::query("UPDATE watched_issue_sources SET issues_etag = ?, last_checked_at = ?, updated_at = ? WHERE id = ?")
        .bind(&page.etag)
        .bind(checked_at)
        .bind(checked_at)
        .bind(&watched.id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to update watched issue source: {error}"))?;

    transaction
        .commit()
        .await
        .map_err(|error| format!("Failed to commit issue cache transaction: {error}"))?;

    let _ = app.emit("provider-issue-cache-updated", &watched.id);
    log::info!(
        "Issue source poll completed: source_watch_id={}, display_name={}, statuses_cached={}, issues_cached={}, has_new_etag={}",
        watched.id,
        watched.display_name,
        status_count,
        issue_count,
        page.etag.is_some()
    );
    Ok(())
}
