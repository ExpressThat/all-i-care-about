pub mod github;
pub mod http;
pub mod jira;
pub mod types;

use crate::provider_security::metadata::ProviderType;
use crate::provider_security::{
    get_decrypted_provider_secret, get_provider_setting_string, verify_provider_origin,
};
use github::client::GitHubClient;
use jira::client::JiraClient;
use types::{
    ProviderContext, ProviderIssuePage, ProviderIssueSource, ProviderIssueStatus,
    ProviderPullRequestPage, ProviderRepository,
};

pub async fn list_accessible_repositories(
    context: &ProviderContext<'_>,
) -> Result<Vec<ProviderRepository>, String> {
    log::debug!(
        "Provider list_accessible_repositories started: provider_id={}, provider_type={:?}",
        context.provider_id,
        context.provider_type
    );
    match context.provider_type {
        ProviderType::Github => {
            let token = get_decrypted_provider_secret(
                context.app,
                context.provider_id,
                github::GITHUB_PAT_SETTING,
            )?;
            let client = GitHubClient::new(context.app, context.pool, context.provider_id, &token);
            let repositories = github::repositories::list_accessible_repositories(&client).await?;
            log::info!(
                "Provider list_accessible_repositories completed: provider_id={}, provider_type={:?}, results={}",
                context.provider_id,
                context.provider_type,
                repositories.len()
            );
            Ok(repositories)
        }
        ProviderType::Jira => {
            log::error!(
                "Provider list_accessible_repositories unsupported: provider_id={}, provider_type={:?}",
                context.provider_id,
                context.provider_type
            );
            Err(format!(
                "Provider type \"{:?}\" does not support git repositories.",
                context.provider_type
            ))
        }
    }
}

pub async fn list_open_pull_requests(
    context: &ProviderContext<'_>,
    owner: &str,
    repo: &str,
    etag: Option<&str>,
) -> Result<ProviderPullRequestPage, String> {
    log::debug!(
        "Provider list_open_pull_requests started: provider_id={}, provider_type={:?}, repository={}/{}, has_etag={}",
        context.provider_id,
        context.provider_type,
        owner,
        repo,
        etag.is_some()
    );
    match context.provider_type {
        ProviderType::Github => {
            let token = get_decrypted_provider_secret(
                context.app,
                context.provider_id,
                github::GITHUB_PAT_SETTING,
            )?;
            let client = GitHubClient::new(context.app, context.pool, context.provider_id, &token);
            let page =
                github::pull_requests::list_open_pull_requests(&client, owner, repo, etag).await?;
            log::info!(
                "Provider list_open_pull_requests completed: provider_id={}, repository={}/{}, failed={}, not_modified={}, results={}",
                context.provider_id,
                owner,
                repo,
                page.failed,
                page.not_modified,
                page.pull_requests.len()
            );
            Ok(page)
        }
        ProviderType::Jira => {
            log::error!(
                "Provider list_open_pull_requests unsupported: provider_id={}, provider_type={:?}",
                context.provider_id,
                context.provider_type
            );
            Err(format!(
                "Provider type \"{:?}\" does not support pull requests.",
                context.provider_type
            ))
        }
    }
}

pub async fn list_accessible_issue_sources(
    context: &ProviderContext<'_>,
) -> Result<Vec<ProviderIssueSource>, String> {
    log::debug!(
        "Provider list_accessible_issue_sources started: provider_id={}, provider_type={:?}",
        context.provider_id,
        context.provider_type
    );
    match context.provider_type {
        ProviderType::Github => {
            let token = get_decrypted_provider_secret(
                context.app,
                context.provider_id,
                github::GITHUB_PAT_SETTING,
            )?;
            let client = GitHubClient::new(context.app, context.pool, context.provider_id, &token);
            let repositories = github::repositories::list_accessible_repositories(&client).await?;
            let sources = repositories
                .into_iter()
                .map(github::issues::repository_to_issue_source)
                .collect::<Vec<_>>();
            log::info!(
                "Provider list_accessible_issue_sources completed: provider_id={}, provider_type={:?}, results={}",
                context.provider_id,
                context.provider_type,
                sources.len()
            );
            Ok(sources)
        }
        ProviderType::Jira => {
            let client = jira_client(context)?;
            let sources = jira::issues::list_accessible_issue_sources(&client).await?;
            log::info!(
                "Provider list_accessible_issue_sources completed: provider_id={}, provider_type={:?}, results={}",
                context.provider_id,
                context.provider_type,
                sources.len()
            );
            Ok(sources)
        }
    }
}

