use super::client::GitHubClient;
use super::models::GitHubRepository;
use crate::providers::types::ProviderRepository;

pub async fn list_accessible_repositories(
    client: &GitHubClient<'_>,
) -> Result<Vec<ProviderRepository>, String> {
    let mut page = 1;
    let mut repositories = Vec::new();

    loop {
        let path = format!(
            "/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page={page}"
        );
        let response = client.get(&path, None).await?;
        let github_repositories: Vec<GitHubRepository> = response
            .json()
            .await
            .map_err(|error| format!("Failed to parse GitHub repositories: {error}"))?;
        let count = github_repositories.len();

        repositories.extend(github_repositories.into_iter().map(map_repository));

        if count < 100 {
            break;
        }
        page += 1;
    }

    Ok(repositories)
}

fn map_repository(repository: GitHubRepository) -> ProviderRepository {
    ProviderRepository {
        owner: repository.owner.login,
        name: repository.name,
        full_name: repository.full_name,
        is_private: repository.private,
        is_archived: repository.archived,
        updated_at: repository.updated_at,
    }
}
