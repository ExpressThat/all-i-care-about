use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibleIssueSource {
    pub provider_id: String,
    pub source_id: String,
    pub source_key: String,
    pub name: String,
    pub display_name: String,
    pub web_url: Option<String>,
    pub updated_at: Option<String>,
    pub last_seen_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchedIssueSource {
    pub id: String,
    pub provider_id: String,
    pub source_id: String,
    pub source_key: String,
    pub name: String,
    pub display_name: String,
    pub web_url: Option<String>,
    pub issues_etag: Option<String>,
    pub last_checked_at: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedIssueStatus {
    pub id: String,
    pub source_watch_id: String,
    pub status_id: String,
    pub name: String,
    pub category: Option<String>,
    pub position: i64,
    pub visible: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedIssue {
    pub id: String,
    pub source_watch_id: String,
    pub key: String,
    pub title: String,
    pub status_id: String,
    pub status_name: String,
    pub author_name: Option<String>,
    pub author_avatar_url: Option<String>,
    pub assignee_name: Option<String>,
    pub assignee_avatar_url: Option<String>,
    pub updated_at: String,
    pub html_url: String,
}
