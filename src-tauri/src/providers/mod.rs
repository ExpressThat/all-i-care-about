pub mod github;
pub mod http;
pub mod types;

use crate::provider_security::get_decrypted_provider_secret;
use crate::provider_security::metadata::ProviderType;
use github::client::GitHubClient;
use types::{ProviderContext, ProviderPullRequestPage, ProviderRepository};

pub async fn list_accessible_repositories(
    context: &ProviderContext<'_>,
) -> Result<Vec<ProviderRepository>, String> {
    match context.provider_type {
        ProviderType::Github => {
            let token = get_decrypted_provider_secret(
                context.app,
                context.provider_id,
                github::GITHUB_PAT_SETTING,
            )?;
            let client = GitHubClient::new(context.app, context.pool, context.provider_id, &token);
            github::repositories::list_accessible_repositories(&client).await
        }
        ProviderType::Jira => Err(format!(
            "Provider type \"{:?}\" does not support git repositories.",
            context.provider_type
        )),
    }
}

pub async fn list_open_pull_requests(
    context: &ProviderContext<'_>,
    owner: &str,
    repo: &str,
    etag: Option<&str>,
) -> Result<ProviderPullRequestPage, String> {
    match context.provider_type {
        ProviderType::Github => {
            let token = get_decrypted_provider_secret(
                context.app,
                context.provider_id,
                github::GITHUB_PAT_SETTING,
            )?;
            let client = GitHubClient::new(context.app, context.pool, context.provider_id, &token);
            github::pull_requests::list_open_pull_requests(&client, owner, repo, etag).await
        }
        ProviderType::Jira => Err(format!(
            "Provider type \"{:?}\" does not support pull requests.",
            context.provider_type
        )),
    }
}
