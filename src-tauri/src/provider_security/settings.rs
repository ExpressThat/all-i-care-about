use super::crypto::{
    encrypt_secret, is_encrypted_secret, seal_provider_security, unseal_provider_security,
};
use super::metadata::{normalize_origins, ProviderType};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const SETTINGS_FILE_NAME: &str = "settings.json";
const PROVIDER_SECURITY_VERSION: u8 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(rename = "Providers")]
    pub providers: Vec<ProviderInstance>,
    #[serde(rename = "Theme")]
    pub theme: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInstance {
    pub id: String,
    #[serde(rename = "type")]
    pub provider_type: ProviderType,
    pub display_name: String,
    pub settings: Map<String, Value>,
    pub enabled_capabilities: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub security: Option<ProviderSecurity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSecurity {
    pub allowed_origins: Vec<String>,
    pub sealed: String,
    pub version: u8,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProviderRequest {
    pub provider: ProviderInstance,
    pub allowed_origins: Vec<String>,
    pub secret_setting_paths: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SealedProviderSecurity {
    pub provider_id: String,
    pub provider_type: ProviderType,
    pub allowed_origins: Vec<String>,
    pub secret_setting_paths: Vec<String>,
    pub version: u8,
}

pub fn default_settings() -> Settings {
    Settings {
        providers: Vec::new(),
        theme: "System".to_string(),
    }
}

pub fn read_settings(app: &AppHandle) -> Result<Settings, String> {
    let settings_path = settings_path(app)?;
    if !settings_path.exists() {
        return Ok(default_settings());
    }

    let contents = fs::read_to_string(&settings_path)
        .map_err(|error| format!("Failed to read settings: {error}"))?;
    let mut settings: Settings = serde_json::from_str(&contents)
        .map_err(|error| format!("Failed to parse settings: {error}"))?;

    if !matches!(settings.theme.as_str(), "System" | "Light" | "Dark") {
        settings.theme = "System".to_string();
    }

    Ok(settings)
}

pub fn write_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let settings_path = settings_path(app)?;
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create settings directory: {error}"))?;
    }

    let contents = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Failed to serialize settings: {error}"))?;
    fs::write(&settings_path, contents)
        .map_err(|error| format!("Failed to write settings: {error}"))
}

pub fn save_provider_settings(
    app: &AppHandle,
    request: SaveProviderRequest,
) -> Result<Settings, String> {
    let mut provider = request.provider;
    let mut settings = read_settings(app)?;
    let allowed_origins = normalize_origins(&request.allowed_origins)?;
    let secret_setting_paths = normalize_secret_setting_paths(&request.secret_setting_paths)?;
    let existing_provider = settings
        .providers
        .iter()
        .find(|current_provider| current_provider.id == provider.id);
    let previous_security = existing_provider
        .map(|existing_provider| verify_provider_security(app, existing_provider))
        .transpose()?;
    let preserve_existing_secrets = previous_security
        .as_ref()
        .is_some_and(|previous_security| previous_security.allowed_origins == allowed_origins);

    provider.settings = secure_provider_settings(
        app,
        &secret_setting_paths,
        previous_security
            .as_ref()
            .map(|security| security.secret_setting_paths.as_slice())
            .unwrap_or(&[]),
        existing_provider.map(|existing_provider| &existing_provider.settings),
        &provider.settings,
        preserve_existing_secrets,
    )?;
    provider.security = Some(create_provider_security(
        app,
        &provider,
        allowed_origins,
        secret_setting_paths,
    )?);

    if let Some(existing_index) = settings
        .providers
        .iter()
        .position(|current_provider| current_provider.id == provider.id)
    {
        settings.providers[existing_index] = provider;
    } else {
        settings.providers.push(provider);
    }

    write_settings(app, &settings)?;
    Ok(settings)
}

pub fn remove_provider_settings(app: &AppHandle, provider_id: &str) -> Result<Settings, String> {
    let mut settings = read_settings(app)?;
    settings
        .providers
        .retain(|provider| provider.id != provider_id);
    write_settings(app, &settings)?;
    Ok(settings)
}

fn secure_provider_settings(
    app: &AppHandle,
    new_secret_setting_paths: &[String],
    previous_secret_setting_paths: &[String],
    existing_settings: Option<&Map<String, Value>>,
    submitted_settings: &Map<String, Value>,
    preserve_existing_secrets: bool,
) -> Result<Map<String, Value>, String> {
    let mut next_settings = copy_non_empty_settings(submitted_settings);
    let new_secret_paths: BTreeSet<String> = new_secret_setting_paths.iter().cloned().collect();
    let previous_secret_paths: BTreeSet<String> =
        previous_secret_setting_paths.iter().cloned().collect();
    let all_secret_paths: BTreeSet<String> = new_secret_paths
        .union(&previous_secret_paths)
        .cloned()
        .collect();

    for secret_path in all_secret_paths {
        let path = parse_setting_path(&secret_path)?;
        let submitted_secret = get_setting_value(submitted_settings, &path)
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty());

        if let Some(submitted_secret) =
            submitted_secret.filter(|_| new_secret_paths.contains(&secret_path))
        {
            if is_encrypted_secret(submitted_secret) {
                return Err(format!(
                    "Secret setting \"{}\" must be submitted as plaintext.",
                    secret_path
                ));
            }
            set_setting_value(
                &mut next_settings,
                &path,
                Value::String(encrypt_secret(app, submitted_secret)?),
            )?;
            continue;
        }

        let existing_secret = existing_settings
            .and_then(|settings| get_setting_value(settings, &path))
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty());

        remove_setting_value(&mut next_settings, &path)?;

        if preserve_existing_secrets
            && previous_secret_paths.contains(&secret_path)
            && new_secret_paths.contains(&secret_path)
        {
            let Some(existing_secret) = existing_secret else {
                continue;
            };
            let secret = if is_encrypted_secret(existing_secret) {
                existing_secret.to_string()
            } else {
                encrypt_secret(app, existing_secret)?
            };
            set_setting_value(&mut next_settings, &path, Value::String(secret))?;
        }
    }

    Ok(next_settings)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?
        .join(SETTINGS_FILE_NAME))
}

