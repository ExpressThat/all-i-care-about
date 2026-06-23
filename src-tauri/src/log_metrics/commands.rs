use super::alert_storage;
use super::alerts::evaluate_all_metrics;
use super::dashboard_storage;
use super::evaluator::evaluate_metric_definition;
use super::metric_storage;
use super::models::{
    LogMetricAlertGroup, LogMetricDashboard, LogMetricEvaluation, SaveLogMetricAlertGroupRequest,
    SaveLogMetricDashboardRequest, SaveLogMetricRequest, SavedLogMetric,
};
use crate::repository_cache::db::db_pool;
use tauri::AppHandle;

#[tauri::command]
pub async fn list_saved_log_metrics(app: AppHandle) -> Result<Vec<SavedLogMetric>, String> {
    let pool = db_pool(&app).await?;
    metric_storage::list_metrics(&pool).await
}

#[tauri::command]
pub async fn save_log_metric(
    app: AppHandle,
    request: SaveLogMetricRequest,
) -> Result<SavedLogMetric, String> {
    let pool = db_pool(&app).await?;
    metric_storage::save_metric(&pool, request.id, &request.name, &request.definition).await
}

#[tauri::command]
pub async fn rename_saved_log_metric(
    app: AppHandle,
    id: String,
    name: String,
) -> Result<SavedLogMetric, String> {
    let pool = db_pool(&app).await?;
    metric_storage::rename_metric(&pool, &id, &name).await
}

#[tauri::command]
pub async fn delete_saved_log_metric(app: AppHandle, id: String) -> Result<(), String> {
    let pool = db_pool(&app).await?;
    metric_storage::delete_metric(&pool, &id).await
}

#[tauri::command]
pub async fn evaluate_log_metric(
    app: AppHandle,
    id: String,
) -> Result<LogMetricEvaluation, String> {
    let pool = db_pool(&app).await?;
    let metric = metric_storage::load_metric(&pool, &id).await?;
    let evaluation = evaluate_metric_definition(&app, &metric.definition).await;
    metric_storage::store_evaluation(&pool, &id, &evaluation).await?;
    Ok(evaluation)
}

#[tauri::command]
pub async fn evaluate_log_metric_preview(
    app: AppHandle,
    request: SaveLogMetricRequest,
) -> Result<LogMetricEvaluation, String> {
    Ok(evaluate_metric_definition(&app, &request.definition).await)
}

#[tauri::command]
pub async fn list_log_metric_dashboards(
    app: AppHandle,
) -> Result<Vec<LogMetricDashboard>, String> {
    let pool = db_pool(&app).await?;
    dashboard_storage::list_dashboards(&pool).await
}

#[tauri::command]
pub async fn save_log_metric_dashboard(
    app: AppHandle,
    request: SaveLogMetricDashboardRequest,
) -> Result<LogMetricDashboard, String> {
    let pool = db_pool(&app).await?;
    dashboard_storage::save_dashboard(&pool, request.id, &request.name, &request.definition).await
}

#[tauri::command]
pub async fn delete_log_metric_dashboard(app: AppHandle, id: String) -> Result<(), String> {
    let pool = db_pool(&app).await?;
    dashboard_storage::delete_dashboard(&pool, &id).await
}

#[tauri::command]
pub async fn list_log_metric_alert_groups(
    app: AppHandle,
) -> Result<Vec<LogMetricAlertGroup>, String> {
    let pool = db_pool(&app).await?;
    alert_storage::list_alert_groups(&pool).await
}

#[tauri::command]
pub async fn save_log_metric_alert_group(
    app: AppHandle,
    request: SaveLogMetricAlertGroupRequest,
) -> Result<LogMetricAlertGroup, String> {
    let pool = db_pool(&app).await?;
    alert_storage::save_alert_group(&pool, request.id, &request.name, &request.definition).await
}

#[tauri::command]
pub async fn delete_log_metric_alert_group(app: AppHandle, id: String) -> Result<(), String> {
    let pool = db_pool(&app).await?;
    alert_storage::delete_alert_group(&pool, &id).await
}

#[tauri::command]
pub async fn trigger_log_metric_evaluation(app: AppHandle) -> Result<(), String> {
    evaluate_all_metrics(&app).await
}
