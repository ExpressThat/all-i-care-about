use crate::repository_cache::request_log::{consumed_rate_limit_units, log_provider_request};
use reqwest::{Client, Method, RequestBuilder, Response};
use sqlx::{Pool, Sqlite};
use tauri::AppHandle;

pub async fn send_provider_request(
    app: &AppHandle,
    pool: &Pool<Sqlite>,
    client: &Client,
    provider_id: &str,
    provider_type: &str,
    method: Method,
    url: &str,
    etag: Option<&str>,
    token: &str,
) -> Result<Response, String> {
    log::debug!(
        "Building provider request: provider_id={}, provider_type={}, method={}, url={}, has_etag={}",
        provider_id,
        provider_type,
        method,
        url,
        etag.is_some()
    );
    let mut builder = client
        .request(method.clone(), url)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .header(reqwest::header::USER_AGENT, "all-i-care-about")
        .bearer_auth(token);

    if let Some(etag) = etag {
        builder = builder.header(reqwest::header::IF_NONE_MATCH, etag);
    }

    send_built_provider_request(app, pool, builder, provider_id, provider_type, method, url).await
}

pub async fn send_built_provider_request(
    app: &AppHandle,
    pool: &Pool<Sqlite>,
    builder: RequestBuilder,
    provider_id: &str,
    provider_type: &str,
    method: Method,
    url: &str,
) -> Result<Response, String> {
    let method_text = method.as_str().to_string();
    log::info!(
        "Sending provider request: provider_id={}, provider_type={}, method={}, url={}",
        provider_id,
        provider_type,
        method_text,
        url
    );
    match builder.send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            let success = response.status().is_success()
                || response.status() == reqwest::StatusCode::NOT_MODIFIED;
            let rate_limit_used =
                consumed_rate_limit_units(response.status().as_u16(), response.headers());
            log::info!(
                "Provider request completed: provider_id={}, provider_type={}, method={}, url={}, status={}, success={}, rate_limit_used={}",
                provider_id,
                provider_type,
                method_text,
                url,
                status,
                success,
                rate_limit_used
            );
            let _ = log_provider_request(
                app,
                pool,
                provider_id,
                provider_type,
                &method_text,
                url,
                Some(status),
                success,
                rate_limit_used,
            )
            .await;
            Ok(response)
        }
        Err(error) => {
            log::error!(
                "Provider request failed: provider_id={}, provider_type={}, method={}, url={}, error={}",
                provider_id,
                provider_type,
                method_text,
                url,
                error
            );
            let _ = log_provider_request(
                app,
                pool,
                provider_id,
                provider_type,
                &method_text,
                url,
                None,
                false,
                0,
            )
            .await;
            Err(format!("Provider request failed: {error}"))
        }
    }
}
