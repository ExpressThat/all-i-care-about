use super::alert_storage;
use super::evaluator::{evaluate_alert_group, evaluate_metric_definition};
use super::metric_storage;
use crate::repository_cache::db::{db_pool, now_seconds};
use std::collections::BTreeMap;
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;

pub async fn trigger_log_metric_evaluation(app: AppHandle) -> Result<(), String> {
    evaluate_all_metrics(&app).await
}

pub async fn evaluate_all_metrics(app: &AppHandle) -> Result<(), String> {
    let pool = db_pool(app).await?;
    let metrics = metric_storage::list_metrics(&pool).await?;
    let metric_count = metrics.len();
    let mut evaluations_by_metric_id = BTreeMap::new();

    for metric in metrics {
        let evaluation = evaluate_metric_definition(app, &metric.definition).await;
        metric_storage::store_evaluation(&pool, &metric.id, &evaluation).await?;
        evaluations_by_metric_id.insert(metric.id.clone(), evaluation);
    }

    let alert_groups = alert_storage::list_alert_groups(&pool).await?;
    let alert_group_count = alert_groups.len();
    let mut enabled_alert_group_count = 0;
    for group in alert_groups {
        if !group.definition.enabled {
            continue;
        }
        enabled_alert_group_count += 1;
        let previous_triggered = group
            .latest_state
            .as_ref()
            .map(|state| state.triggered)
            .unwrap_or(false);
        let state = evaluate_alert_group(
            &group.definition.rule,
            &evaluations_by_metric_id,
            now_seconds(),
        );
        alert_storage::store_alert_state(&pool, &group.id, &state).await?;
        if state.triggered && !previous_triggered {
            send_notification(app, &group.name, state.triggered_count);
        }
    }

    let _ = app.emit("log-metrics-updated", ());
    log::info!(
        "Log metric evaluation completed: metrics_evaluated={}, alert_groups={}, enabled_alert_groups={}",
        metric_count,
        alert_group_count,
        enabled_alert_group_count
    );
    Ok(())
}

fn send_notification(app: &AppHandle, group_name: &str, triggered_count: usize) {
    if let Err(error) = app
        .notification()
        .builder()
        .title("Log metric alert")
        .body(format!("{group_name}: {triggered_count} metric thresholds triggered"))
        .show()
    {
        log::error!("Failed to show log metric alert notification: {error}");
    }
}
