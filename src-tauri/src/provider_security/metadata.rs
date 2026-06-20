use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeSet;
use url::Url;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    Github,
    Jira,
}

#[derive(Clone, Copy)]
pub struct ProviderMetadata {
    pub static_allowed_origins: &'static [&'static str],
    pub fields: &'static [ProviderFieldMetadata],
}

#[derive(Clone, Copy)]
pub struct ProviderFieldMetadata {
    pub key: &'static str,
    pub kind: ProviderFieldKind,
    pub origin_access: bool,
    pub fields: &'static [ProviderFieldMetadata],
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ProviderFieldKind {
    Group,
    Secret,
    Url,
}

const GITHUB_FIELDS: &[ProviderFieldMetadata] = &[ProviderFieldMetadata {
    key: "personalAccessToken",
    kind: ProviderFieldKind::Secret,
    origin_access: false,
    fields: &[],
}];

const JIRA_FIELDS: &[ProviderFieldMetadata] = &[
    ProviderFieldMetadata {
        key: "apiUrl",
        kind: ProviderFieldKind::Url,
        origin_access: true,
        fields: &[],
    },
    ProviderFieldMetadata {
        key: "personalAccessToken",
        kind: ProviderFieldKind::Secret,
        origin_access: false,
        fields: &[],
    },
];

pub fn metadata_for_provider(provider_type: ProviderType) -> ProviderMetadata {
    match provider_type {
        ProviderType::Github => ProviderMetadata {
            static_allowed_origins: &["https://api.github.com"],
            fields: GITHUB_FIELDS,
        },
        ProviderType::Jira => ProviderMetadata {
            static_allowed_origins: &[],
            fields: JIRA_FIELDS,
        },
    }
}

pub fn allowed_origins_for_provider(
    metadata: ProviderMetadata,
    settings: &Map<String, Value>,
) -> Result<BTreeSet<String>, String> {
    let mut origins = BTreeSet::new();

    for origin in metadata.static_allowed_origins {
        origins.insert(origin_for_url(origin)?);
    }

    collect_origin_access_fields(metadata.fields, settings, &mut origins)?;
    Ok(origins)
}

pub fn is_secret_field(fields: &[ProviderFieldMetadata], path: &[&str]) -> bool {
    let Some((head, tail)) = path.split_first() else {
        return false;
    };

    for field in fields {
        if field.key != *head {
            continue;
        }

        if tail.is_empty() {
            return field.kind == ProviderFieldKind::Secret;
        }

        return field.kind == ProviderFieldKind::Group && is_secret_field(field.fields, tail);
    }

    false
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

fn collect_origin_access_fields(
    fields: &[ProviderFieldMetadata],
    settings: &Map<String, Value>,
    origins: &mut BTreeSet<String>,
) -> Result<(), String> {
    for field in fields {
        if field.kind == ProviderFieldKind::Group {
            if let Some(group_settings) = settings.get(field.key).and_then(Value::as_object) {
                collect_origin_access_fields(field.fields, group_settings, origins)?;
            }
            continue;
        }

        if field.kind != ProviderFieldKind::Url || !field.origin_access {
            continue;
        }

        if let Some(value) = settings.get(field.key).and_then(Value::as_str) {
            if !value.is_empty() {
                origins.insert(origin_for_url(value)?);
            }
        }
    }

    Ok(())
}
