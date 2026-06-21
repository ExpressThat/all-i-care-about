use crate::providers::http::send_built_provider_request;
use base64::Engine;
use reqwest::{Client, Method, Response};
use sqlx::{Pool, Sqlite};
use tauri::AppHandle;
use url::Url;

pub struct JiraClient<'a> {
    app: &'a AppHandle,
    api_url: Url,
    client: Client,
    email: String,
    pool: &'a Pool<Sqlite>,
    provider_id: &'a str,
    token: String,
}

impl<'a> JiraClient<'a> {
    pub fn new(
        app: &'a AppHandle,
        pool: &'a Pool<Sqlite>,
        provider_id: &'a str,
        api_url: &str,
        email: String,
        token: String,
    ) -> Result<Self, String> {
        log::debug!(
            "Creating Jira client: provider_id={}, api_url={api_url}",
            provider_id
        );
        Ok(Self {
            app,
            api_url: Url::parse(api_url)
                .map_err(|error| format!("Invalid Jira API URL: {error}"))?,
            client: Client::new(),
            email,
            pool,
            provider_id,
            token,
        })
    }

    pub async fn get(&self, path_and_query: &str, etag: Option<&str>) -> Result<Response, String> {
        let url = self.url(path_and_query)?;
        log::debug!(
            "Jira GET request prepared: provider_id={}, path={}, has_etag={}",
            self.provider_id,
            path_and_query,
            etag.is_some()
        );
        let mut builder = self
            .client
            .request(Method::GET, url.as_str())
            .header(reqwest::header::ACCEPT, "application/json")
            .header(reqwest::header::USER_AGENT, "all-i-care-about")
            .header(reqwest::header::AUTHORIZATION, self.authorization_header());

        if let Some(etag) = etag {
            builder = builder.header(reqwest::header::IF_NONE_MATCH, etag);
        }

        send_built_provider_request(
            self.app,
            self.pool,
            builder,
            self.provider_id,
            "jira",
            Method::GET,
            url.as_str(),
        )
        .await
    }

    pub fn browse_issue_url(&self, issue_key: &str) -> Result<String, String> {
        log::debug!("Building Jira browse issue URL: issue_key={issue_key}");
        Ok(self.url(&format!("/browse/{issue_key}"))?.to_string())
    }

    pub fn provider_id(&self) -> &str {
        self.provider_id
    }

    fn url(&self, path_and_query: &str) -> Result<Url, String> {
        self.api_url
            .join(path_and_query.trim_start_matches('/'))
            .map_err(|error| format!("Failed to build Jira URL: {error}"))
    }

    fn authorization_header(&self) -> String {
        let credentials = format!("{}:{}", self.email, self.token);
        format!(
            "Basic {}",
            base64::engine::general_purpose::STANDARD.encode(credentials)
        )
    }
}
