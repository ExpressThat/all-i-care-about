use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JiraProjectSearchResponse {
    pub values: Vec<JiraProject>,
    pub is_last: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct JiraProject {
    pub id: String,
    pub key: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JiraBoardSearchResponse {
    pub values: Vec<JiraBoard>,
    pub is_last: Option<bool>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct JiraBoard {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JiraSprintSearchResponse {
    pub values: Vec<JiraSprint>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JiraBoardProjectsResponse {
    pub values: Vec<JiraProject>,
    pub is_last: Option<bool>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct JiraSprint {
    pub id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JiraBoardConfiguration {
    pub column_config: JiraColumnConfig,
}

#[derive(Debug, Deserialize)]
pub struct JiraColumnConfig {
    pub columns: Vec<JiraBoardColumn>,
}

#[derive(Debug, Deserialize)]
pub struct JiraBoardColumn {
    pub name: String,
    pub statuses: Vec<JiraBoardColumnStatus>,
}

#[derive(Debug, Deserialize)]
pub struct JiraBoardColumnStatus {
    pub id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JiraStatus {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JiraSprintIssuesResponse {
    pub issues: Vec<JiraIssue>,
    pub is_last: Option<bool>,
    pub next_page_token: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct JiraIssue {
    pub id: String,
    pub key: String,
    pub fields: JiraIssueFields,
}

#[derive(Debug, Deserialize)]
pub struct JiraIssueFields {
    pub summary: String,
    pub status: JiraStatus,
    pub reporter: Option<JiraUser>,
    pub assignee: Option<JiraUser>,
    pub updated: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JiraUser {
    pub display_name: Option<String>,
    pub avatar_urls: Option<JiraAvatarUrls>,
}

#[derive(Debug, Deserialize)]
pub struct JiraAvatarUrls {
    #[serde(rename = "48x48")]
    pub large: Option<String>,
}
