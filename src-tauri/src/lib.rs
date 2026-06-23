mod issue_cache;
mod log_metrics;
mod log_searches;
mod provider_security;
mod providers;
mod repository_cache;

use std::time::Duration;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:aica.db", migrations())
                .build(),
        )
        .setup(|app| {
            log::info!("Application setup started");
            let app = app.handle().clone();
            let provider_poll_app = app.clone();
            let metrics_app = app.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    log::debug!("Background provider poll cycle started");
                    if let Err(error) =
                        repository_cache::trigger_provider_pr_poll(provider_poll_app.clone()).await
                    {
                        log::error!("Background PR poll failed: {error}");
                    }
                    if let Err(error) =
                        issue_cache::trigger_provider_issue_poll(provider_poll_app.clone()).await
                    {
                        log::error!("Background issue poll failed: {error}");
                    }
                    log::debug!("Background provider poll cycle completed");
                    tokio::time::sleep(Duration::from_secs(300)).await;
                }
            });
            tauri::async_runtime::spawn(async move {
                log::info!("Background log metric evaluation task started");
                loop {
                    log::info!("Background log metric evaluation cycle started");
                    if let Err(error) =
                        log_metrics::trigger_log_metric_evaluation(metrics_app.clone()).await
                    {
                        log::error!("Background log metric evaluation failed: {error}");
                    } else {
                        log::info!("Background log metric evaluation cycle completed");
                    }
                    tokio::time::sleep(Duration::from_secs(300)).await;
                }
            });
            log::info!("Application setup completed");
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
            repository_cache::request_log::get_provider_rate_limit_used,
            issue_cache::watched::list_watched_issue_sources,
            issue_cache::watched::add_watched_issue_source,
            issue_cache::watched::remove_watched_issue_source,
            issue_cache::accessible::list_accessible_issue_sources,
            issue_cache::accessible::refresh_accessible_issue_sources,
            issue_cache::statuses::list_cached_issue_statuses,
            issue_cache::statuses::set_visible_issue_statuses,
            issue_cache::issues::list_cached_issues,
            issue_cache::watched::trigger_provider_issue_poll,
            providers::opensearch::commands::metadata::list_opensearch_aliases,
            providers::opensearch::commands::metadata::list_opensearch_fields,
            providers::opensearch::commands::metadata::list_opensearch_field_values,
            providers::opensearch::commands::search::search_opensearch_logs,
            log_searches::saved_searches::list_saved_log_searches,
            log_searches::saved_searches::save_log_search,
            log_searches::saved_searches::rename_saved_log_search,
            log_searches::saved_searches::delete_saved_log_search,
            log_metrics::commands::list_saved_log_metrics,
            log_metrics::commands::save_log_metric,
            log_metrics::commands::rename_saved_log_metric,
            log_metrics::commands::delete_saved_log_metric,
            log_metrics::commands::evaluate_log_metric,
            log_metrics::commands::evaluate_log_metric_preview,
            log_metrics::commands::list_log_metric_dashboards,
            log_metrics::commands::save_log_metric_dashboard,
            log_metrics::commands::delete_log_metric_dashboard,
            log_metrics::commands::list_log_metric_alert_groups,
            log_metrics::commands::save_log_metric_alert_group,
            log_metrics::commands::delete_log_metric_alert_group,
            log_metrics::commands::trigger_log_metric_evaluation
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
        Migration {
            version: 4,
            description: "create_issue_cache",
            sql: r#"
            CREATE TABLE IF NOT EXISTS accessible_issue_sources (
                provider_id TEXT NOT NULL,
                source_id TEXT NOT NULL,
                source_key TEXT NOT NULL,
                name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                web_url TEXT,
                updated_at TEXT,
                last_seen_at INTEGER NOT NULL,
                PRIMARY KEY(provider_id, source_id)
            );

            CREATE INDEX IF NOT EXISTS idx_accessible_issue_sources_provider_id
                ON accessible_issue_sources(provider_id);
            CREATE INDEX IF NOT EXISTS idx_accessible_issue_sources_display_name
                ON accessible_issue_sources(display_name);

            CREATE TABLE IF NOT EXISTS watched_issue_sources (
                id TEXT PRIMARY KEY NOT NULL,
                provider_id TEXT NOT NULL,
                source_id TEXT NOT NULL,
                source_key TEXT NOT NULL,
                name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                web_url TEXT,
                issues_etag TEXT,
                last_checked_at INTEGER,
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
                UNIQUE(provider_id, source_id)
            );

            CREATE INDEX IF NOT EXISTS idx_watched_issue_sources_provider_id
                ON watched_issue_sources(provider_id);
            CREATE INDEX IF NOT EXISTS idx_watched_issue_sources_display_name
                ON watched_issue_sources(display_name);

            CREATE TABLE IF NOT EXISTS issue_statuses (
                id TEXT PRIMARY KEY NOT NULL,
                source_watch_id TEXT NOT NULL,
                status_id TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                position INTEGER NOT NULL,
                FOREIGN KEY(source_watch_id) REFERENCES watched_issue_sources(id) ON DELETE CASCADE,
                UNIQUE(source_watch_id, status_id)
            );

            CREATE INDEX IF NOT EXISTS idx_issue_statuses_source_watch_id
                ON issue_statuses(source_watch_id);

            CREATE TABLE IF NOT EXISTS issues (
                id TEXT PRIMARY KEY NOT NULL,
                source_watch_id TEXT NOT NULL,
                key TEXT NOT NULL,
                title TEXT NOT NULL,
                status_id TEXT NOT NULL,
                status_name TEXT NOT NULL,
                author_name TEXT,
                author_avatar_url TEXT,
                assignee_name TEXT,
                assignee_avatar_url TEXT,
                updated_at TEXT NOT NULL,
                html_url TEXT NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                FOREIGN KEY(source_watch_id) REFERENCES watched_issue_sources(id) ON DELETE CASCADE,
                UNIQUE(source_watch_id, key)
            );

            CREATE INDEX IF NOT EXISTS idx_issues_source_watch_id
                ON issues(source_watch_id);
            CREATE INDEX IF NOT EXISTS idx_issues_source_status
                ON issues(source_watch_id, status_id);
            CREATE INDEX IF NOT EXISTS idx_issues_updated_at
                ON issues(updated_at);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_issue_column_visibility",
            sql: r#"
            CREATE TABLE IF NOT EXISTS hidden_issue_statuses (
                source_watch_id TEXT NOT NULL,
                status_id TEXT NOT NULL,
                PRIMARY KEY(source_watch_id, status_id),
                FOREIGN KEY(source_watch_id) REFERENCES watched_issue_sources(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_hidden_issue_statuses_source_watch_id
                ON hidden_issue_statuses(source_watch_id);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_saved_log_searches",
            sql: r#"
            CREATE TABLE IF NOT EXISTS saved_log_searches (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                provider_id TEXT NOT NULL,
                provider_type TEXT NOT NULL,
                data_source TEXT NOT NULL,
                time_range_json TEXT NOT NULL,
                filters_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_saved_log_searches_provider_id
                ON saved_log_searches(provider_id);
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_log_metrics",
            sql: r#"
            CREATE TABLE IF NOT EXISTS saved_log_metrics (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                definition_json TEXT NOT NULL,
                latest_evaluation_json TEXT,
                last_evaluated_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS log_metric_dashboards (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                definition_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS log_metric_alert_groups (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                definition_json TEXT NOT NULL,
                latest_state_json TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_saved_log_metrics_updated_at
                ON saved_log_metrics(updated_at);
            CREATE INDEX IF NOT EXISTS idx_log_metric_dashboards_updated_at
                ON log_metric_dashboards(updated_at);
            CREATE INDEX IF NOT EXISTS idx_log_metric_alert_groups_updated_at
                ON log_metric_alert_groups(updated_at);
        "#,
            kind: MigrationKind::Up,
        },
    ]
}
