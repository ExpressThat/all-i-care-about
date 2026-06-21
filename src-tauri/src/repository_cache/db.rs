use super::models::{AccessibleRepository, CachedPullRequest, WatchedRepository};
use rand::RngCore;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions, SqliteRow};
use sqlx::{Pool, Row, Sqlite};
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const DB_FILE_NAME: &str = "aica.db";

pub async fn db_pool(app: &AppHandle) -> Result<Pool<Sqlite>, String> {
    let mut db_path = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Failed to resolve app config directory: {error}"))?;
    fs::create_dir_all(&db_path)
        .map_err(|error| format!("Failed to create app config directory: {error}"))?;
    db_path.push(DB_FILE_NAME);

    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true);

    SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|error| format!("Failed to open repository cache database: {error}"))
}

pub async fn load_watched_repository(
    pool: &Pool<Sqlite>,
    provider_id: &str,
    owner: &str,
    name: &str,
) -> Result<WatchedRepository, String> {
    let row = sqlx::query(
        r#"
        SELECT id, provider_id, owner, name, full_name, is_active, pulls_etag, last_checked_at
        FROM watched_repositories
        WHERE provider_id = ? AND owner = ? AND name = ?
        "#,
    )
    .bind(provider_id)
    .bind(owner)
    .bind(name)
    .fetch_one(pool)
    .await
    .map_err(|error| format!("Failed to load watched repository: {error}"))?;

    row_to_watched_repository(row)
}

pub fn row_to_watched_repository(row: SqliteRow) -> Result<WatchedRepository, String> {
    Ok(WatchedRepository {
        id: row.try_get("id").map_err(read_column_error)?,
        provider_id: row.try_get("provider_id").map_err(read_column_error)?,
        owner: row.try_get("owner").map_err(read_column_error)?,
        name: row.try_get("name").map_err(read_column_error)?,
        full_name: row.try_get("full_name").map_err(read_column_error)?,
        is_active: row
            .try_get::<i64, _>("is_active")
            .map_err(read_column_error)?
            == 1,
        pulls_etag: row.try_get("pulls_etag").map_err(read_column_error)?,
        last_checked_at: row.try_get("last_checked_at").map_err(read_column_error)?,
    })
}

pub fn row_to_cached_pull_request(row: SqliteRow) -> Result<CachedPullRequest, String> {
    Ok(CachedPullRequest {
        id: row.try_get("id").map_err(read_column_error)?,
        repository_id: row.try_get("repository_id").map_err(read_column_error)?,
        number: row.try_get("number").map_err(read_column_error)?,
        title: row.try_get("title").map_err(read_column_error)?,
        author_login: row.try_get("author_login").map_err(read_column_error)?,
        author_avatar_url: row
            .try_get("author_avatar_url")
            .map_err(read_column_error)?,
        state: row.try_get("state").map_err(read_column_error)?,
        updated_at: row.try_get("updated_at").map_err(read_column_error)?,
        html_url: row.try_get("html_url").map_err(read_column_error)?,
    })
}

pub fn row_to_accessible_repository(row: SqliteRow) -> Result<AccessibleRepository, String> {
    Ok(AccessibleRepository {
        provider_id: row.try_get("provider_id").map_err(read_column_error)?,
        owner: row.try_get("owner").map_err(read_column_error)?,
        name: row.try_get("name").map_err(read_column_error)?,
        full_name: row.try_get("full_name").map_err(read_column_error)?,
        is_private: row
            .try_get::<i64, _>("is_private")
            .map_err(read_column_error)?
            == 1,
        is_archived: row
            .try_get::<i64, _>("is_archived")
            .map_err(read_column_error)?
            == 1,
        updated_at: row.try_get("updated_at").map_err(read_column_error)?,
        last_seen_at: row.try_get("last_seen_at").map_err(read_column_error)?,
    })
}

pub fn now_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

pub fn random_id(prefix: &str) -> String {
    let mut rng = rand::thread_rng();
    format!("{prefix}_{:016x}{:016x}", rng.next_u64(), rng.next_u64())
}

fn read_column_error(error: sqlx::Error) -> String {
    format!("Failed to read database row: {error}")
}
