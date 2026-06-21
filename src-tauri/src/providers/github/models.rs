use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct GitHubRepositoryOwner {
    pub login: String,
}

#[derive(Debug, Deserialize)]
pub struct GitHubRepository {
    pub name: String,
    pub full_name: String,
    pub private: bool,
    pub archived: bool,
    pub updated_at: Option<String>,
    pub owner: GitHubRepositoryOwner,
}

#[derive(Debug, Deserialize)]
pub struct GitHubPullRequestUser {
    pub login: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GitHubPullRequest {
    pub id: i64,
    pub number: i64,
    pub title: String,
    pub state: String,
    pub updated_at: String,
    pub html_url: String,
    pub user: Option<GitHubPullRequestUser>,
}
