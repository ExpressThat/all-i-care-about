use serde::{de, Deserialize, Deserializer, Serialize, Serializer};
use std::collections::BTreeSet;
use url::{Host, Url};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderType {
    Github,
    Atlassian,
    OpenSearch,
}

impl ProviderType {
    fn as_str(self) -> &'static str {
        match self {
            ProviderType::Github => "github",
            ProviderType::Atlassian => "atlassian",
            ProviderType::OpenSearch => "opensearch",
        }
    }
}

impl Serialize for ProviderType {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for ProviderType {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "github" => Ok(ProviderType::Github),
            "atlassian" | "jira" => Ok(ProviderType::Atlassian),
            "opensearch" => Ok(ProviderType::OpenSearch),
            _ => Err(de::Error::unknown_variant(
                &value,
                &["github", "atlassian", "jira", "opensearch"],
            )),
        }
    }
}

pub fn normalize_origins(origins: &[String]) -> Result<Vec<String>, String> {
    let mut normalized = BTreeSet::new();

    for origin in origins {
        normalized.insert(origin_for_url(origin)?);
    }

    Ok(normalized.into_iter().collect())
}

pub fn origin_for_url(value: &str) -> Result<String, String> {
    let url = Url::parse(value).map_err(|error| format!("Invalid URL: {error}"))?;
    let scheme = url.scheme();
    let host = normalized_host(&url)?;

    if scheme != "https" && !(scheme == "http" && is_loopback_host(&host)) {
        return Err(
            "Provider HTTP requests must use HTTPS unless they target localhost.".to_string(),
        );
    }

    match url.port() {
        Some(port) => Ok(format!("{scheme}://{host}:{port}")),
        None => Ok(format!("{scheme}://{host}")),
    }
}

fn normalized_host(url: &Url) -> Result<String, String> {
    let host = url
        .host()
        .ok_or_else(|| "URL must include a host.".to_string())?;

    Ok(match host {
        Host::Domain(domain) => domain.to_lowercase(),
        Host::Ipv4(address) => address.to_string(),
        Host::Ipv6(address) => format!("[{address}]"),
    })
}

fn is_loopback_host(host: &str) -> bool {
    matches!(host, "localhost" | "127.0.0.1" | "[::1]")
}

#[cfg(test)]
mod tests {
    use super::ProviderType;

    #[test]
    fn provider_type_deserializes_legacy_jira_as_atlassian() {
        let provider_type: ProviderType = serde_json::from_str("\"jira\"").unwrap();

        assert_eq!(provider_type, ProviderType::Atlassian);
    }

    #[test]
    fn provider_type_serializes_atlassian_name() {
        let value = serde_json::to_string(&ProviderType::Atlassian).unwrap();

        assert_eq!(value, "\"atlassian\"");
    }
}
