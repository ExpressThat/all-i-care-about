use super::formula::evaluate_formula;
use super::models::{
    AlertGroupRule, ExecutedMetricQuery, LogMetricAlertGroupState, LogMetricDefinition,
    LogMetricEvaluation, LogMetricGroupValue, MetricFormulaConfig, MetricFormulaOperation,
    MetricStatus, MetricThreshold, MetricTimeRange, ResolvedMetricTimeRange, ThresholdComparison,
};
use crate::provider_security::metadata::ProviderType;
use crate::providers::opensearch::metrics::execute_metric_query;
use crate::repository_cache::db::now_seconds;
use std::collections::BTreeMap;
use tauri::AppHandle;

pub async fn evaluate_metric_definition(
    app: &AppHandle,
    definition: &LogMetricDefinition,
) -> LogMetricEvaluation {
    match evaluate_inner(app, definition).await {
        Ok(mut evaluation) => {
            apply_threshold(&mut evaluation, definition.threshold.as_ref());
            evaluation
        }
        Err(error) => LogMetricEvaluation {
            value: None,
            groups: Vec::new(),
            query_values: BTreeMap::new(),
            status: MetricStatus::Error,
            triggered: false,
            error: Some(error),
            evaluated_at: now_seconds(),
        },
    }
}

pub fn evaluate_alert_group(
    rule: &AlertGroupRule,
    metric_states: &BTreeMap<String, LogMetricEvaluation>,
    evaluated_at: i64,
) -> LogMetricAlertGroupState {
    let result = evaluate_alert_rule(rule, metric_states);
    LogMetricAlertGroupState {
        triggered: result.triggered,
        triggered_count: result.triggered_count,
        evaluated_at,
    }
}

struct AlertRuleResult {
    triggered: bool,
    triggered_count: usize,
}

fn evaluate_alert_rule(
    rule: &AlertGroupRule,
    metric_states: &BTreeMap<String, LogMetricEvaluation>,
) -> AlertRuleResult {
    match rule {
        AlertGroupRule::Metric {
            metric_id,
            threshold,
        } => {
            let triggered = metric_states
                .get(metric_id)
                .map(|evaluation| evaluation_matches_threshold(evaluation, threshold.as_ref()))
                .unwrap_or(false);
            AlertRuleResult {
                triggered,
                triggered_count: usize::from(triggered),
            }
        }
        AlertGroupRule::Any { children } => {
            let results = evaluate_child_alert_rules(children, metric_states);
            AlertRuleResult {
                triggered: results.iter().any(|result| result.triggered),
                triggered_count: results.iter().map(|result| result.triggered_count).sum(),
            }
        }
        AlertGroupRule::All { children } => {
            let results = evaluate_child_alert_rules(children, metric_states);
            AlertRuleResult {
                triggered: !results.is_empty() && results.iter().all(|result| result.triggered),
                triggered_count: results.iter().map(|result| result.triggered_count).sum(),
            }
        }
        AlertGroupRule::AtLeast { count, children } => {
            let results = evaluate_child_alert_rules(children, metric_states);
            let matching_children = results.iter().filter(|result| result.triggered).count();
            AlertRuleResult {
                triggered: matching_children >= *count,
                triggered_count: results.iter().map(|result| result.triggered_count).sum(),
            }
        }
        AlertGroupRule::None { children } => {
            let results = evaluate_child_alert_rules(children, metric_states);
            AlertRuleResult {
                triggered: !results.iter().any(|result| result.triggered),
                triggered_count: results.iter().map(|result| result.triggered_count).sum(),
            }
        }
    }
}

fn evaluate_child_alert_rules(
    children: &[AlertGroupRule],
    metric_states: &BTreeMap<String, LogMetricEvaluation>,
) -> Vec<AlertRuleResult> {
    children
        .iter()
        .map(|child| evaluate_alert_rule(child, metric_states))
        .collect()
}

