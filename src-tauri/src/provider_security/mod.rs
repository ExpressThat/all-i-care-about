mod crypto;
mod metadata;
mod settings;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use crypto::decrypt_secret;
use metadata::origin_for_url;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use settings::{
    get_setting_value, parse_setting_path,
    read_settings, remove_provider_settings, save_provider_settings, write_settings,
    verify_provider_security, SaveProviderRequest, Settings,
};
use std::collections::HashMap;
use tauri::AppHandle;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFetchRequest {
    provider_id: String,
    url: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
    secret: Option<ProviderFetchSecret>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFetchSecret {
    setting_key: String,
    header_name: String,
    value_template: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFetchResponse {
    ok: bool,
    status: u16,
    status_text: String,
    url: String,
    headers: HashMap<String, String>,
    body_base64: String,
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
    let settings = read_settings(&app)?;
    write_settings(&app, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn set_theme(app: AppHandle, theme: String) -> Result<Settings, String> {
    if !matches!(theme.as_str(), "System" | "Light" | "Dark") {
        return Err("Invalid theme.".to_string());
    }

    let mut settings = read_settings(&app)?;
    settings.theme = theme;
    write_settings(&app, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn save_provider(app: AppHandle, request: SaveProviderRequest) -> Result<Settings, String> {
    save_provider_settings(&app, request)
}

#[tauri::command]
pub fn remove_provider(app: AppHandle, provider_id: String) -> Result<Settings, String> {
    remove_provider_settings(&app, &provider_id)
}

#[tauri::command]
pub async fn provider_fetch(
    app: AppHandle,
    request: ProviderFetchRequest,
) -> Result<ProviderFetchResponse, String> {
    let settings = read_settings(&app)?;
    let provider = settings
        .providers
        .iter()
        .find(|provider| provider.id == request.provider_id)
        .ok_or_else(|| "Provider is not configured.".to_string())?;
    let provider_security = verify_provider_security(&app, provider)?;

    validate_allowed_origin(&provider_security.allowed_origins, &request.url)?;

    let method = request.method.as_deref().unwrap_or("GET");
    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|error| format!("Invalid HTTP method: {error}"))?;
    let client = reqwest::Client::new();
    let mut builder = client.request(method, &request.url);

    if let Some(headers) = request.headers {
        for (name, value) in headers {
            builder = builder.header(name, value);
        }
    }

    if let Some(secret) = request.secret {
        let setting_path = parse_setting_path(&secret.setting_key)?;
        let normalized_setting_path = setting_path.join(".");
        if !provider_security
            .secret_setting_paths
            .iter()
            .any(|path| path == &normalized_setting_path)
        {
            return Err(format!(
                "\"{}\" is not a secret setting for this provider.",
                secret.setting_key
            ));
        }

        let encrypted_secret = get_setting_value(&provider.settings, &setting_path)
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                format!(
                    "Provider is missing secret setting \"{}\".",
                    secret.setting_key
                )
            })?;
        let decrypted_secret = decrypt_secret(&app, encrypted_secret)?;
        let header_value = secret
            .value_template
            .replace("{secret}", &decrypted_secret);
        builder = builder.header(secret.header_name, header_value);
    }

    if let Some(body) = request.body {
        builder = builder.body(body);
    }

    let response = builder
        .send()
        .await
        .map_err(|error| format!("Provider HTTP request failed: {error}"))?;
    let status = response.status();
    let url = response.url().to_string();
    let headers = response_headers(response.headers());
    let body = response
        .bytes()
        .await
        .map_err(|error| format!("Failed to read response body: {error}"))?;

    Ok(ProviderFetchResponse {
        ok: status.is_success(),
        status: status.as_u16(),
        status_text: status
            .canonical_reason()
            .map_or_else(String::new, ToString::to_string),
        url,
        headers,
        body_base64: STANDARD.encode(body),
    })
}

fn validate_allowed_origin(allowed_origins: &[String], request_url: &str) -> Result<(), String> {
    let request_origin = origin_for_url(request_url)?;

    if allowed_origins.iter().any(|origin| origin == &request_origin) {
        return Ok(());
    }

    Err(format!(
        "Provider request origin \"{request_origin}\" is not allowed."
    ))
}

fn response_headers(headers: &reqwest::header::HeaderMap) -> HashMap<String, String> {
    headers
        .iter()
        .filter_map(|(name, value)| {
            value
                .to_str()
                .ok()
                .map(|value| (name.to_string(), value.to_string()))
        })
        .collect()
}
