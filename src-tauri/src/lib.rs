mod provider_security;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_keyring::init())
        .invoke_handler(tauri::generate_handler![
            provider_security::get_settings,
            provider_security::set_theme,
            provider_security::save_provider,
            provider_security::remove_provider,
            provider_security::provider_fetch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
