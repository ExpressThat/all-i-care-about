use super::models::{LogMetricDefinition, LogMetricEvaluation, SavedLogMetric};
use crate::repository_cache::db::{now_seconds, random_id};
use sqlx::{Pool, Row, Sqlite};

pub async fn list_metrics(pool: &Pool<Sqlite>) -> Result<Vec<SavedLogMetric>, String> {
    let rows = sqlx::query(
        r#"
        SELECT id, name, definition_json, latest_evaluation_json, created_at, updated_at
        FROM saved_log_metrics
        ORDER BY updated_at DESC, name COLLATE NOCASE
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Failed to list saved log metrics: {error}"))?;

    rows.into_iter().map(row_to_metric).collect()
}

pub async fn load_metric(pool: &Pool<Sqlite>, id: &str) -> Result<SavedLogMetric, String> {
    let row = sqlx::query(
        r#"
        SELECT id, name, definition_json, latest_evaluation_json, created_at, updated_at
        FROM saved_log_metrics
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|error| format!("Failed to load saved log metric: {error}"))?;

    row_to_metric(row)
}

pub async fn save_metric(
    pool: &Pool<Sqlite>,
    id: Option<String>,
    name: &str,
    definition: &LogMetricDefinition,
) -> Result<SavedLogMetric, String> {
    let id = id
        .filter(|id| !id.trim().is_empty())
        .unwrap_or_else(|| random_id("log_metric"));
    let now = now_seconds();
    let definition_json = serde_json::to_string(definition)
        .map_err(|error| format!("Failed to serialize metric definition: {error}"))?;

    sqlx::query(
        r#"
        INSERT INTO saved_log_metrics (id, name, definition_json, created_at, updated_at)
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
    .map_err(|error| format!("Failed to save log metric: {error}"))?;

    load_metric(pool, &id).await
}

pub async fn rename_metric(
    pool: &Pool<Sqlite>,
    id: &str,
    name: &str,
) -> Result<SavedLogMetric, String> {
    let result = sqlx::query("UPDATE saved_log_metrics SET name = ?, updated_at = ? WHERE id = ?")
        .bind(clean_name(name)?)
        .bind(now_seconds())
        .bind(id)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to rename log metric: {error}"))?;
    if result.rows_affected() == 0 {
        return Err("Saved log metric was not found.".to_string());
    }
    load_metric(pool, id).await
}

pub async fn delete_metric(pool: &Pool<Sqlite>, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM saved_log_metrics WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to delete log metric: {error}"))?;
    Ok(())
}

pub async fn store_evaluation(
    pool: &Pool<Sqlite>,
    id: &str,
    evaluation: &LogMetricEvaluation,
) -> Result<(), String> {
    let value = serde_json::to_string(evaluation)
        .map_err(|error| format!("Failed to serialize metric evaluation: {error}"))?;
    sqlx::query(
        r#"
        UPDATE saved_log_metrics
        SET latest_evaluation_json = ?, last_evaluated_at = ?, updated_at = updated_at
        WHERE id = ?
        "#,
    )
    .bind(value)
    .bind(evaluation.evaluated_at)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to store metric evaluation: {error}"))?;
    Ok(())
}

fn row_to_metric(row: sqlx::sqlite::SqliteRow) -> Result<SavedLogMetric, String> {
    let definition_json: String = row
        .try_get("definition_json")
        .map_err(|error| format!("Failed to read metric definition: {error}"))?;
    let latest_json: Option<String> = row
        .try_get("latest_evaluation_json")
        .map_err(|error| format!("Failed to read metric evaluation: {error}"))?;
    Ok(SavedLogMetric {
        id: row
            .try_get("id")
            .map_err(|error| format!("Failed to read metric id: {error}"))?,
        name: row
            .try_get("name")
            .map_err(|error| format!("Failed to read metric name: {error}"))?,
        definition: serde_json::from_str(&definition_json)
            .map_err(|error| format!("Failed to parse metric definition: {error}"))?,
        latest_evaluation: latest_json
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .map_err(|error| format!("Failed to parse metric evaluation: {error}"))?,
        created_at: row
            .try_get("created_at")
            .map_err(|error| format!("Failed to read metric created time: {error}"))?,
        updated_at: row
            .try_get("updated_at")
            .map_err(|error| format!("Failed to read metric updated time: {error}"))?,
    })
}

pub fn clean_name(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("Name is required.".to_string());
    }
    if value.len() > 120 {
        return Err("Name must be 120 characters or fewer.".to_string());
    }
    Ok(value.to_string())
}
