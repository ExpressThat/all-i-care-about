mod provider_security;
mod providers;
mod repository_cache;

use std::time::Duration;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_keyring::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:aica.db", migrations())
                .build(),
        )
        .setup(|app| {
            let app = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    let _ = repository_cache::trigger_provider_pr_poll(app.clone()).await;
                    tokio::time::sleep(Duration::from_secs(300)).await;
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            provider_security::get_settings,
            provider_security::set_theme,
            provider_security::save_provider,
            provider_security::remove_provider,
            repository_cache::watched::list_watched_repositories,
            repository_cache::watched::add_watched_repository,
            repository_cache::watched::remove_watched_repository,
            repository_cache::pulls::list_cached_pull_requests,
            repository_cache::accessible::list_accessible_repositories,
            repository_cache::accessible::refresh_accessible_repositories,
            repository_cache::watched::trigger_provider_pr_poll,
            repository_cache::request_log::get_provider_rate_limit_used
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_repository_cache",
            sql: r#"
            CREATE TABLE IF NOT EXISTS watched_repositories (
                id TEXT PRIMARY KEY NOT NULL,
                provider_id TEXT NOT NULL,
                owner TEXT NOT NULL,
                name TEXT NOT NULL,
                full_name TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                pulls_etag TEXT,
                last_checked_at INTEGER,
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
                UNIQUE(provider_id, owner, name)
            );

            CREATE INDEX IF NOT EXISTS idx_watched_repositories_provider_id
                ON watched_repositories(provider_id);
            CREATE INDEX IF NOT EXISTS idx_watched_repositories_active
                ON watched_repositories(is_active);

            CREATE TABLE IF NOT EXISTS pull_requests (
                id TEXT PRIMARY KEY NOT NULL,
                repository_id TEXT NOT NULL,
                number INTEGER NOT NULL,
                title TEXT NOT NULL,
                author_login TEXT NOT NULL,
                state TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                html_url TEXT NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                FOREIGN KEY(repository_id) REFERENCES watched_repositories(id) ON DELETE CASCADE,
                UNIQUE(repository_id, number)
            );

            CREATE INDEX IF NOT EXISTS idx_pull_requests_repository_id
                ON pull_requests(repository_id);
            CREATE INDEX IF NOT EXISTS idx_pull_requests_updated_at
                ON pull_requests(updated_at);

            CREATE TABLE IF NOT EXISTS accessible_repositories (
                provider_id TEXT NOT NULL,
                owner TEXT NOT NULL,
                name TEXT NOT NULL,
                full_name TEXT NOT NULL,
                is_private INTEGER NOT NULL,
                is_archived INTEGER NOT NULL,
                updated_at TEXT,
                last_seen_at INTEGER NOT NULL,
                PRIMARY KEY(provider_id, full_name)
            );

            CREATE INDEX IF NOT EXISTS idx_accessible_repositories_provider_id
                ON accessible_repositories(provider_id);
            CREATE INDEX IF NOT EXISTS idx_accessible_repositories_full_name
                ON accessible_repositories(full_name);

            CREATE TABLE IF NOT EXISTS provider_request_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider_id TEXT NOT NULL,
                provider_type TEXT NOT NULL,
                method TEXT NOT NULL,
                origin TEXT NOT NULL,
                path TEXT NOT NULL,
                status_code INTEGER,
                success INTEGER NOT NULL,
                rate_limit_used INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_provider_request_log_provider_time
                ON provider_request_log(provider_id, created_at);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_pull_request_author_avatar",
            sql: "ALTER TABLE pull_requests ADD COLUMN author_avatar_url TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "refresh_pull_requests_missing_author_avatars",
            sql: r#"
                UPDATE watched_repositories
                SET pulls_etag = NULL
                WHERE id IN (
                    SELECT DISTINCT repository_id
                    FROM pull_requests
                    WHERE author_avatar_url IS NULL
                );
            "#,
            kind: MigrationKind::Up,
        },
    ]
}
