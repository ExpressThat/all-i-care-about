use super::metric_storage::clean_name;
use super::models::{LogMetricDashboard, LogMetricDashboardDefinition};
use crate::repository_cache::db::{now_seconds, random_id};
use sqlx::{Pool, Row, Sqlite};

pub async fn list_dashboards(pool: &Pool<Sqlite>) -> Result<Vec<LogMetricDashboard>, String> {
    let rows = sqlx::query(
        r#"
        SELECT id, name, definition_json, created_at, updated_at
        FROM log_metric_dashboards
        ORDER BY updated_at DESC, name COLLATE NOCASE
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| format!("Failed to list metric dashboards: {error}"))?;

    rows.into_iter().map(row_to_dashboard).collect()
}

pub async fn save_dashboard(
    pool: &Pool<Sqlite>,
    id: Option<String>,
    name: &str,
    definition: &LogMetricDashboardDefinition,
) -> Result<LogMetricDashboard, String> {
    let id = id
        .filter(|id| !id.trim().is_empty())
        .unwrap_or_else(|| random_id("metric_dashboard"));
    let now = now_seconds();
    let definition_json = serde_json::to_string(definition)
        .map_err(|error| format!("Failed to serialize dashboard: {error}"))?;

    sqlx::query(
        r#"
        INSERT INTO log_metric_dashboards (id, name, definition_json, created_at, updated_at)
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
    .map_err(|error| format!("Failed to save metric dashboard: {error}"))?;

    load_dashboard(pool, &id).await
}

pub async fn delete_dashboard(pool: &Pool<Sqlite>, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM log_metric_dashboards WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to delete metric dashboard: {error}"))?;
    Ok(())
}

async fn load_dashboard(pool: &Pool<Sqlite>, id: &str) -> Result<LogMetricDashboard, String> {
    let row = sqlx::query(
        r#"
        SELECT id, name, definition_json, created_at, updated_at
        FROM log_metric_dashboards
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|error| format!("Failed to load metric dashboard: {error}"))?;
    row_to_dashboard(row)
}

fn row_to_dashboard(row: sqlx::sqlite::SqliteRow) -> Result<LogMetricDashboard, String> {
    let definition_json: String = row
        .try_get("definition_json")
        .map_err(|error| format!("Failed to read dashboard definition: {error}"))?;
    Ok(LogMetricDashboard {
        id: row
            .try_get("id")
            .map_err(|error| format!("Failed to read dashboard id: {error}"))?,
        name: row
            .try_get("name")
            .map_err(|error| format!("Failed to read dashboard name: {error}"))?,
        definition: serde_json::from_str(&definition_json)
            .map_err(|error| format!("Failed to parse dashboard definition: {error}"))?,
        created_at: row
            .try_get("created_at")
            .map_err(|error| format!("Failed to read dashboard created time: {error}"))?,
        updated_at: row
            .try_get("updated_at")
            .map_err(|error| format!("Failed to read dashboard updated time: {error}"))?,
    })
}
