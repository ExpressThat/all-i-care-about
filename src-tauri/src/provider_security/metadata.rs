use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use url::Url;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    Github,
    Jira,
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
    let host = url
        .host_str()
        .ok_or_else(|| "URL must include a host.".to_string())?
        .to_lowercase();

    if scheme != "https" {
        return Err("Provider HTTP requests must use HTTPS.".to_string());
    }

    match url.port() {
        Some(port) => Ok(format!("{scheme}://{host}:{port}")),
        None => Ok(format!("{scheme}://{host}")),
    }
}