async fn evaluate_inner(
    app: &AppHandle,
    definition: &LogMetricDefinition,
) -> Result<LogMetricEvaluation, String> {
    if definition.queries.is_empty() {
        return Err("Metric requires at least one query.".to_string());
    }

    let range = resolve_time_range(&definition.time_range)?;
    let mut results = Vec::new();
    for query in &definition.queries {
        results.push(match definition.provider_type {
            ProviderType::OpenSearch => {
                execute_metric_query(app, &definition.provider_id, query, &definition.group_by, &range)
                    .await?
            }
            _ => {
                return Err(format!(
                    "Provider type {:?} does not support log metrics yet.",
                    definition.provider_type
                ))
            }
        });
    }

    let query_values = scalar_values(&results);
    let value = if definition.group_by.is_empty() {
        Some(evaluate_metric_formula(definition, &query_values)?)
    } else {
        None
    };
    let groups = if definition.group_by.is_empty() {
        Vec::new()
    } else {
        grouped_values(results.as_slice(), definition)
    };

    Ok(LogMetricEvaluation {
        value,
        groups,
        query_values,
        status: MetricStatus::Ok,
        triggered: false,
        error: None,
        evaluated_at: now_seconds(),
    })
}

fn scalar_values(results: &[ExecutedMetricQuery]) -> BTreeMap<String, f64> {
    results
        .iter()
        .map(|result| (result.query_id.clone(), result.total))
        .collect()
}

fn grouped_values(results: &[ExecutedMetricQuery], definition: &LogMetricDefinition) -> Vec<LogMetricGroupValue> {
    let mut groups: BTreeMap<BTreeMap<String, String>, BTreeMap<String, f64>> = BTreeMap::new();
    for result in results {
        for group in &result.groups {
            groups
                .entry(group.key.clone())
                .or_default()
                .insert(result.query_id.clone(), group.value);
        }
    }

    groups
        .into_iter()
        .filter_map(|(key, values)| {
            Some(LogMetricGroupValue {
                key,
                value: evaluate_metric_formula(definition, &values).ok()?,
                triggered: false,
            })
        })
        .collect()
}

fn apply_threshold(evaluation: &mut LogMetricEvaluation, threshold: Option<&MetricThreshold>) {
    let Some(threshold) = threshold.filter(|threshold| threshold.enabled) else {
        evaluation.status = MetricStatus::Ok;
        evaluation.triggered = false;
        return;
    };
    let triggered = evaluation
        .value
        .map(|value| compare(value, threshold))
        .unwrap_or_else(|| {
            evaluation.groups.iter_mut().any(|group| {
                group.triggered = compare(group.value, threshold);
                group.triggered
            })
        });
    evaluation.triggered = triggered;
    evaluation.status = if triggered {
        MetricStatus::Triggered
    } else {
        MetricStatus::Ok
    };
}

fn evaluation_matches_threshold(
    evaluation: &LogMetricEvaluation,
    threshold: Option<&MetricThreshold>,
) -> bool {
    let Some(threshold) = threshold.filter(|threshold| threshold.enabled) else {
        return evaluation.triggered;
    };
    evaluation
        .value
        .map(|value| compare(value, threshold))
        .unwrap_or_else(|| evaluation.groups.iter().any(|group| compare(group.value, threshold)))
}

fn compare(value: f64, threshold: &MetricThreshold) -> bool {
    match threshold.comparison {
        ThresholdComparison::Gt => value > threshold.value,
        ThresholdComparison::Gte => value >= threshold.value,
        ThresholdComparison::Lt => value < threshold.value,
        ThresholdComparison::Lte => value <= threshold.value,
        ThresholdComparison::Eq => (value - threshold.value).abs() < f64::EPSILON,
        ThresholdComparison::Neq => (value - threshold.value).abs() >= f64::EPSILON,
    }
}

