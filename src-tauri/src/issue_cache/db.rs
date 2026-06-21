use super::models::{AccessibleIssueSource, CachedIssue, CachedIssueStatus, WatchedIssueSource};
use sqlx::sqlite::SqliteRow;
use sqlx::Row;

pub fn row_to_accessible_issue_source(row: SqliteRow) -> Result<AccessibleIssueSource, String> {
    Ok(AccessibleIssueSource {
        provider_id: row.try_get("provider_id").map_err(read_column_error)?,
        source_id: row.try_get("source_id").map_err(read_column_error)?,
        source_key: row.try_get("source_key").map_err(read_column_error)?,
        name: row.try_get("name").map_err(read_column_error)?,
        display_name: row.try_get("display_name").map_err(read_column_error)?,
        web_url: row.try_get("web_url").map_err(read_column_error)?,
        updated_at: row.try_get("updated_at").map_err(read_column_error)?,
        last_seen_at: row.try_get("last_seen_at").map_err(read_column_error)?,
    })
}

pub fn row_to_watched_issue_source(row: SqliteRow) -> Result<WatchedIssueSource, String> {
    Ok(WatchedIssueSource {
        id: row.try_get("id").map_err(read_column_error)?,
        provider_id: row.try_get("provider_id").map_err(read_column_error)?,
        source_id: row.try_get("source_id").map_err(read_column_error)?,
        source_key: row.try_get("source_key").map_err(read_column_error)?,
        name: row.try_get("name").map_err(read_column_error)?,
        display_name: row.try_get("display_name").map_err(read_column_error)?,
        web_url: row.try_get("web_url").map_err(read_column_error)?,
        issues_etag: row.try_get("issues_etag").map_err(read_column_error)?,
        last_checked_at: row.try_get("last_checked_at").map_err(read_column_error)?,
    })
}

pub fn row_to_cached_issue_status(row: SqliteRow) -> Result<CachedIssueStatus, String> {
    Ok(CachedIssueStatus {
        id: row.try_get("id").map_err(read_column_error)?,
        source_watch_id: row.try_get("source_watch_id").map_err(read_column_error)?,
        status_id: row.try_get("status_id").map_err(read_column_error)?,
        name: row.try_get("name").map_err(read_column_error)?,
        category: row.try_get("category").map_err(read_column_error)?,
        position: row.try_get("position").map_err(read_column_error)?,
        visible: row
            .try_get::<i64, _>("visible")
            .map_err(read_column_error)?
            != 0,
    })
}

pub fn row_to_cached_issue(row: SqliteRow) -> Result<CachedIssue, String> {
    Ok(CachedIssue {
        id: row.try_get("id").map_err(read_column_error)?,
        source_watch_id: row.try_get("source_watch_id").map_err(read_column_error)?,
        key: row.try_get("key").map_err(read_column_error)?,
        title: row.try_get("title").map_err(read_column_error)?,
        status_id: row.try_get("status_id").map_err(read_column_error)?,
        status_name: row.try_get("status_name").map_err(read_column_error)?,
        author_name: row.try_get("author_name").map_err(read_column_error)?,
        author_avatar_url: row
            .try_get("author_avatar_url")
            .map_err(read_column_error)?,
        assignee_name: row.try_get("assignee_name").map_err(read_column_error)?,
        assignee_avatar_url: row
            .try_get("assignee_avatar_url")
            .map_err(read_column_error)?,
        updated_at: row.try_get("updated_at").map_err(read_column_error)?,
        html_url: row.try_get("html_url").map_err(read_column_error)?,
    })
}

fn read_column_error(error: sqlx::Error) -> String {
    format!("Failed to read database row: {error}")
}
