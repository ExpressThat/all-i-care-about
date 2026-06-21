mod crypto;
pub mod metadata;
mod settings;

use crypto::decrypt_secret;
use metadata::ProviderType;
use serde_json::Value;
use settings::{
    get_setting_value, parse_setting_path, read_settings, remove_provider_settings,
    save_provider_settings, write_settings, SaveProviderRequest, Settings,
};
use tauri::AppHandle;

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

pub fn get_decrypted_provider_secret(
    app: &AppHandle,
    provider_id: &str,
    setting_key: &str,
) -> Result<String, String> {
    let settings = read_settings(app)?;
    let provider = settings
        .providers
        .iter()
        .find(|provider| provider.id == provider_id)
        .ok_or_else(|| "Provider is not configured.".to_string())?;
    let setting_path = parse_setting_path(setting_key)?;
    let encrypted_secret = get_setting_value(&provider.settings, &setting_path)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("Provider is missing secret setting \"{setting_key}\"."))?;

    decrypt_secret(app, encrypted_secret)
}

pub fn get_provider_type(app: &AppHandle, provider_id: &str) -> Result<ProviderType, String> {
    let settings = read_settings(app)?;
    let provider = settings
        .providers
        .iter()
        .find(|provider| provider.id == provider_id)
        .ok_or_else(|| "Provider is not configured.".to_string())?;

    Ok(provider.provider_type)
}
