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
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretInput {
    pub name: String,
    pub category: SecretCategory,
    #[serde(default)]
    pub tags: Vec<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SecretFieldType {
    Secret,
    Text,
    Url,
    Email,
    Number,
    Json,
    Env,
    Note,
    File,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SecretFieldPurpose {
    Credential,
    Identifier,
    Endpoint,
    Metadata,
    Note,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretField {
    pub id: String,
    pub secret_id: String,
    pub label: String,
    pub field_type: SecretFieldType,
    pub encrypted_value: Option<String>,
    pub value_preview: Option<String>,
    pub sensitive: bool,
    pub env_name: Option<String>,
    pub purpose: Option<SecretFieldPurpose>,
    pub section: Option<String>,
    pub sort_order: i64,
    pub enabled: bool,
    pub expires_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretFieldInput {
    pub label: String,
    pub field_type: SecretFieldType,
    pub value: Option<String>,
    pub sensitive: bool,
    pub env_name: Option<String>,
    pub purpose: Option<SecretFieldPurpose>,
    pub section: Option<String>,
    pub sort_order: Option<i64>,
    pub enabled: bool,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLog {
    pub id: String,
    pub action: String,
    pub target_id: Option<String>,
    pub target_name: Option<String>,
    pub preset_id: Option<String>,
    pub preset_name: Option<String>,
    pub env_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetEnv {
    pub env_name: String,
    pub value: String,
    pub secret_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetEntry {
    pub id: String,
    pub preset_id: String,
    pub secret_id: String,
    pub secret_name: Option<String>,
    pub field_id: String,
    pub field_label: Option<String>,
    pub env_name: String,
    pub preview: Option<String>,
    pub sort_order: i64,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivePreset {
    pub id: String,
    pub name: String,
    #[serde(default = "default_active_source_type")]
    pub source_type: String,
    pub env_count: usize,
    #[serde(default)]
    pub env_names: Vec<String>,
}

fn default_active_source_type() -> String {
    "preset".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetInclude {
    pub id: String,
    pub preset_id: String,
    pub included_preset_id: String,
    pub included_preset_name: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetInput {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetTemplate {
    pub name: String,
    pub description: String,
    pub fields: Vec<PresetTemplateField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetTemplateField {
    pub env_name: String,
    pub sensitive: bool,
    pub required: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetPreview {
    pub name: String,
    pub env_names: Vec<String>,
    pub env_count: usize,
    pub secret_values: bool,
    pub conflicts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellIntegrationStatus {
    pub shell: String,
    pub installed: bool,
    pub rc_path: String,
}
