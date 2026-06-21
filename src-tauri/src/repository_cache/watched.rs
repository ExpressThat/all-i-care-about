use super::db::{
    db_pool, load_watched_repository, now_seconds, random_id, row_to_watched_repository,
};
use super::models::WatchedRepository;
use crate::provider_security::get_provider_type;
use crate::providers::{list_open_pull_requests, types::ProviderContext};
use sqlx::{Pool, Sqlite};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn list_watched_repositories(
    app: AppHandle,
    provider_id: Option<String>,
) -> Result<Vec<WatchedRepository>, String> {
    log::debug!(
        "list_watched_repositories request received: provider_id={:?}",
        provider_id
    );
    let pool = db_pool(&app).await?;
    let rows = if let Some(provider_id) = provider_id {
        sqlx::query(
            r#"
            SELECT id, provider_id, owner, name, full_name, is_active, pulls_etag, last_checked_at
            FROM watched_repositories
            WHERE provider_id = ?
            ORDER BY full_name COLLATE NOCASE
            "#,
        )
        .bind(provider_id)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query(
            r#"
            SELECT id, provider_id, owner, name, full_name, is_active, pulls_etag, last_checked_at
            FROM watched_repositories
            ORDER BY full_name COLLATE NOCASE
            "#,
        )
        .fetch_all(&pool)
        .await
    }
    .map_err(|error| format!("Failed to list watched repositories: {error}"))?;

    let row_count = rows.len();
    let repositories = rows
        .into_iter()
        .map(row_to_watched_repository)
        .collect::<Result<Vec<_>, _>>()?;
    log::info!("list_watched_repositories completed: results={row_count}");
    Ok(repositories)
}

