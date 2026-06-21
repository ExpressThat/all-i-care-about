use super::client::GitHubClient;
use super::models::GitHubPullRequest;
use crate::providers::types::{ProviderPullRequest, ProviderPullRequestPage};

pub async fn list_open_pull_requests(
    client: &GitHubClient<'_>,
    owner: &str,
    repo: &str,
    etag: Option<&str>,
) -> Result<ProviderPullRequestPage, String> {
    log::debug!(
        "GitHub pull requests fetch started: repository={}/{}, has_etag={}",
        owner,
        repo,
        etag.is_some()
    );
    let path = format!("/repos/{owner}/{repo}/pulls?&sort=updated&direction=desc&per_page=100");
    let response = client.get(&path, etag).await?;

    if response.status() == reqwest::StatusCode::NOT_MODIFIED {
        log::info!("GitHub pull requests not modified: repository={owner}/{repo}");
        return Ok(ProviderPullRequestPage {
            etag: None,
            failed: false,
            not_modified: true,
            pull_requests: Vec::new(),
        });
    }

    if !response.status().is_success() {
        log::error!(
            "GitHub pull requests request returned unsuccessful status: repository={}/{}, status={}",
            owner,
            repo,
            response.status()
        );
        return Ok(ProviderPullRequestPage {
            etag: None,
            failed: true,
            not_modified: false,
            pull_requests: Vec::new(),
        });
    }

    let etag = response
        .headers()
        .get(reqwest::header::ETAG)
        .and_then(|value| value.to_str().ok())
        .map(ToString::to_string);
    let pull_requests: Vec<GitHubPullRequest> = response
        .json()
        .await
        .map_err(|error| format!("Failed to parse GitHub pull requests: {error}"))?;
    let count = pull_requests.len();

    log::info!(
        "GitHub pull requests fetch completed: repository={}/{}, results={}, has_etag={}",
        owner,
        repo,
        count,
        etag.is_some()
    );
    Ok(ProviderPullRequestPage {
        etag,
        failed: false,
        not_modified: false,
        pull_requests: pull_requests.into_iter().map(map_pull_request).collect(),
    })
}

fn map_pull_request(pull_request: GitHubPullRequest) -> ProviderPullRequest {
    let (author_login, author_avatar_url) = pull_request
        .user
        .map(|user| (user.login, user.avatar_url))
        .unwrap_or_else(|| ("unknown".to_string(), None));

    ProviderPullRequest {
        id: format!("github:pull_request:{}", pull_request.id),
        number: pull_request.number,
        title: pull_request.title,
        author_login,
        author_avatar_url,
        state: pull_request.state,
        updated_at: pull_request.updated_at,
        html_url: pull_request.html_url,
    }
}
