use crate::providers::http::send_provider_request;
use reqwest::{Client, Method, Response};
use sqlx::{Pool, Sqlite};
use tauri::AppHandle;

const GITHUB_API_ORIGIN: &str = "https://api.github.com";

pub struct GitHubClient<'a> {
    app: &'a AppHandle,
    client: Client,
    pool: &'a Pool<Sqlite>,
    provider_id: &'a str,
    token: &'a str,
}

impl<'a> GitHubClient<'a> {
    pub fn new(
        app: &'a AppHandle,
        pool: &'a Pool<Sqlite>,
        provider_id: &'a str,
        token: &'a str,
    ) -> Self {
        Self {
            app,
            client: Client::new(),
            pool,
            provider_id,
            token,
        }
    }

    pub async fn get(&self, path_and_query: &str, etag: Option<&str>) -> Result<Response, String> {
        let url = format!("{GITHUB_API_ORIGIN}{path_and_query}");
        send_provider_request(
            self.app,
            self.pool,
            &self.client,
            self.provider_id,
            "github",
            Method::GET,
            &url,
            etag,
            self.token,
        )
        .await
    }
}