fn is_empty_setting_value(value: &Value) -> bool {
    matches!(value, Value::Null) || matches!(value, Value::String(value) if value.is_empty())
}

pub fn verify_provider_security(
    app: &AppHandle,
    provider: &ProviderInstance,
) -> Result<SealedProviderSecurity, String> {
    let security = provider
        .security
        .as_ref()
        .ok_or_else(|| "Provider security seal is missing.".to_string())?;
    if security.version != PROVIDER_SECURITY_VERSION {
        return Err("Provider security version is unsupported.".to_string());
    }

    let unsealed = unseal_provider_security(app, &security.sealed)?;
    let sealed_security: SealedProviderSecurity = serde_json::from_slice(&unsealed)
        .map_err(|error| format!("Provider security seal is invalid: {error}"))?;

    if sealed_security.provider_id != provider.id
        || sealed_security.provider_type != provider.provider_type
        || sealed_security.version != PROVIDER_SECURITY_VERSION
    {
        return Err("Provider security seal does not match this provider.".to_string());
    }

    let visible_origins = normalize_origins(&security.allowed_origins)?;
    if visible_origins != sealed_security.allowed_origins {
        return Err("Provider allowed origins were modified outside the seal.".to_string());
    }

    Ok(sealed_security)
}

fn create_provider_security(
    app: &AppHandle,
    provider: &ProviderInstance,
    allowed_origins: Vec<String>,
    secret_setting_paths: Vec<String>,
) -> Result<ProviderSecurity, String> {
    let sealed_security = SealedProviderSecurity {
        provider_id: provider.id.clone(),
        provider_type: provider.provider_type,
        allowed_origins: allowed_origins.clone(),
        secret_setting_paths,
        version: PROVIDER_SECURITY_VERSION,
    };
    let payload = serde_json::to_vec(&sealed_security)
        .map_err(|error| format!("Failed to serialize provider security: {error}"))?;

    Ok(ProviderSecurity {
        allowed_origins,
        sealed: seal_provider_security(app, &payload)?,
        version: PROVIDER_SECURITY_VERSION,
    })
}

fn normalize_secret_setting_paths(paths: &[String]) -> Result<Vec<String>, String> {
    let mut normalized = BTreeSet::new();

    for path in paths {
        let parsed = parse_setting_path(path)?;
        normalized.insert(parsed.join("."));
    }

    Ok(normalized.into_iter().collect())
}

pub fn parse_setting_path(value: &str) -> Result<Vec<&str>, String> {
    let path: Vec<&str> = value.split('.').filter(|part| !part.is_empty()).collect();
    if path.is_empty() {
        return Err("Secret setting key is required.".to_string());
    }
    Ok(path)
}

pub fn get_setting_value<'a>(settings: &'a Map<String, Value>, path: &[&str]) -> Option<&'a Value> {
    let (head, tail) = path.split_first()?;
    let value = settings.get(*head)?;

    if tail.is_empty() {
        return Some(value);
    }

    get_setting_value(value.as_object()?, tail)
}

fn set_setting_value(
    settings: &mut Map<String, Value>,
    path: &[&str],
    value: Value,
) -> Result<(), String> {
    let Some((head, tail)) = path.split_first() else {
        return Err("Setting path is required.".to_string());
    };

    if tail.is_empty() {
        settings.insert((*head).to_string(), value);
        return Ok(());
    }

    let entry = settings
        .entry((*head).to_string())
        .or_insert_with(|| Value::Object(Map::new()));
    if !entry.is_object() {
        *entry = Value::Object(Map::new());
    }

    let group = entry
        .as_object_mut()
        .ok_or_else(|| "Setting group path is invalid.".to_string())?;
    set_setting_value(group, tail, value)
}

fn remove_setting_value(settings: &mut Map<String, Value>, path: &[&str]) -> Result<(), String> {
    let Some((head, tail)) = path.split_first() else {
        return Err("Setting path is required.".to_string());
    };

    if tail.is_empty() {
        settings.remove(*head);
        return Ok(());
    }

    if let Some(group) = settings.get_mut(*head).and_then(Value::as_object_mut) {
        remove_setting_value(group, tail)?;
        if group.is_empty() {
            settings.remove(*head);
        }
    }

    Ok(())
}

fn copy_non_empty_settings(settings: &Map<String, Value>) -> Map<String, Value> {
    let mut next_settings = Map::new();

    for (key, value) in settings {
        if is_empty_setting_value(value) {
            continue;
        }

        if let Value::Object(group) = value {
            let group = copy_non_empty_settings(group);
            if !group.is_empty() {
                next_settings.insert(key.clone(), Value::Object(group));
            }
            continue;
        }

        next_settings.insert(key.clone(), value.clone());
    }

    next_settings
}
