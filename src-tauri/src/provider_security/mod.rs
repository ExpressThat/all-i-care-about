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
#[cfg(desktop)]
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
    log::debug!("get_settings request received");
    let mut settings = read_settings(&app)?;
    sync_auto_start_setting(&app, &mut settings);
    write_settings(&app, &settings)?;
    log::info!(
        "get_settings completed: providers={}, theme={}, auto_start={}",
        settings.providers.len(),
        settings.theme,
        settings.auto_start
    );
    Ok(settings)
}

#[tauri::command]
pub fn set_theme(app: AppHandle, theme: String) -> Result<Settings, String> {
    log::info!("set_theme request received: theme={theme}");
    if !matches!(theme.as_str(), "System" | "Light" | "Dark") {
        log::error!("set_theme rejected invalid theme: {theme}");
        return Err("Invalid theme.".to_string());
    }

    let mut settings = read_settings(&app)?;
    settings.theme = theme;
    write_settings(&app, &settings)?;
    log::info!("set_theme completed: theme={}", settings.theme);
    Ok(settings)
}

#[tauri::command]
pub fn set_auto_start(app: AppHandle, auto_start: bool) -> Result<Settings, String> {
    log::info!("set_auto_start request received: auto_start={auto_start}");

    #[cfg(desktop)]
    {
        let manager = app.autolaunch();
        if auto_start {
            manager
                .enable()
                .map_err(|error| format!("Failed to enable autostart: {error}"))?;
        } else {
            manager
                .disable()
                .map_err(|error| format!("Failed to disable autostart: {error}"))?;
        }
    }

    #[cfg(not(desktop))]
    {
        return Err("Autostart is only available in the desktop app.".to_string());
    }

    let mut settings = read_settings(&app)?;
    settings.auto_start = auto_start;
    write_settings(&app, &settings)?;
    log::info!(
        "set_auto_start completed: auto_start={}",
        settings.auto_start
    );
    Ok(settings)
}

#[tauri::command]
pub fn save_provider(app: AppHandle, request: SaveProviderRequest) -> Result<Settings, String> {
    log::info!(
        "save_provider request received: provider_id={}, provider_type={:?}, display_name={}, enabled_capabilities={}, allowed_origins={}, secret_paths={}",
        request.provider.id,
        request.provider.provider_type,
        request.provider.display_name,
        request.provider.enabled_capabilities.len(),
        request.allowed_origins.len(),
        request.secret_setting_paths.len()
    );
    let settings = save_provider_settings(&app, request)?;
    log::info!(
        "save_provider completed: providers={}",
        settings.providers.len()
    );
    Ok(settings)
}

#[tauri::command]
pub fn remove_provider(app: AppHandle, provider_id: String) -> Result<Settings, String> {
    log::info!("remove_provider request received: provider_id={provider_id}");
    let settings = remove_provider_settings(&app, &provider_id)?;
    log::info!(
        "remove_provider completed: provider_id={}, remaining_providers={}",
        provider_id,
        settings.providers.len()
    );
    Ok(settings)
}

pub fn get_decrypted_provider_secret(
    app: &AppHandle,
    provider_id: &str,
    setting_key: &str,
) -> Result<String, String> {
    log::debug!(
        "Loading decrypted provider secret: provider_id={}, setting_key={}",
        provider_id,
        setting_key
    );
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

    let secret = decrypt_secret(app, encrypted_secret)?;
    log::debug!(
        "Loaded decrypted provider secret: provider_id={}, setting_key={}",
        provider_id,
        setting_key
    );
    Ok(secret)
}

pub fn get_provider_setting_string(
    app: &AppHandle,
    provider_id: &str,
    setting_key: &str,
) -> Result<String, String> {
    log::debug!(
        "Loading provider setting string: provider_id={}, setting_key={}",
        provider_id,
        setting_key
    );
    let settings = read_settings(app)?;
    let provider = settings
        .providers
        .iter()
        .find(|provider| provider.id == provider_id)
        .ok_or_else(|| "Provider is not configured.".to_string())?;
    let setting_path = parse_setting_path(setting_key)?;

    get_setting_value(&provider.settings, &setting_path)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .ok_or_else(|| format!("Provider is missing setting \"{setting_key}\"."))
}

pub fn verify_provider_origin(
    app: &AppHandle,
    provider_id: &str,
    origin: &str,
) -> Result<(), String> {
    log::debug!("Verifying provider origin: provider_id={provider_id}, origin={origin}");
    let settings = read_settings(app)?;
    let provider = settings
        .providers
        .iter()
        .find(|provider| provider.id == provider_id)
        .ok_or_else(|| "Provider is not configured.".to_string())?;
    let security = settings::verify_provider_security(app, provider)?;
    let normalized_origin = metadata::origin_for_url(origin)?;

    if !security.allowed_origins.contains(&normalized_origin) {
        log::error!(
            "Provider origin rejected: provider_id={}, origin={}, normalized_origin={}",
            provider_id,
            origin,
            normalized_origin
        );
        return Err("Provider origin is not allowed by its security seal.".to_string());
    }

    log::debug!(
        "Provider origin verified: provider_id={}, normalized_origin={}",
        provider_id,
        normalized_origin
    );
    Ok(())
}

pub fn get_provider_type(app: &AppHandle, provider_id: &str) -> Result<ProviderType, String> {
    log::debug!("Resolving provider type: provider_id={provider_id}");
    let settings = read_settings(app)?;
    let provider = settings
        .providers
        .iter()
        .find(|provider| provider.id == provider_id)
        .ok_or_else(|| "Provider is not configured.".to_string())?;

    log::debug!(
        "Resolved provider type: provider_id={}, provider_type={:?}",
        provider_id,
        provider.provider_type
    );
    Ok(provider.provider_type)
}

fn sync_auto_start_setting(app: &AppHandle, settings: &mut Settings) {
    #[cfg(desktop)]
    match app.autolaunch().is_enabled() {
        Ok(auto_start) => {
            settings.auto_start = auto_start;
        }
        Err(error) => {
            log::error!("Failed to read autostart state: {error}");
        }
    }
}
