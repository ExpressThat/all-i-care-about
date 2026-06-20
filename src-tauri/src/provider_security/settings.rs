use super::crypto::{encrypt_secret, is_encrypted_secret};
use super::metadata::{
    allowed_origins_for_provider, metadata_for_provider, ProviderFieldKind,
    ProviderFieldMetadata, ProviderType,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const SETTINGS_FILE_NAME: &str = "settings.json";

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
    mut provider: ProviderInstance,
) -> Result<Settings, String> {
    let metadata = metadata_for_provider(provider.provider_type);
    let mut settings = read_settings(app)?;
    let existing_provider = settings
        .providers
        .iter()
        .find(|current_provider| current_provider.id == provider.id);
    let preserve_existing_secrets = match existing_provider {
        Some(existing_provider) => {
            let previous_origins =
                allowed_origins_for_provider(metadata, &existing_provider.settings)?;
            let next_origins = allowed_origins_for_provider(metadata, &provider.settings)?;
            previous_origins == next_origins
        }
        None => false,
    };

    provider.settings = secure_provider_settings(
        app,
        metadata.fields,
        existing_provider.map(|existing_provider| &existing_provider.settings),
        &provider.settings,
        preserve_existing_secrets,
    )?;

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
    fields: &[ProviderFieldMetadata],
    existing_settings: Option<&Map<String, Value>>,
    submitted_settings: &Map<String, Value>,
    preserve_existing_secrets: bool,
) -> Result<Map<String, Value>, String> {
    let mut next_settings = Map::new();

    for field in fields {
        match field.kind {
            ProviderFieldKind::Group => {
                let submitted_group = submitted_settings
                    .get(field.key)
                    .and_then(Value::as_object);
                let existing_group = existing_settings
                    .and_then(|settings| settings.get(field.key))
                    .and_then(Value::as_object);
                let secured_group = secure_provider_settings(
                    app,
                    field.fields,
                    existing_group,
                    submitted_group.unwrap_or(&Map::new()),
                    preserve_existing_secrets,
                )?;

                if !secured_group.is_empty() {
                    next_settings.insert(field.key.to_string(), Value::Object(secured_group));
                }
            }
            ProviderFieldKind::Secret => {
                save_secret_setting(
                    app,
                    field,
                    existing_settings,
                    submitted_settings,
                    preserve_existing_secrets,
                    &mut next_settings,
                )?;
            }
            ProviderFieldKind::Url => {
                if let Some(value) = submitted_settings.get(field.key) {
                    if !is_empty_setting_value(value) {
                        next_settings.insert(field.key.to_string(), value.clone());
                    }
                }
            }
        }
    }

    Ok(next_settings)
}

fn save_secret_setting(
    app: &AppHandle,
    field: &ProviderFieldMetadata,
    existing_settings: Option<&Map<String, Value>>,
    submitted_settings: &Map<String, Value>,
    preserve_existing_secrets: bool,
    next_settings: &mut Map<String, Value>,
) -> Result<(), String> {
    let submitted_secret = submitted_settings
        .get(field.key)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty());

    if let Some(submitted_secret) = submitted_secret {
        if is_encrypted_secret(submitted_secret) {
            return Err(format!(
                "Secret setting \"{}\" must be submitted as plaintext.",
                field.key
            ));
        }
        next_settings.insert(
            field.key.to_string(),
            Value::String(encrypt_secret(app, submitted_secret)?),
        );
        return Ok(());
    }

    let existing_secret = existing_settings
        .and_then(|settings| settings.get(field.key))
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty());

    if preserve_existing_secrets {
        if let Some(existing_secret) = existing_secret {
            let secret = if is_encrypted_secret(existing_secret) {
                existing_secret.to_string()
            } else {
                encrypt_secret(app, existing_secret)?
            };
            next_settings.insert(field.key.to_string(), Value::String(secret));
        }
    }

    Ok(())
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
