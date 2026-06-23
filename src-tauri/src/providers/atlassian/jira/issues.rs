use super::client::JiraClient;
use super::models::{
    JiraBoard, JiraBoardConfiguration, JiraBoardProjectsResponse, JiraBoardSearchResponse,
    JiraIssue, JiraProjectSearchResponse, JiraSprint, JiraSprintIssuesResponse,
    JiraSprintSearchResponse, JiraUser,
};
use crate::providers::types::{
    ProviderIssue, ProviderIssuePage, ProviderIssueSource, ProviderIssueStatus,
};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

static ACTIVE_SPRINT_CONTEXT_CACHE: OnceLock<Mutex<HashMap<String, CachedActiveSprintContext>>> =
    OnceLock::new();
const ACTIVE_SPRINT_CONTEXT_CACHE_TTL: Duration = Duration::from_secs(600);

pub async fn list_accessible_issue_sources(
    client: &JiraClient<'_>,
) -> Result<Vec<ProviderIssueSource>, String> {
    log::debug!("Jira accessible issue sources fetch started");
    let mut start_at = 0;
    let mut sources = Vec::new();

    loop {
        let path = format!("/rest/api/3/project/search?maxResults=100&startAt={start_at}");
        let response = client.get(&path, None).await?;
        let page: JiraProjectSearchResponse = response
            .json()
            .await
            .map_err(|error| format!("Failed to parse Jira projects: {error}"))?;
        let count = page.values.len();
        log::debug!(
            "Jira accessible issue sources page fetched: start_at={}, count={}, is_last={:?}",
            start_at,
            count,
            page.is_last
        );

        sources.extend(page.values.into_iter().map(|project| ProviderIssueSource {
            id: project.id,
            key: project.key.clone(),
            name: project.name.clone(),
            display_name: format!("{} ({})", project.name, project.key),
            web_url: None,
            updated_at: None,
        }));

        if page.is_last.unwrap_or(count < 100) {
            break;
        }
        start_at += count;
    }

    log::info!(
        "Jira accessible issue sources fetch completed: results={}",
        sources.len()
    );
    Ok(sources)
}

pub async fn list_issue_statuses(
    client: &JiraClient<'_>,
    source: &ProviderIssueSource,
) -> Result<Vec<ProviderIssueStatus>, String> {
    log::debug!(
        "Jira issue statuses fetch started: source_id={}, source_key={}",
        source.id,
        source.key
    );
    let context = active_sprint_context(client, source).await?;

    log::info!(
        "Jira issue statuses fetch completed: source_key={}, results={}",
        source.key,
        context.columns.len()
    );
    Ok(context.columns)
}

pub async fn list_issues(
    client: &JiraClient<'_>,
    source: &ProviderIssueSource,
    etag: Option<&str>,
) -> Result<ProviderIssuePage, String> {
    log::debug!(
        "Jira issues fetch started: source_id={}, source_key={}, has_etag={}",
        source.id,
        source.key,
        etag.is_some()
    );
    let context = active_sprint_context(client, source).await?;
    let mut next_page_token = None;
    let mut etag_value = None;
    let mut raw_count = 0;
    let mut issues = Vec::new();

    loop {
        let page =
            fetch_sprint_issues_page(client, &context, next_page_token.as_deref(), etag).await?;

        if page.not_modified {
            log::info!("Jira issues not modified: source_key={}", source.key);
            return Ok(page.into_provider_page(Vec::new()));
        }

        if page.failed {
            return Ok(page.into_provider_page(Vec::new()));
        }

        if etag_value.is_none() {
            etag_value = page.etag.clone();
        }

        raw_count += page.issues.len();
        issues.extend(
            page.issues
                .into_iter()
                .map(|issue| map_issue(client, issue, &context.status_to_column_id))
                .collect::<Result<Vec<_>, _>>()?,
        );

        next_page_token = page.next_page_token;
        if page.is_last.unwrap_or(true) || next_page_token.is_none() {
            break;
        }
    }

    log::info!(
        "Jira issues fetch completed: source_key={}, results={}, has_etag={}",
        source.key,
        raw_count,
        etag_value.is_some()
    );
    Ok(ProviderIssuePage {
        etag: etag_value,
        failed: false,
        not_modified: false,
        issues,
    })
}

