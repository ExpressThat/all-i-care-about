use super::client::GitHubClient;
use super::models::GitHubIssue;
use crate::providers::types::{
    ProviderIssue, ProviderIssuePage, ProviderIssueSource, ProviderIssueStatus, ProviderRepository,
};

pub fn repository_to_issue_source(repository: ProviderRepository) -> ProviderIssueSource {
    log::debug!(
        "Mapping GitHub repository to issue source: full_name={}",
        repository.full_name
    );
    ProviderIssueSource {
        id: repository.full_name.clone(),
        key: repository.full_name.clone(),
        name: repository.name,
        display_name: repository.full_name.clone(),
        web_url: Some(format!("https://github.com/{}", repository.full_name)),
        updated_at: repository.updated_at,
    }
}

pub fn issue_statuses() -> Vec<ProviderIssueStatus> {
    log::debug!("Building GitHub issue statuses");
    vec![
        ProviderIssueStatus {
            id: "open".to_string(),
            name: "Open".to_string(),
            category: Some("open".to_string()),
            position: 0,
        },
        ProviderIssueStatus {
            id: "closed".to_string(),
            name: "Closed".to_string(),
            category: Some("closed".to_string()),
            position: 1,
        },
    ]
}

pub async fn list_issues(
    client: &GitHubClient<'_>,
    source: &ProviderIssueSource,
    etag: Option<&str>,
) -> Result<ProviderIssuePage, String> {
    log::debug!(
        "GitHub issues fetch started: source_key={}, has_etag={}",
        source.key,
        etag.is_some()
    );
    let (owner, repo) = source
        .key
        .split_once('/')
        .ok_or_else(|| "GitHub issue source key must be owner/repo.".to_string())?;
    let path =
        format!("/repos/{owner}/{repo}/issues?state=all&sort=updated&direction=desc&per_page=100");
    let response = client.get(&path, etag).await?;

    if response.status() == reqwest::StatusCode::NOT_MODIFIED {
        log::info!("GitHub issues not modified: source_key={}", source.key);
        return Ok(ProviderIssuePage {
            etag: None,
            failed: false,
            not_modified: true,
            issues: Vec::new(),
        });
    }

    if !response.status().is_success() {
        log::error!(
            "GitHub issues request returned unsuccessful status: source_key={}, status={}",
            source.key,
            response.status()
        );
        return Ok(ProviderIssuePage {
            etag: None,
            failed: true,
            not_modified: false,
            issues: Vec::new(),
        });
    }

    let etag = response
        .headers()
        .get(reqwest::header::ETAG)
        .and_then(|value| value.to_str().ok())
        .map(ToString::to_string);
    let issues: Vec<GitHubIssue> = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse GitHub issues: {error}"))?;
    let raw_count = issues.len();
    let mapped_issues = issues
        .into_iter()
        .filter(|issue| issue.pull_request.is_none())
        .map(map_issue)
        .collect::<Vec<_>>();

    log::info!(
        "GitHub issues fetch completed: source_key={}, raw_results={}, issues_after_pr_filter={}, has_etag={}",
        source.key,
        raw_count,
        mapped_issues.len(),
        etag.is_some()
    );
    Ok(ProviderIssuePage {
        etag,
        failed: false,
        not_modified: false,
        issues: mapped_issues,
    })
}

fn map_issue(issue: GitHubIssue) -> ProviderIssue {
    let (author_name, author_avatar_url) = issue
        .user
        .map(|user| (Some(user.login), user.avatar_url))
        .unwrap_or((None, None));
    let (assignee_name, assignee_avatar_url) = issue
        .assignee
        .map(|user| (Some(user.login), user.avatar_url))
        .unwrap_or((None, None));
    let status_id = issue.state.to_lowercase();

    ProviderIssue {
        id: format!("github:issue:{}", issue.id),
        key: format!("#{}", issue.number),
        title: issue.title,
        status_id: status_id.clone(),
        status_name: capitalize(&status_id),
        author_name,
        author_avatar_url,
        assignee_name,
        assignee_avatar_url,
        updated_at: issue.updated_at,
        html_url: issue.html_url,
    }
}

fn capitalize(value: &str) -> String {
    let mut chars = value.chars();
    match chars.next() {
        Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
        None => value.to_string(),
    }
}
