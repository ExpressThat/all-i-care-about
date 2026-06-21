use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchedRepository {
    pub id: String,
    pub provider_id: String,
    pub owner: String,
    pub name: String,
    pub full_name: String,
    pub is_active: bool,
    pub pulls_etag: Option<String>,
    pub last_checked_at: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedPullRequest {
    pub id: String,
    pub repository_id: String,
    pub number: i64,
    pub title: String,
    pub author_login: String,
    pub author_avatar_url: Option<String>,
    pub state: String,
    pub updated_at: String,
    pub html_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibleRepository {
    pub provider_id: String,
    pub owner: String,
    pub name: String,
    pub full_name: String,
    pub is_private: bool,
    pub is_archived: bool,
    pub updated_at: Option<String>,
    pub last_seen_at: i64,
}