#[derive(Clone)]
struct ActiveSprintContext {
    board: JiraBoard,
    sprint: JiraSprint,
    source_key: String,
    columns: Vec<ProviderIssueStatus>,
    status_to_column_id: HashMap<String, String>,
}

#[derive(Clone)]
struct CachedActiveSprintContext {
    expires_at: Instant,
    context: ActiveSprintContext,
}

async fn active_sprint_context(
    client: &JiraClient<'_>,
    source: &ProviderIssueSource,
) -> Result<ActiveSprintContext, String> {
    let cache_key = format!("{}:{}:{}", client.provider_id(), source.id, source.key);
    if let Some(context) = cached_active_sprint_context(&cache_key) {
        log::debug!(
            "Jira active sprint context cache hit: provider_id={}, source_key={}",
            client.provider_id(),
            source.key
        );
        return Ok(context);
    }

    log::debug!(
        "Jira active sprint context cache miss: provider_id={}, source_key={}",
        client.provider_id(),
        source.key
    );
    let (board, sprint) = first_active_sprint_board(client, source).await?;
    let (columns, status_to_column_id) = board_columns(client, &board).await?;

    let context = ActiveSprintContext {
        board,
        sprint,
        source_key: source.key.clone(),
        columns,
        status_to_column_id,
    };
    cache_active_sprint_context(cache_key, context.clone());

    Ok(context)
}

fn cached_active_sprint_context(cache_key: &str) -> Option<ActiveSprintContext> {
    let cache = ACTIVE_SPRINT_CONTEXT_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    let mut cache = cache.lock().ok()?;
    let cached = cache.get(cache_key)?;

    if cached.expires_at <= Instant::now() {
        cache.remove(cache_key);
        return None;
    }

    Some(cached.context.clone())
}

fn cache_active_sprint_context(cache_key: String, context: ActiveSprintContext) {
    let cache = ACTIVE_SPRINT_CONTEXT_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    if let Ok(mut cache) = cache.lock() {
        cache.insert(
            cache_key,
            CachedActiveSprintContext {
                expires_at: Instant::now() + ACTIVE_SPRINT_CONTEXT_CACHE_TTL,
                context,
            },
        );
    }
}

struct JiraSprintIssuesPage {
    etag: Option<String>,
    failed: bool,
    not_modified: bool,
    issues: Vec<JiraIssue>,
    is_last: Option<bool>,
    next_page_token: Option<String>,
}

impl JiraSprintIssuesPage {
    fn into_provider_page(self, issues: Vec<ProviderIssue>) -> ProviderIssuePage {
        ProviderIssuePage {
            etag: self.etag,
            failed: self.failed,
            not_modified: self.not_modified,
            issues,
        }
    }
}

