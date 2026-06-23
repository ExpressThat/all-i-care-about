use super::metric_storage::clean_name;
use super::models::{
    LogMetricAlertGroup, LogMetricAlertGroupDefinition, LogMetricAlertGroupState,
};
use crate::repository_cache::db::{now_seconds, random_id};
use sqlx::{Pool, Row, Sqlite};

pub async fn list_alert_groups(pool: &Pool<Sqlite>) -> Result<Vec<LogMetricAlertGroup>, String> {
    let rows = sqlx::query(
        r#"
        SELECT id, name, definition_json, latest_state_json, created_at, updated_at
        FROM log_metric_alert_groups
        ORDER BY updated_at DESC, name COLLATE NOCASE
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Failed to list metric alert groups: {error}"))?;

    rows.into_iter().map(row_to_alert_group).collect()
}

pub async fn save_alert_group(
    pool: &Pool<Sqlite>,
    id: Option<String>,
    name: &str,
    definition: &LogMetricAlertGroupDefinition,
) -> Result<LogMetricAlertGroup, String> {
    let id = id
        .filter(|id| !id.trim().is_empty())
        .unwrap_or_else(|| random_id("metric_alert_group"));
    let now = now_seconds();
    let definition_json = serde_json::to_string(definition)
        .map_err(|error| format!("Failed to serialize alert group: {error}"))?;

    sqlx::query(
        r#"
        INSERT INTO log_metric_alert_groups (id, name, definition_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            definition_json = excluded.definition_json,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(&id)
    .bind(clean_name(name)?)
    .bind(definition_json)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to save metric alert group: {error}"))?;

    load_alert_group(pool, &id).await
}

pub async fn delete_alert_group(pool: &Pool<Sqlite>, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM log_metric_alert_groups WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to delete metric alert group: {error}"))?;
    Ok(())
}

pub async fn store_alert_state(
    pool: &Pool<Sqlite>,
    id: &str,
    state: &LogMetricAlertGroupState,
) -> Result<(), String> {
    let value = serde_json::to_string(state)
        .map_err(|error| format!("Failed to serialize alert group state: {error}"))?;
    sqlx::query("UPDATE log_metric_alert_groups SET latest_state_json = ? WHERE id = ?")
        .bind(value)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to store alert group state: {error}"))?;
    Ok(())
}

async fn load_alert_group(pool: &Pool<Sqlite>, id: &str) -> Result<LogMetricAlertGroup, String> {
    let row = sqlx::query(
        r#"
        SELECT id, name, definition_json, latest_state_json, created_at, updated_at
        FROM log_metric_alert_groups
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|error| format!("Failed to load metric alert group: {error}"))?;
    row_to_alert_group(row)
}

fn row_to_alert_group(row: sqlx::sqlite::SqliteRow) -> Result<LogMetricAlertGroup, String> {
    let definition_json: String = row
        .try_get("definition_json")
        .map_err(|error| format!("Failed to read alert group definition: {error}"))?;
    let latest_json: Option<String> = row
        .try_get("latest_state_json")
        .map_err(|error| format!("Failed to read alert group state: {error}"))?;
    Ok(LogMetricAlertGroup {
        id: row
            .try_get("id")
            .map_err(|error| format!("Failed to read alert group id: {error}"))?,
        name: row
            .try_get("name")
            .map_err(|error| format!("Failed to read alert group name: {error}"))?,
        definition: serde_json::from_str(&definition_json)
            .map_err(|error| format!("Failed to parse alert group definition: {error}"))?,
        latest_state: latest_json
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .map_err(|error| format!("Failed to parse alert group state: {error}"))?,
        created_at: row
            .try_get("created_at")
            .map_err(|error| format!("Failed to read alert group created time: {error}"))?,
        updated_at: row
            .try_get("updated_at")
            .map_err(|error| format!("Failed to read alert group updated time: {error}"))?,
    })
}
