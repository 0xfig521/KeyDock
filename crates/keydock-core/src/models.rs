use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SecretCategory {
    AI,
    Cloud,
    Search,
    Database,
    DevTool,
    Payment,
    Custom,
}

impl SecretCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AI => "ai",
            Self::Cloud => "cloud",
            Self::Search => "search",
            Self::Database => "database",
            Self::DevTool => "dev_tool",
            Self::Payment => "payment",
            Self::Custom => "custom",
        }
    }

    pub fn from_db(value: &str) -> Self {
        match value {
            "cloud" => Self::Cloud,
            "search" => Self::Search,
            "database" => Self::Database,
            "dev_tool" => Self::DevTool,
            "payment" => Self::Payment,
            "custom" => Self::Custom,
            _ => Self::AI,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Secret {
    pub id: String,
    pub name: String,
    pub category: SecretCategory,
    pub base_url: Option<String>,
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub dashboard_url: Option<String>,
    pub docs_url: Option<String>,
    pub login_url: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretInput {
    pub name: String,
    pub category: SecretCategory,
    pub base_url: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub dashboard_url: Option<String>,
    pub docs_url: Option<String>,
    pub login_url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Key {
    pub id: String,
    pub secret_id: String,
    pub secret_name: Option<String>,
    pub name: String,
    pub env_name: Option<String>,
    pub include_by_default: bool,
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub preview: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyInput {
    pub name: String,
    pub value: String,
    pub env_name: Option<String>,
    #[serde(default = "default_include_by_default")]
    pub include_by_default: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub expires_at: Option<String>,
}

fn default_include_by_default() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceVariable {
    pub id: String,
    pub workspace_id: String,
    pub secret_id: String,
    pub secret_name: Option<String>,
    pub key_id: String,
    pub key_name: Option<String>,
    pub env_name: String,
    pub enabled: bool,
    pub required: bool,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLog {
    pub id: String,
    pub action: String,
    pub target_id: Option<String>,
    pub target_name: Option<String>,
    pub workspace_id: Option<String>,
    pub workspace_name: Option<String>,
    pub env_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceEnv {
    pub env_name: String,
    pub value: String,
    pub secret_id: String,
    pub key_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveWorkspace {
    pub id: String,
    pub name: String,
    #[serde(default = "default_active_source_type")]
    pub source_type: String,
    pub env_count: usize,
    #[serde(default)]
    pub env_names: Vec<String>,
}

fn default_active_source_type() -> String {
    "workspace".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellIntegrationStatus {
    pub shell: String,
    pub installed: bool,
    pub rc_path: String,
}