async fn fetch_sprint_issues_page(
    client: &JiraClient<'_>,
    context: &ActiveSprintContext,
    next_page_token: Option<&str>,
    etag: Option<&str>,
) -> Result<JiraSprintIssuesPage, String> {
    let query = {
        let mut serializer = url::form_urlencoded::Serializer::new(String::new());
        serializer.append_pair("maxResults", "100");
        serializer.append_pair("jql", &format!("project = {}", context.source_key));
        for field in ["summary", "status", "reporter", "assignee", "updated"] {
            serializer.append_pair("fields", field);
        }
        if let Some(next_page_token) = next_page_token {
            serializer.append_pair("nextPageToken", next_page_token);
        }
        serializer.finish()
    };
    let path = format!(
        "/rest/software/1.0/sprint/{}/issue?{query}",
        context.sprint.id
    );
    let response = client.get(&path, etag).await?;

    if response.status() == reqwest::StatusCode::NOT_MODIFIED {
        return Ok(JiraSprintIssuesPage {
            etag: None,
            failed: false,
            not_modified: true,
            issues: Vec::new(),
            is_last: Some(true),
            next_page_token: None,
        });
    }

    if !response.status().is_success() {
        log::error!(
            "Jira issues request returned unsuccessful status: board_id={}, sprint_id={}, status={}",
            context.board.id,
            context.sprint.id,
            response.status()
        );
        return Ok(JiraSprintIssuesPage {
            etag: None,
            failed: true,
            not_modified: false,
            issues: Vec::new(),
            is_last: Some(true),
            next_page_token: None,
        });
    }

    let etag = response
        .headers()
        .get(reqwest::header::ETAG)
        .and_then(|value| value.to_str().ok())
        .map(ToString::to_string);
    let page: JiraSprintIssuesResponse = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse Jira issues: {error}"))?;

    Ok(JiraSprintIssuesPage {
        etag,
        failed: false,
        not_modified: false,
        issues: page.issues,
        is_last: page.is_last,
        next_page_token: page.next_page_token,
    })
}

async fn first_active_sprint_board(
    client: &JiraClient<'_>,
    source: &ProviderIssueSource,
) -> Result<(JiraBoard, JiraSprint), String> {
    let query = {
        let mut serializer = url::form_urlencoded::Serializer::new(String::new());
        serializer.append_pair("projectKeyOrId", &source.key);
        serializer.append_pair("maxResults", "50");
        serializer.finish()
    };
    let path = format!("/rest/agile/1.0/board?{query}");
    let response = client.get(&path, None).await?;

    if !response.status().is_success() {
        return Err(format!(
            "Jira board lookup failed for {}: {}",
            source.key,
            response.status()
        ));
    }

    let page: JiraBoardSearchResponse = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse Jira boards: {error}"))?;

    for board in page.values {
        if let Ok(sprint) = active_sprint(client, &board).await {
            log::debug!(
                "Jira direct board lookup matched active sprint board: source_key={}, board_id={}, board_name={}",
                source.key,
                board.id,
                board.name
            );
            return Ok((board, sprint));
        }
    }

    log::debug!(
        "Jira direct board lookup returned no active sprint board, falling back to board project scan: source_id={}, source_key={}",
        source.id,
        source.key
    );
    scrum_board_by_project_scan(client, source).await
}

async fn scrum_board_by_project_scan(
    client: &JiraClient<'_>,
    source: &ProviderIssueSource,
) -> Result<(JiraBoard, JiraSprint), String> {
    let mut start_at = 0;

    loop {
        let query = {
            let mut serializer = url::form_urlencoded::Serializer::new(String::new());
            serializer.append_pair("maxResults", "50");
            serializer.append_pair("startAt", &start_at.to_string());
            serializer.finish()
        };
        let path = format!("/rest/agile/1.0/board?{query}");
        let response = client.get(&path, None).await?;

        if !response.status().is_success() {
            return Err(format!(
                "Jira Scrum board scan failed for {}: {}",
                source.key,
                response.status()
            ));
        }

        let page: JiraBoardSearchResponse = response
            .json()
            .await
            .map_err(|error| format!("Failed to parse Jira boards: {error}"))?;
        let count = page.values.len();

        for board in page.values {
            if board_contains_project(client, &board, source).await? {
                let sprint = match active_sprint(client, &board).await {
                    Ok(sprint) => sprint,
                    Err(_) => continue,
                };
                log::debug!(
                    "Jira Scrum board project scan matched: source_key={}, board_id={}, board_name={}",
                    source.key,
                    board.id,
                    board.name
                );
                return Ok((board, sprint));
            }
        }

        if page.is_last.unwrap_or(count < 50) {
            break;
        }
        start_at += count;
    }

    Err(format!(
        "No Scrum board found for Jira project {}. The project may be on a board the API user cannot view.",
        source.key
    ))
}