#[tauri::command]
pub async fn add_watched_repository(
    app: AppHandle,
    provider_id: String,
    owner: String,
    name: String,
) -> Result<WatchedRepository, String> {
    log::info!(
        "add_watched_repository request received: provider_id={}, repository={}/{}",
        provider_id,
        owner,
        name
    );
    let pool = db_pool(&app).await?;
    let id = random_id("repo");
    let full_name = format!("{owner}/{name}");

    sqlx::query(
        r#"
        INSERT INTO watched_repositories (
            id, provider_id, owner, name, full_name, is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(provider_id, owner, name) DO UPDATE SET
            is_active = 1,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(id)
    .bind(&provider_id)
    .bind(&owner)
    .bind(&name)
    .bind(&full_name)
    .bind(now_seconds())
    .bind(now_seconds())
    .execute(&pool)
    .await
    .map_err(|error| format!("Failed to add watched repository: {error}"))?;

    let repository = load_watched_repository(&pool, &provider_id, &owner, &name).await?;
    if let Err(error) = poll_repository(&app, &pool, &repository).await {
        log::error!(
            "Initial repository poll failed after adding watched repository: repository_id={}, full_name={}, error={}",
            repository.id,
            repository.full_name,
            error
        );
    }
    log::info!(
        "add_watched_repository completed: repository_id={}, full_name={}",
        repository.id,
        repository.full_name
    );
    Ok(repository)
}

#[tauri::command]
pub async fn remove_watched_repository(
    app: AppHandle,
    repository_id: String,
) -> Result<(), String> {
    log::info!("remove_watched_repository request received: repository_id={repository_id}");
    let pool = db_pool(&app).await?;

    let result = sqlx::query("DELETE FROM watched_repositories WHERE id = ?")
        .bind(&repository_id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Failed to remove watched repository: {error}"))?;
    log::info!(
        "remove_watched_repository completed: repository_id={}, rows_affected={}",
        repository_id,
        result.rows_affected()
    );

    Ok(())
}

#[tauri::command]
pub async fn trigger_provider_pr_poll(app: AppHandle) -> Result<(), String> {
    log::info!("trigger_provider_pr_poll request received");
    let pool = db_pool(&app).await?;
    let rows = sqlx::query(
        r#"
        SELECT id, provider_id, owner, name, full_name, is_active, pulls_etag, last_checked_at
        FROM watched_repositories
        WHERE is_active = 1
        ORDER BY full_name COLLATE NOCASE
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Failed to load watched repositories: {error}"))?;

    let row_count = rows.len();
    log::debug!("trigger_provider_pr_poll loaded repositories: count={row_count}");
    for row in rows {
        let repository = row_to_watched_repository(row)?;
        poll_repository(&app, &pool, &repository).await?;
    }

    log::info!("trigger_provider_pr_poll completed: repositories_polled={row_count}");
    Ok(())
}

async fn poll_repository(
    app: &AppHandle,
    pool: &Pool<Sqlite>,
    repository: &WatchedRepository,
) -> Result<(), String> {
    log::debug!(
        "Polling repository: repository_id={}, full_name={}, provider_id={}, last_checked_at={:?}, has_etag={}",
        repository.id,
        repository.full_name,
        repository.provider_id,
        repository.last_checked_at,
        repository.pulls_etag.is_some()
    );
    let provider_type = get_provider_type(app, &repository.provider_id)?;
    let context = ProviderContext {
        app,
        pool,
        provider_id: &repository.provider_id,
        provider_type,
    };
    let has_missing_author_avatars =
        repository_has_missing_author_avatars(pool, &repository.id).await?;
    let pulls_etag = if has_missing_author_avatars {
        log::debug!(
            "Forcing repository poll without ETag because cached author avatars are missing: repository_id={}",
            repository.id
        );
        None
    } else {
        repository.pulls_etag.as_deref()
    };
    let pull_request_page =
        list_open_pull_requests(&context, &repository.owner, &repository.name, pulls_etag).await?;
    let checked_at = now_seconds();

    if pull_request_page.not_modified {
        log::info!(
            "Repository poll not modified: repository_id={}, full_name={}",
            repository.id,
            repository.full_name
        );
        sqlx::query(
            "UPDATE watched_repositories SET last_checked_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(checked_at)
        .bind(checked_at)
        .bind(&repository.id)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to update repository check time: {error}"))?;
        return Ok(());
    }

    if pull_request_page.failed {
        log::error!(
            "Repository poll returned failed provider page: repository_id={}, full_name={}",
            repository.id,
            repository.full_name
        );
        return Ok(());
    }

    let pull_request_count = pull_request_page.pull_requests.len();
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| format!("Failed to start PR cache transaction: {error}"))?;

    sqlx::query("DELETE FROM pull_requests WHERE repository_id = ?")
        .bind(&repository.id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to clear cached pull requests: {error}"))?;

    for pull_request in pull_request_page.pull_requests {
        sqlx::query(
            r#"
            INSERT INTO pull_requests (
                id, repository_id, number, title, author_login, author_avatar_url, state, updated_at, html_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(pull_request.id)
        .bind(&repository.id)
        .bind(pull_request.number)
        .bind(pull_request.title)
        .bind(pull_request.author_login)
        .bind(pull_request.author_avatar_url)
        .bind(pull_request.state)
        .bind(pull_request.updated_at)
        .bind(pull_request.html_url)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("Failed to cache pull request: {error}"))?;
    }

    sqlx::query(
        "UPDATE watched_repositories SET pulls_etag = ?, last_checked_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&pull_request_page.etag)
    .bind(checked_at)
    .bind(checked_at)
    .bind(&repository.id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("Failed to update watched repository: {error}"))?;

    transaction
        .commit()
        .await
        .map_err(|error| format!("Failed to commit PR cache transaction: {error}"))?;

    let _ = app.emit("provider-pr-cache-updated", &repository.id);
    log::info!(
        "Repository poll completed: repository_id={}, full_name={}, pull_requests_cached={}, has_new_etag={}",
        repository.id,
        repository.full_name,
        pull_request_count,
        pull_request_page.etag.is_some()
    );
    Ok(())
}

async fn repository_has_missing_author_avatars(
    pool: &Pool<Sqlite>,
    repository_id: &str,
) -> Result<bool, String> {
    log::debug!("Checking cached pull request avatars: repository_id={repository_id}");
    let missing_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM pull_requests
        WHERE repository_id = ? AND author_avatar_url IS NULL
        "#,
    )
    .bind(repository_id)
    .fetch_one(pool)
    .await
    .map_err(|error| format!("Failed to inspect cached pull request avatars: {error}"))?;

    log::debug!(
        "Cached pull request avatar check completed: repository_id={}, missing_count={}",
        repository_id,
        missing_count
    );
    Ok(missing_count > 0)
}
