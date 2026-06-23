use crate::provider_security::{
    get_decrypted_provider_secret, get_provider_setting_string, verify_provider_origin,
};
use crate::providers::http::send_built_provider_request;
use base64::Engine;
use reqwest::{Client, Method, Response};
use serde_json::Value;
use sqlx::{Pool, Sqlite};
use tauri::AppHandle;
use url::Url;

const OPENSEARCH_API_URL_SETTING: &str = "apiUrl";
const OPENSEARCH_AUTH_MODE_SETTING: &str = "authMode";
const OPENSEARCH_USERNAME_SETTING: &str = "username";
const OPENSEARCH_PASSWORD_SETTING: &str = "password";
const OPENSEARCH_BEARER_TOKEN_SETTING: &str = "bearerToken";

pub struct OpenSearchClient<'a> {
    app: &'a AppHandle,
    api_url: Url,
    auth: OpenSearchAuth,
    client: Client,
    pool: &'a Pool<Sqlite>,
    provider_id: &'a str,
}

enum OpenSearchAuth {
    None,
    Basic { username: String, password: String },
    Bearer { token: String },
}

pub fn open_search_client<'a>(
    app: &'a AppHandle,
    pool: &'a Pool<Sqlite>,
    provider_id: &'a str,
) -> Result<OpenSearchClient<'a>, String> {
    let api_url = get_provider_setting_string(app, provider_id, OPENSEARCH_API_URL_SETTING)?;
    verify_provider_origin(app, provider_id, &api_url)?;
    let auth_mode = get_provider_setting_string(app, provider_id, OPENSEARCH_AUTH_MODE_SETTING)?;
    let auth = match auth_mode.as_str() {
        "none" => OpenSearchAuth::None,
        "basic" => OpenSearchAuth::Basic {
            username: get_provider_setting_string(app, provider_id, OPENSEARCH_USERNAME_SETTING)?,
            password: get_decrypted_provider_secret(app, provider_id, OPENSEARCH_PASSWORD_SETTING)?,
        },
        "bearer" => OpenSearchAuth::Bearer {
            token: get_decrypted_provider_secret(
                app,
                provider_id,
                OPENSEARCH_BEARER_TOKEN_SETTING,
            )?,
        },
        _ => return Err("OpenSearch authentication mode is invalid.".to_string()),
    };

    Ok(OpenSearchClient {
        app,
        api_url: Url::parse(&api_url)
            .map_err(|error| format!("Invalid OpenSearch API URL: {error}"))?,
        auth,
        client: Client::new(),
        pool,
        provider_id,
    })
}

impl<'a> OpenSearchClient<'a> {
    pub async fn get(&self, path_and_query: &str) -> Result<Response, String> {
        let url = self.url(path_and_query)?;
        let builder = self.apply_auth(
            self.client
                .request(Method::GET, url.as_str())
                .header(reqwest::header::ACCEPT, "application/json")
                .header(reqwest::header::USER_AGENT, "all-i-care-about"),
        );
        send_built_provider_request(
            self.app,
            self.pool,
            builder,
            self.provider_id,
            "opensearch",
            Method::GET,
            url.as_str(),
        )
        .await
    }

    pub async fn get_dashboards_api(&self, path_and_query: &str) -> Result<Response, String> {
        let url = self.dashboards_url(path_and_query)?;
        let builder = self.apply_auth(
            self.client
                .request(Method::GET, url.as_str())
                .header(reqwest::header::ACCEPT, "application/json")
                .header(reqwest::header::USER_AGENT, "all-i-care-about")
                .header("osd-xsrf", "true")
                .header("kbn-xsrf", "true"),
        );
        send_built_provider_request(
            self.app,
            self.pool,
            builder,
            self.provider_id,
            "opensearch",
            Method::GET,
            url.as_str(),
        )
        .await
    }

    pub async fn post_json(&self, path: &str, body: &Value) -> Result<Response, String> {
        let url = self.url(path)?;
        let builder = self.apply_auth(
            self.client
                .request(Method::POST, url.as_str())
                .header(reqwest::header::ACCEPT, "application/json")
                .header(reqwest::header::CONTENT_TYPE, "application/json")
                .header(reqwest::header::USER_AGENT, "all-i-care-about")
                .json(body),
        );
        send_built_provider_request(
            self.app,
            self.pool,
            builder,
            self.provider_id,
            "opensearch",
            Method::POST,
            url.as_str(),
        )
        .await
    }

    fn apply_auth(&self, builder: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        match &self.auth {
            OpenSearchAuth::None => builder,
            OpenSearchAuth::Basic { username, password } => {
                let credentials = format!("{username}:{password}");
                builder.header(
                    reqwest::header::AUTHORIZATION,
                    format!(
                        "Basic {}",
                        base64::engine::general_purpose::STANDARD.encode(credentials)
                    ),
                )
            }
            OpenSearchAuth::Bearer { token } => builder.bearer_auth(token),
        }
    }

    fn url(&self, path_and_query: &str) -> Result<Url, String> {
        self.api_url
            .join(path_and_query.trim_start_matches('/'))
            .map_err(|error| format!("Failed to build OpenSearch URL: {error}"))
    }

    fn dashboards_url(&self, path_and_query: &str) -> Result<Url, String> {
        let mut url = self.api_url.clone();
        let trimmed = path_and_query.trim_start_matches('/');
        let (path, query) = trimmed
            .split_once('?')
            .map_or((trimmed, None), |(path, query)| (path, Some(query)));

        url.set_path(&format!("/_dashboards/{path}"));
        url.set_query(query);
        Ok(url)
    }
}

pub async fn response_json(response: Response) -> Result<Value, String> {
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("OpenSearch request failed: {status} {body}"));
    }

    response
        .json::<Value>()
        .await
        .map_err(|error| format!("Failed to parse OpenSearch response: {error}"))
}