async fn board_contains_project(
    client: &JiraClient<'_>,
    board: &JiraBoard,
    source: &ProviderIssueSource,
) -> Result<bool, String> {
    let mut start_at = 0;

    loop {
        let path = format!(
            "/rest/agile/1.0/board/{}/project?maxResults=50&startAt={start_at}",
            board.id
        );
        let response = client.get(&path, None).await?;

        if !response.status().is_success() {
            log::debug!(
                "Jira board projects lookup failed while scanning: board_id={}, status={}",
                board.id,
                response.status()
            );
            return Ok(false);
        }

        let page: JiraBoardProjectsResponse = response
            .json()
            .await
            .map_err(|error| format!("Failed to parse Jira board projects: {error}"))?;
        let count = page.values.len();

        if page
            .values
            .iter()
            .any(|project| project.id == source.id || project.key == source.key)
        {
            return Ok(true);
        }

        if page.is_last.unwrap_or(count < 50) {
            break;
        }
        start_at += count;
    }

    Ok(false)
}

async fn active_sprint(client: &JiraClient<'_>, board: &JiraBoard) -> Result<JiraSprint, String> {
    let path = format!(
        "/rest/agile/1.0/board/{}/sprint?state=active&maxResults=50",
        board.id
    );
    let response = client.get(&path, None).await?;

    if !response.status().is_success() {
        return Err(format!(
            "Jira active sprint lookup failed for board {}: {}",
            board.name,
            response.status()
        ));
    }

    let page: JiraSprintSearchResponse = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse Jira active sprints: {error}"))?;

    page.values
        .into_iter()
        .next()
        .ok_or_else(|| format!("No active sprint found for Jira board {}.", board.name))
}

async fn board_columns(
    client: &JiraClient<'_>,
    board: &JiraBoard,
) -> Result<(Vec<ProviderIssueStatus>, HashMap<String, String>), String> {
    let path = format!("/rest/agile/1.0/board/{}/configuration", board.id);
    let response = client.get(&path, None).await?;

    if !response.status().is_success() {
        return Err(format!(
            "Jira board configuration lookup failed for board {}: {}",
            board.name,
            response.status()
        ));
    }

    let configuration: JiraBoardConfiguration = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse Jira board configuration: {error}"))?;
    let mut status_to_column_id = HashMap::new();
    let mut columns = Vec::new();

    for (index, column) in configuration.column_config.columns.into_iter().enumerate() {
        let column_id = format!("jira-column:{}:{index}:{}", board.id, column.name);

        for status in column.statuses {
            status_to_column_id.insert(status.id.clone(), column_id.clone());
        }

        columns.push(ProviderIssueStatus {
            id: column_id,
            name: column.name,
            category: None,
            position: index as i64,
        });
    }

    Ok((columns, status_to_column_id))
}

fn map_issue(
    client: &JiraClient<'_>,
    issue: JiraIssue,
    status_to_column_id: &HashMap<String, String>,
) -> Result<ProviderIssue, String> {
    let (author_name, author_avatar_url) = user_parts(issue.fields.reporter);
    let (assignee_name, assignee_avatar_url) = user_parts(issue.fields.assignee);
    let issue_status_id = issue.fields.status.id;
    let column_id = status_to_column_id
        .get(&issue_status_id)
        .cloned()
        .unwrap_or(issue_status_id);

    Ok(ProviderIssue {
        id: format!("jira:issue:{}", issue.id),
        key: issue.key.clone(),
        title: issue.fields.summary,
        status_id: column_id,
        status_name: issue.fields.status.name,
        author_name,
        author_avatar_url,
        assignee_name,
        assignee_avatar_url,
        updated_at: issue.fields.updated,
        html_url: client.browse_issue_url(&issue.key)?,
    })
}

fn user_parts(user: Option<JiraUser>) -> (Option<String>, Option<String>) {
    user.map(|user| {
        (
            user.display_name,
            user.avatar_urls.and_then(|avatars| avatars.large),
        )
    })
    .unwrap_or((None, None))
}
