//! Tauri command request/response contract definitions.
//!
//! These structs define the exact shape of data exchanged between
//! the Rust backend and TypeScript frontend via Tauri's invoke API.

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HealthResponse {
    pub status: String,
}

impl Default for HealthResponse {
    fn default() -> Self {
        Self {
            status: "ok".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProfileItem {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ListProfilesResponse {
    pub profiles: Vec<ProfileItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UltraworkConfig {
    pub model: Option<String>,
    pub variant: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_append: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AgentConfig {
    pub model: Option<String>,
    pub variant: Option<String>,
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_append: Option<String>,
    pub fallback_models: Option<Vec<String>>,
    pub ultrawork: Option<UltraworkConfig>,
    #[serde(rename = "maxTokens", alias = "max_tokens")]
    pub max_tokens: Option<u32>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CategoryConfig {
    pub model: Option<String>,
    pub variant: Option<String>,
    pub temperature: Option<f64>,
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_append: Option<String>,
    pub fallback_models: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TmuxConfig {
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GitMasterConfig {
    pub enabled: Option<bool>,
    pub commit_footer: Option<bool>,
    pub include_co_authored_by: Option<bool>,
    pub git_env_prefix: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MiscConfig {
    pub tmux: Option<TmuxConfig>,
    pub git_master: Option<GitMasterConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditableConfig {
    pub agents: IndexMap<String, Option<AgentConfig>>,
    pub categories: IndexMap<String, Option<CategoryConfig>>,
    pub misc: Option<MiscConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaselineConfig {
    pub agents: IndexMap<String, AgentConfig>,
    pub categories: IndexMap<String, CategoryConfig>,
    pub misc: MiscConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveConfig {
    pub agents: IndexMap<String, AgentConfig>,
    pub categories: IndexMap<String, CategoryConfig>,
    pub misc: MiscConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadonlyTailConfig {
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigFieldError {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelOption {
    pub id: String,
    pub label: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelGroup {
    pub provider: String,
    pub label: String,
    pub models: Vec<ModelOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileConfigResult {
    pub baseline: BaselineConfig,
    pub editable: EditableConfig,
    pub readonly_tail: ReadonlyTailConfig,
    pub effective: EffectiveConfig,
    pub raw_misc: HashMap<String, serde_json::Value>,
    pub available_models: Vec<String>,
    pub available_model_groups: Vec<ModelGroup>,
    pub disabled_providers: Vec<String>,
    pub provider_catalog: Vec<String>,
    pub mtime: u64,
    pub errors: Vec<ConfigFieldError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProfileRequest {
    pub profile_id: String,
    pub payload: EditableConfig,
    pub expected_mtime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveProfileResponse {
    pub success: bool,
    pub mtime: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDisabledProvidersRequest {
    pub profile_id: String,
    pub disabled_providers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CopyProfileRequest {
    pub source_id: String,
    pub target_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CopyProfileResponse {
    pub profile: ProfileItem,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GlobalConfigResponse {
    pub sync_replace_enabled: bool,
    pub app_zoom_percent: u16,
    pub default_profile: Option<String>,
}

/// Custom deserializer to distinguish absent vs null vs value for optional fields.
/// Returns Some(Some(value)) if field present with value,
/// Some(None) if field present with null,
/// None if field absent.
fn some_from_present<'de, D, T>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::Deserialize<'de>,
{
    Ok(Some(Option::deserialize(deserializer)?))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGlobalConfigRequest {
    pub sync_replace_enabled: Option<bool>,
    pub app_zoom_percent: Option<u16>,
    #[serde(
        default,
        deserialize_with = "some_from_present",
        skip_serializing_if = "Option::is_none"
    )]
    pub default_profile: Option<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGlobalConfigResponse {
    pub sync_replace_enabled: Option<bool>,
    pub app_zoom_percent: Option<u16>,
    #[serde(
        default,
        deserialize_with = "some_from_present",
        skip_serializing_if = "Option::is_none"
    )]
    pub default_profile: Option<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ErrorLogsResponse {
    pub entries: Vec<String>,
    pub source_file: String,
    pub truncated: bool,
    pub read_error: Option<String>,
}

// ============================================================
// Provider/Model CRUD Contracts
// ============================================================

/// Model configuration within a provider.
/// Uses flatten to preserve unknown fields from config file.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelConfig {
    #[serde(rename = "type")]
    pub model_type: Option<String>,
    pub max_tokens: Option<u32>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// A provider's model map (provider_name -> {model_name: ModelConfig}).
pub type ProviderModels = HashMap<String, ModelConfig>;

/// Response containing all providers and their models.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProvidersListResponse {
    pub providers: HashMap<String, ProviderModels>,
}

/// Request to create a new provider.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CreateProviderRequest {
    pub name: String,
}

/// Request to create a new model under a provider.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreateModelRequest {
    pub name: String,
    pub max_tokens: Option<u32>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Request to update an existing model's configuration.
/// Uses flatten to preserve unknown fields during partial updates.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateModelRequest {
    pub max_tokens: Option<u32>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Simple response for delete operations.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResponse {
    pub success: bool,
}

/// Simple response for create/update operations.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderModelResponse {
    pub success: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_response_serialization() {
        let response = HealthResponse::default();
        let json = serde_json::to_string(&response).unwrap();
        assert_eq!(json, r#"{"status":"ok"}"#);
    }

    #[test]
    fn test_list_profiles_response_serialization() {
        let response = ListProfilesResponse {
            profiles: vec![
                ProfileItem {
                    id: "default".to_string(),
                    label: "Default Profile".to_string(),
                },
                ProfileItem {
                    id: "work".to_string(),
                    label: "Work Profile".to_string(),
                },
            ],
        };
        let json = serde_json::to_string(&response).unwrap();
        let parsed: ListProfilesResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.profiles.len(), 2);
        assert_eq!(parsed.profiles[0].id, "default");
        assert_eq!(parsed.profiles[1].label, "Work Profile");
    }

    #[test]
    fn test_global_config_response_serialization() {
        let response = GlobalConfigResponse {
            sync_replace_enabled: true,
            app_zoom_percent: 110,
            default_profile: Some("default".to_string()),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("syncReplaceEnabled"));
        assert!(json.contains("appZoomPercent"));
        assert!(json.contains("defaultProfile"));
    }

    #[test]
    fn test_global_config_response_with_null_default() {
        let response = GlobalConfigResponse {
            sync_replace_enabled: false,
            app_zoom_percent: 100,
            default_profile: None,
        };
        let json = serde_json::to_string(&response).unwrap();
        assert_eq!(
            json,
            r#"{"syncReplaceEnabled":false,"appZoomPercent":100,"defaultProfile":null}"#
        );
    }

    #[test]
    fn test_update_global_config_request_field_absent() {
        // Field absent (outer None) - do not update
        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: Some(true),
            app_zoom_percent: None,
            default_profile: None,
        };
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("syncReplaceEnabled"));
        assert!(!json.contains("defaultProfile"));

        let parsed: UpdateGlobalConfigRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.sync_replace_enabled, Some(true));
        assert_eq!(parsed.default_profile, None);
    }

    #[test]
    fn test_update_global_config_request_field_null() {
        // Field present with null (Some(None)) - clear default profile
        let json = r#"{"syncReplaceEnabled":true,"defaultProfile":null}"#;
        let parsed: UpdateGlobalConfigRequest = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.sync_replace_enabled, Some(true));
        assert_eq!(parsed.app_zoom_percent, None);
        assert_eq!(parsed.default_profile, Some(None));
    }

    #[test]
    fn test_update_global_config_request_field_with_value() {
        // Field present with value (Some(Some(id))) - set to this profile
        let json = r#"{"defaultProfile":"my-profile"}"#;
        let parsed: UpdateGlobalConfigRequest = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.sync_replace_enabled, None);
        assert_eq!(parsed.app_zoom_percent, None);
        assert_eq!(parsed.default_profile, Some(Some("my-profile".to_string())));
    }

    #[test]
    fn test_update_global_config_request_app_zoom() {
        let json = r#"{"appZoomPercent":115}"#;
        let parsed: UpdateGlobalConfigRequest = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.sync_replace_enabled, None);
        assert_eq!(parsed.app_zoom_percent, Some(115));
        assert_eq!(parsed.default_profile, None);
    }

    #[test]
    fn test_error_logs_response_serialization() {
        let response = ErrorLogsResponse {
            entries: vec!["Error 1".to_string(), "Error 2".to_string()],
            source_file: "error.log".to_string(),
            truncated: false,
            read_error: None,
        };
        let json = serde_json::to_string(&response).unwrap();
        let parsed: ErrorLogsResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.entries.len(), 2);
        assert_eq!(parsed.source_file, "error.log");
        assert!(!parsed.truncated);
    }

    #[test]
    fn test_error_logs_response_with_read_error() {
        let response = ErrorLogsResponse {
            entries: vec![],
            source_file: "error.log".to_string(),
            truncated: false,
            read_error: Some("Failed to read file".to_string()),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("readError"));
    }

    #[test]
    fn test_copy_profile_request_serialization() {
        let request = CopyProfileRequest {
            source_id: "default".to_string(),
            target_id: "new-profile".to_string(),
        };
        let json = serde_json::to_string(&request).unwrap();
        let parsed: CopyProfileRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.source_id, "default");
        assert_eq!(parsed.target_id, "new-profile");
    }

    #[test]
    fn test_copy_profile_response_serialization() {
        let response = CopyProfileResponse {
            profile: ProfileItem {
                id: "new-profile".to_string(),
                label: "New Profile".to_string(),
            },
        };
        let json = serde_json::to_string(&response).unwrap();
        let parsed: CopyProfileResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.profile.id, "new-profile");
    }

    #[test]
    fn test_profile_item_serialization() {
        let item = ProfileItem {
            id: "test".to_string(),
            label: "Test Profile".to_string(),
        };
        let json = serde_json::to_string(&item).unwrap();
        assert_eq!(json, r#"{"id":"test","label":"Test Profile"}"#);
    }

    #[test]
    fn test_update_disabled_providers_request_serialization() {
        let request = UpdateDisabledProvidersRequest {
            profile_id: "default".to_string(),
            disabled_providers: vec!["anthropic".to_string(), "openai".to_string()],
        };
        let json = serde_json::to_string(&request).unwrap();
        let parsed: UpdateDisabledProvidersRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.profile_id, "default");
        assert_eq!(parsed.disabled_providers.len(), 2);
    }

    #[test]
    fn test_model_option_serialization() {
        let option = ModelOption {
            id: "anthropic/claude-opus-4-5".to_string(),
            label: "Claude Opus 4.5".to_string(),
            provider: "anthropic".to_string(),
        };
        let json = serde_json::to_string(&option).unwrap();
        let parsed: ModelOption = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "anthropic/claude-opus-4-5");
        assert_eq!(parsed.label, "Claude Opus 4.5");
        assert_eq!(parsed.provider, "anthropic");
    }

    #[test]
    fn test_model_group_serialization() {
        let group = ModelGroup {
            provider: "anthropic".to_string(),
            label: "Anthropic".to_string(),
            models: vec![ModelOption {
                id: "anthropic/claude-opus-4-5".to_string(),
                label: "Claude Opus 4.5".to_string(),
                provider: "anthropic".to_string(),
            }],
        };
        let json = serde_json::to_string(&group).unwrap();
        let parsed: ModelGroup = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.provider, "anthropic");
        assert_eq!(parsed.models.len(), 1);
    }

    #[test]
    fn test_config_field_error_serialization() {
        let error = ConfigFieldError {
            path: "agents.build.model".to_string(),
            message: "Invalid model ID".to_string(),
        };
        let json = serde_json::to_string(&error).unwrap();
        let parsed: ConfigFieldError = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.path, "agents.build.model");
        assert_eq!(parsed.message, "Invalid model ID");
    }

    #[test]
    fn test_agent_config_serialization() {
        let config = AgentConfig {
            model: Some("anthropic/claude-opus-4-5".to_string()),
            variant: Some("high".to_string()),
            temperature: None,
            prompt_append: Some("Be concise".to_string()),
            fallback_models: Some(vec!["openai/gpt-5".to_string()]),
            ultrawork: None,
            max_tokens: Some(64000),
            category: None,
        };
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("prompt_append"));
        assert!(json.contains("fallback_models"));
        assert!(json.contains("maxTokens"));
        let parsed: AgentConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.model, Some("anthropic/claude-opus-4-5".to_string()));
        assert_eq!(parsed.variant, Some("high".to_string()));
        assert_eq!(parsed.prompt_append, Some("Be concise".to_string()));
        assert_eq!(
            parsed.fallback_models,
            Some(vec!["openai/gpt-5".to_string()])
        );
        assert_eq!(parsed.max_tokens, Some(64000));

        let parsed_alias: AgentConfig =
            serde_json::from_str(r#"{"model":"openai/gpt-5","max_tokens":32000}"#).unwrap();
        assert_eq!(parsed_alias.max_tokens, Some(32000));
    }

    #[test]
    fn test_empty_prompt_append_is_omitted() {
        let config = AgentConfig {
            model: Some("anthropic/claude-opus-4-5".to_string()),
            variant: None,
            temperature: None,
            prompt_append: None,
            fallback_models: None,
            ultrawork: Some(UltraworkConfig {
                model: Some("openai/gpt-5".to_string()),
                variant: Some("medium".to_string()),
                prompt_append: None,
            }),
            max_tokens: None,
            category: None,
        };

        let value = serde_json::to_value(&config).unwrap();
        let agent = value.as_object().unwrap();
        let ultrawork = agent.get("ultrawork").unwrap().as_object().unwrap();

        assert!(!agent.contains_key("prompt_append"));
        assert!(!ultrawork.contains_key("prompt_append"));
    }

    #[test]
    fn test_misc_config_serialization() {
        let config = MiscConfig {
            tmux: Some(TmuxConfig {
                enabled: Some(true),
            }),
            git_master: Some(GitMasterConfig {
                enabled: Some(true),
                commit_footer: Some(false),
                include_co_authored_by: None,
                git_env_prefix: None,
            }),
        };
        let json = serde_json::to_string(&config).unwrap();
        let parsed: MiscConfig = serde_json::from_str(&json).unwrap();
        assert!(parsed.tmux.is_some());
        assert!(parsed.git_master.is_some());
    }

    #[test]
    fn test_model_config_serialization() {
        let mut extra = HashMap::new();
        extra.insert("customField".to_string(), serde_json::json!("customValue"));
        let config = ModelConfig {
            model_type: Some("chat".to_string()),
            max_tokens: Some(64000),
            extra,
        };
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("type"));
        assert!(json.contains("maxTokens"));
        assert!(json.contains("customField"));
        let parsed: ModelConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.model_type, Some("chat".to_string()));
        assert_eq!(parsed.max_tokens, Some(64000));
        assert!(parsed.extra.contains_key("customField"));
    }

    #[test]
    fn test_model_config_preserves_unknown_fields() {
        let json = r#"{"maxTokens":128000,"apiBase":"https://custom.api","unknownField":42}"#;
        let parsed: ModelConfig = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.max_tokens, Some(128000));
        assert!(parsed.extra.contains_key("apiBase"));
        assert!(parsed.extra.contains_key("unknownField"));
        let serialized = serde_json::to_string(&parsed).unwrap();
        assert!(serialized.contains("apiBase"));
        assert!(serialized.contains("unknownField"));
    }

    #[test]
    fn test_create_provider_request_serialization() {
        let request = CreateProviderRequest {
            name: "custom-provider".to_string(),
        };
        let json = serde_json::to_string(&request).unwrap();
        assert_eq!(json, r#"{"name":"custom-provider"}"#);
        let parsed: CreateProviderRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.name, "custom-provider");
    }

    #[test]
    fn test_create_model_request_serialization() {
        let mut extra = HashMap::new();
        extra.insert("temperature".to_string(), serde_json::json!(0.7));
        let request = CreateModelRequest {
            name: "gpt-5".to_string(),
            max_tokens: Some(128000),
            extra,
        };
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("name"));
        assert!(json.contains("maxTokens"));
        assert!(json.contains("temperature"));
        let parsed: CreateModelRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.name, "gpt-5");
        assert_eq!(parsed.max_tokens, Some(128000));
        assert!(parsed.extra.contains_key("temperature"));
    }

    #[test]
    fn test_update_model_request_serialization() {
        let mut extra = HashMap::new();
        extra.insert("newField".to_string(), serde_json::json!(true));
        let request = UpdateModelRequest {
            max_tokens: Some(32000),
            extra,
        };
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("maxTokens"));
        assert!(json.contains("newField"));
        let parsed: UpdateModelRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.max_tokens, Some(32000));
        assert!(parsed.extra.contains_key("newField"));
    }

    #[test]
    fn test_delete_response_serialization() {
        let response = DeleteResponse { success: true };
        let json = serde_json::to_string(&response).unwrap();
        assert_eq!(json, r#"{"success":true}"#);
        let parsed: DeleteResponse = serde_json::from_str(&json).unwrap();
        assert!(parsed.success);
    }

    #[test]
    fn test_provider_model_response_serialization() {
        let response = ProviderModelResponse { success: true };
        let json = serde_json::to_string(&response).unwrap();
        assert_eq!(json, r#"{"success":true}"#);
        let parsed: ProviderModelResponse = serde_json::from_str(&json).unwrap();
        assert!(parsed.success);
    }
}