fn evaluate_metric_formula(
    definition: &LogMetricDefinition,
    values: &BTreeMap<String, f64>,
) -> Result<f64, String> {
    match &definition.formula_config {
        MetricFormulaConfig::Single { query_id } => Ok(*values.get(query_id).unwrap_or(&0.0)),
        MetricFormulaConfig::Advanced { expression } => evaluate_formula(expression, values),
        MetricFormulaConfig::Operation {
            operation,
            operands,
        } => evaluate_formula_operation(operation, operands, values),
    }
}

fn evaluate_formula_operation(
    operation: &MetricFormulaOperation,
    operands: &[String],
    values: &BTreeMap<String, f64>,
) -> Result<f64, String> {
    validate_formula_operands(operation, operands)?;
    let resolved = operands
        .iter()
        .map(|operand| *values.get(operand).unwrap_or(&0.0))
        .collect::<Vec<_>>();
    match operation {
        MetricFormulaOperation::Sum => Ok(resolved.iter().sum()),
        MetricFormulaOperation::Difference => Ok(resolved.first().copied().unwrap_or(0.0) - resolved.get(1).copied().unwrap_or(0.0)),
        MetricFormulaOperation::Ratio => divide(
            resolved.first().copied().unwrap_or(0.0),
            resolved.get(1).copied().unwrap_or(0.0),
            "ratio",
        ),
        MetricFormulaOperation::Percentage => divide(
            resolved.first().copied().unwrap_or(0.0),
            resolved.get(1).copied().unwrap_or(0.0),
            "percentage",
        ).map(|value| value * 100.0),
        MetricFormulaOperation::Min => Ok(resolved.into_iter().reduce(f64::min).unwrap_or(0.0)),
        MetricFormulaOperation::Max => Ok(resolved.into_iter().reduce(f64::max).unwrap_or(0.0)),
        MetricFormulaOperation::Average => {
            if resolved.is_empty() {
                Ok(0.0)
            } else {
                Ok(resolved.iter().sum::<f64>() / resolved.len() as f64)
            }
        }
    }
}

fn validate_formula_operands(
    operation: &MetricFormulaOperation,
    operands: &[String],
) -> Result<(), String> {
    match operation {
        MetricFormulaOperation::Difference
        | MetricFormulaOperation::Ratio
        | MetricFormulaOperation::Percentage => {
            if operands.len() != 2 || operands.iter().any(|operand| operand.trim().is_empty()) {
                return Err(format!("{operation:?} requires exactly two query operands."));
            }
        }
        MetricFormulaOperation::Sum
        | MetricFormulaOperation::Min
        | MetricFormulaOperation::Max
        | MetricFormulaOperation::Average => {
            if operands.len() < 2 || operands.iter().any(|operand| operand.trim().is_empty()) {
                return Err(format!("{operation:?} requires at least two query operands."));
            }
        }
    }
    Ok(())
}

fn divide(numerator: f64, denominator: f64, label: &str) -> Result<f64, String> {
    if denominator.abs() < f64::EPSILON {
        Err(format!("Cannot calculate {label}: denominator is zero."))
    } else {
        Ok(numerator / denominator)
    }
}


fn resolve_time_range(range: &MetricTimeRange) -> Result<ResolvedMetricTimeRange, String> {
    if range.mode == "absolute" {
        return Ok(ResolvedMetricTimeRange {
            start: range.start.clone().ok_or_else(|| "Start is required.".to_string())?,
            end: range.end.clone().ok_or_else(|| "End is required.".to_string())?,
        });
    }

    let amount = range.amount.unwrap_or(15).max(1);
    let seconds = match range.unit.as_deref().unwrap_or("minutes") {
        "minutes" => amount * 60,
        "hours" => amount * 60 * 60,
        "days" => amount * 24 * 60 * 60,
        _ => return Err("Unsupported relative time unit.".to_string()),
    };
    let end = chrono::Utc::now();
    let start = end - chrono::Duration::seconds(seconds);
    Ok(ResolvedMetricTimeRange {
        start: start.to_rfc3339(),
        end: end.to_rfc3339(),
    })
}