pub async fn list_issue_statuses(
    context: &ProviderContext<'_>,
    source: &ProviderIssueSource,
) -> Result<Vec<ProviderIssueStatus>, String> {
    log::debug!(
        "Provider list_issue_statuses started: provider_id={}, provider_type={:?}, source_id={}, source_key={}",
        context.provider_id,
        context.provider_type,
        source.id,
        source.key
    );
    match context.provider_type {
        ProviderType::Github => {
            let statuses = github::issues::issue_statuses();
            log::info!(
                "Provider list_issue_statuses completed: provider_id={}, source_key={}, results={}",
                context.provider_id,
                source.key,
                statuses.len()
            );
            Ok(statuses)
        }
        ProviderType::Jira => {
            let client = jira_client(context)?;
            let statuses = jira::issues::list_issue_statuses(&client, source).await?;
            log::info!(
                "Provider list_issue_statuses completed: provider_id={}, source_key={}, results={}",
                context.provider_id,
                source.key,
                statuses.len()
            );
            Ok(statuses)
        }
    }
}

pub async fn list_issues(
    context: &ProviderContext<'_>,
    source: &ProviderIssueSource,
    etag: Option<&str>,
) -> Result<ProviderIssuePage, String> {
    log::debug!(
        "Provider list_issues started: provider_id={}, provider_type={:?}, source_id={}, source_key={}, has_etag={}",
        context.provider_id,
        context.provider_type,
        source.id,
        source.key,
        etag.is_some()
    );
    match context.provider_type {
        ProviderType::Github => {
            let token = get_decrypted_provider_secret(
                context.app,
                context.provider_id,
                github::GITHUB_PAT_SETTING,
            )?;
            let client = GitHubClient::new(context.app, context.pool, context.provider_id, &token);
            let page = github::issues::list_issues(&client, source, etag).await?;
            log::info!(
                "Provider list_issues completed: provider_id={}, source_key={}, failed={}, not_modified={}, results={}",
                context.provider_id,
                source.key,
                page.failed,
                page.not_modified,
                page.issues.len()
            );
            Ok(page)
        }
        ProviderType::Jira => {
            let client = jira_client(context)?;
            let page = jira::issues::list_issues(&client, source, etag).await?;
            log::info!(
                "Provider list_issues completed: provider_id={}, source_key={}, failed={}, not_modified={}, results={}",
                context.provider_id,
                source.key,
                page.failed,
                page.not_modified,
                page.issues.len()
            );
            Ok(page)
        }
    }
}

fn jira_client<'a>(context: &'a ProviderContext<'a>) -> Result<JiraClient<'a>, String> {
    log::debug!("Creating Jira client: provider_id={}", context.provider_id);
    let api_url =
        get_provider_setting_string(context.app, context.provider_id, jira::JIRA_API_URL_SETTING)?;
    verify_provider_origin(context.app, context.provider_id, &api_url)?;
    let email =
        get_provider_setting_string(context.app, context.provider_id, jira::JIRA_EMAIL_SETTING)?;
    let token = get_decrypted_provider_secret(
        context.app,
        context.provider_id,
        jira::JIRA_API_TOKEN_SETTING,
    )?;

    JiraClient::new(
        context.app,
        context.pool,
        context.provider_id,
        &api_url,
        email,
        token,
    )
}
