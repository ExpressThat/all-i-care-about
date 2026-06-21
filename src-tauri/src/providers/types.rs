use crate::provider_security::metadata::ProviderType;
use sqlx::{Pool, Sqlite};
use tauri::AppHandle;

pub struct ProviderContext<'a> {
    pub app: &'a AppHandle,
    pub pool: &'a Pool<Sqlite>,
    pub provider_id: &'a str,
    pub provider_type: ProviderType,
}

pub struct ProviderRepository {
    pub owner: String,
    pub name: String,
    pub full_name: String,
    pub is_private: bool,
    pub is_archived: bool,
    pub updated_at: Option<String>,
}

pub struct ProviderPullRequest {
    pub id: String,
    pub number: i64,
    pub title: String,
    pub author_login: String,
    pub author_avatar_url: Option<String>,
    pub state: String,
    pub updated_at: String,
    pub html_url: String,
}

pub struct ProviderPullRequestPage {
    pub etag: Option<String>,
    pub failed: bool,
    pub not_modified: bool,
    pub pull_requests: Vec<ProviderPullRequest>,
}
