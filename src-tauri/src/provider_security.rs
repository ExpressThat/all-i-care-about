use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_keyring::KeyringExt;
use url::Url;

const KEYRING_SERVICE: &str = "encryption-key";
const ENCRYPTION_KEY_USER: &str = "expressthat.aica";
const AES_256_KEY_LENGTH_BYTES: usize = 32;
const AES_GCM_NONCE_LENGTH_BYTES: usize = 12;
const ENCRYPTED_SECRET_PREFIX: &str = "aica-secret:v1";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFetchRequest {
    pub provider_type: ProviderType,
    pub url: String,
    pub method: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub allowed_origins: Option<Vec<String>>,
    pub settings: Option<HashMap<String, Value>>,
    pub secret: Option<ProviderFetchSecret>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFetchSecret {
    pub encrypted_value: String,
    pub setting_key: String,
    pub header_name: String,
    pub value_template: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProviderType {
    Github,
    Jira,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFetchResponse {
    pub ok: bool,
    pub status: u16,
    pub status_text: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body_base64: String,
}

#[tauri::command]
pub fn encrypt_provider_secret(app: AppHandle, plaintext: String) -> Result<String, String> {
    encrypt_secret(&app, &plaintext)
}

#[tauri::command]
pub async fn provider_fetch(
    app: AppHandle,
    request: ProviderFetchRequest,
) -> Result<ProviderFetchResponse, String> {
    validate_allowed_origin(&request)?;

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
        if secret.setting_key.trim().is_empty() {
            return Err("Secret setting key is required.".to_string());
        }
        let decrypted_secret = decrypt_secret(&app, &secret.encrypted_value)?;
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

fn encrypt_secret(app: &AppHandle, plaintext: &str) -> Result<String, String> {
    let cipher = encryption_cipher(app)?;
    let mut nonce_bytes = [0_u8; AES_GCM_NONCE_LENGTH_BYTES];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let encrypted_value = cipher
        .encrypt(Nonce::from_slice(&nonce_bytes), plaintext.as_bytes())
        .map_err(|error| format!("Failed to encrypt secret: {error}"))?;

    Ok(format!(
        "{ENCRYPTED_SECRET_PREFIX}:{}:{}",
        STANDARD.encode(nonce_bytes),
        STANDARD.encode(encrypted_value)
    ))
}

fn decrypt_secret(app: &AppHandle, value: &str) -> Result<String, String> {
    if !is_encrypted_secret(value) {
        return Ok(value.to_string());
    }

    let mut parts = value.split(':');
    let prefix = parts.next();
    let version = parts.next();
    let nonce = parts.next();
    let encrypted_value = parts.next();

    if prefix != Some("aica-secret") || version != Some("v1") {
        return Err("Encrypted secret has an unsupported format.".to_string());
    }

    let nonce = nonce.ok_or_else(|| "Encrypted secret is missing a nonce.".to_string())?;
    let encrypted_value =
        encrypted_value.ok_or_else(|| "Encrypted secret is missing a value.".to_string())?;
    let nonce = STANDARD
        .decode(nonce)
        .map_err(|error| format!("Encrypted secret nonce is invalid: {error}"))?;
    let encrypted_value = STANDARD
        .decode(encrypted_value)
        .map_err(|error| format!("Encrypted secret value is invalid: {error}"))?;
    let cipher = encryption_cipher(app)?;
    let decrypted_value = cipher
        .decrypt(Nonce::from_slice(&nonce), encrypted_value.as_ref())
        .map_err(|error| format!("Failed to decrypt secret: {error}"))?;

    String::from_utf8(decrypted_value)
        .map_err(|error| format!("Decrypted secret is not valid UTF-8: {error}"))
}

fn is_encrypted_secret(value: &str) -> bool {
    value.starts_with(&format!("{ENCRYPTED_SECRET_PREFIX}:"))
}

fn encryption_cipher(app: &AppHandle) -> Result<Aes256Gcm, String> {
    let key = get_or_create_encryption_key(app)?;
    Ok(Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key)))
}

fn get_or_create_encryption_key(app: &AppHandle) -> Result<Vec<u8>, String> {
    let keyring = app.keyring();
    let existing_key = keyring
        .get_secret(KEYRING_SERVICE, ENCRYPTION_KEY_USER)
        .map_err(|error| format!("Failed to read encryption key: {error}"))?;

    if let Some(existing_key) = existing_key {
        if existing_key.len() == AES_256_KEY_LENGTH_BYTES {
            return Ok(existing_key);
        }
        return Err("Stored encryption key has an invalid length.".to_string());
    }

    let mut key = vec![0_u8; AES_256_KEY_LENGTH_BYTES];
    rand::thread_rng().fill_bytes(&mut key);
    keyring
        .set_secret(KEYRING_SERVICE, ENCRYPTION_KEY_USER, &key)
        .map_err(|error| format!("Failed to store encryption key: {error}"))?;

    Ok(key)
}

fn validate_allowed_origin(request: &ProviderFetchRequest) -> Result<(), String> {
    let request_origin = origin_for_url(&request.url)?;
    let allowed_origins = allowed_origins_for_request(request)?;

    if allowed_origins.iter().any(|origin| origin == &request_origin) {
        return Ok(());
    }

    Err(format!(
        "Provider request origin \"{request_origin}\" is not allowed."
    ))
}

fn allowed_origins_for_request(request: &ProviderFetchRequest) -> Result<Vec<String>, String> {
    if let Some(allowed_origins) = request.allowed_origins.as_ref() {
        return allowed_origins
            .iter()
            .map(|origin| origin_for_url(origin))
            .collect();
    }

    match request.provider_type {
        ProviderType::Github => Ok(vec!["https://api.github.com".to_string()]),
        ProviderType::Jira => {
            let Some(settings) = request.settings.as_ref() else {
                return Ok(Vec::new());
            };
            let Some(api_url) = settings.get("apiUrl").and_then(Value::as_str) else {
                return Ok(Vec::new());
            };
            Ok(vec![origin_for_url(api_url)?])
        }
    }
}

fn origin_for_url(value: &str) -> Result<String, String> {
    let url = Url::parse(value).map_err(|error| format!("Invalid URL: {error}"))?;
    let scheme = url.scheme();
    let host = url
        .host_str()
        .ok_or_else(|| "URL must include a host.".to_string())?;

    if scheme != "https" {
        return Err("Provider HTTP requests must use HTTPS.".to_string());
    }

    match url.port() {
        Some(port) => Ok(format!("{scheme}://{host}:{port}")),
        None => Ok(format!("{scheme}://{host}")),
    }
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
