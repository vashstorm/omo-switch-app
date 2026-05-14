//! Profile domain commands for Tauri app.
//!
//! Implements profile scanning, reading, writing, copying operations
//! following the TypeScript implementation semantics.

use crate::contracts::{
    AgentConfig, BaselineConfig, CategoryConfig, ConfigFieldError, CopyProfileRequest,
    CopyProfileResponse, EditableConfig, EffectiveConfig, ListProfilesResponse, MiscConfig,
    ModelGroup, ModelOption, ProfileConfigResult, ProfileItem, ReadonlyTailConfig,
    SaveProfileRequest, SaveProfileResponse, UltraworkField, UpdateDisabledProvidersRequest,
};
use crate::errors::AppError;
use crate::jsonc_edit::{jsonc_modify, jsonc_read, read_jsonc_file, write_jsonc_file};
use crate::paths::AppPaths;
use indexmap::IndexMap;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

// Managed field sets (matching TypeScript managed-fields.ts)
const AGENT_MANAGED_FIELDS: &[&str] = &[
    "model",
    "variant",
    "temperature",
    "prompt_append",
    "fallback_models",
    "ultrawork",
    "maxTokens",
    "max_tokens",
    "category",
];

const CATEGORY_MANAGED_FIELDS: &[&str] = &[
    "model",
    "variant",
    "temperature",
    "description",
    "prompt_append",
    "fallback_models",
];

/// Check if a managed field value should be omitted (blank/default semantics).
///
/// Mirrors TypeScript `shouldOmitField()` from managed-fields.ts.
fn should_omit_managed_field(key: &str, value: &Value) -> bool {
    if value.is_null() {
        return true;
    }
    if let Some(s) = value.as_str() {
        return s.is_empty();
    }
    if let Some(arr) = value.as_array() {
        return arr.is_empty();
    }
    // Temperature === 0 is considered default value
    if key == "temperature" {
        if let Some(num) = value.as_f64() {
            return num == 0.0;
        }
        if let Some(num) = value.as_i64() {
            return num == 0;
        }
        if let Some(num) = value.as_u64() {
            return num == 0;
        }
    }
    false
}

/// Filter managed fields from agent/category objects in editable config payload.
///
/// Removes managed fields when values are blank/default. Unmanaged keys are preserved.
pub fn filter_managed_fields(payload: &mut Value) {
    if let Some(agents) = payload.get_mut("agents").and_then(|v| v.as_object_mut()) {
        for (_agent_id, agent_obj) in agents.iter_mut() {
            if let Some(agent) = agent_obj.as_object_mut() {
                // Must collect first since we can't modify while iterating
                let keys_to_remove: Vec<String> = agent
                    .iter()
                    .filter(|(key, value)| {
                        AGENT_MANAGED_FIELDS.contains(&key.as_str())
                            && should_omit_managed_field(key, value)
                    })
                    .map(|(key, _)| key.clone())
                    .collect();
                for key in keys_to_remove {
                    agent.remove(&key);
                }
            }
        }
    }

    if let Some(categories) = payload
        .get_mut("categories")
        .and_then(|v| v.as_object_mut())
    {
        for (_category_id, category_obj) in categories.iter_mut() {
            if let Some(category) = category_obj.as_object_mut() {
                let keys_to_remove: Vec<String> = category
                    .iter()
                    .filter(|(key, value)| {
                        CATEGORY_MANAGED_FIELDS.contains(&key.as_str())
                            && should_omit_managed_field(key, value)
                    })
                    .map(|(key, _)| key.clone())
                    .collect();
                for key in keys_to_remove {
                    category.remove(&key);
                }
            }
        }
    }
}

#[derive(Debug, Clone)]
struct ProfileLocation {
    id: String,
    label: String,
    dir: PathBuf,
    opencode_path: PathBuf,
    oh_my_path: PathBuf,
}

/// Compare folder names: case-insensitive first, then case-sensitive for ties.
fn compare_folder_name(a: &str, b: &str) -> std::cmp::Ordering {
    let a_lower = a.to_lowercase();
    let b_lower = b.to_lowercase();

    if a_lower < b_lower {
        return std::cmp::Ordering::Less;
    }
    if a_lower > b_lower {
        return std::cmp::Ordering::Greater;
    }

    // Tie-break with original case
    a.cmp(b)
}

/// Validate target ID format: must match ^[a-z0-9][a-z0-9\-_]*$
fn validate_target_id(target_id: &str) -> bool {
    if target_id.is_empty() {
        return false;
    }

    let bytes = target_id.as_bytes();
    let first = bytes[0];
    if !first.is_ascii_lowercase() && !first.is_ascii_digit() {
        return false;
    }

    for byte in &bytes[1..] {
        if !byte.is_ascii_lowercase() && !byte.is_ascii_digit() && *byte != b'-' && *byte != b'_' {
            return false;
        }
    }

    true
}

/// Get mtime of a file in milliseconds. Returns 0 if file doesn't exist.
fn get_mtime_ms(path: &Path) -> u64 {
    match fs::metadata(path) {
        Ok(meta) => match meta.modified() {
            Ok(time) => time
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0),
            Err(_) => 0,
        },
        Err(_) => 0,
    }
}

fn push_model_id(
    models: &mut Vec<String>,
    seen: &mut std::collections::HashSet<String>,
    provider_name: &str,
    model_id: &str,
) {
    let full_id = format!("{}/{}", provider_name, model_id);
    if !seen.contains(&full_id) {
        seen.insert(full_id.clone());
        models.push(full_id);
    }
}

fn is_provider_metadata_key(key: &str) -> bool {
    matches!(
        key,
        "models" | "name" | "npm" | "options" | "type" | "apiKey" | "baseURL" | "base_url"
    )
}

/// Extract models from provider config.
/// Supports both opencode's `provider.*.models` object and this app's global
/// `providers.*.{modelId}` catalog shape.
fn extract_provider_models(providers: &Value) -> Vec<String> {
    let mut models = Vec::new();
    let mut seen = std::collections::HashSet::new();

    if let Some(obj) = providers.as_object() {
        for (provider_name, provider_config) in obj {
            if let Some(cfg) = provider_config.as_object() {
                if let Some(models_val) = cfg.get("models") {
                    if let Some(models_obj) = models_val.as_object() {
                        for model_id in models_obj.keys() {
                            push_model_id(&mut models, &mut seen, provider_name, model_id);
                        }
                        continue;
                    }

                    if let Some(models_arr) = models_val.as_array() {
                        for model_id in models_arr.iter().filter_map(|v| v.as_str()) {
                            push_model_id(&mut models, &mut seen, provider_name, model_id);
                        }
                        continue;
                    }
                }

                for key in cfg.keys() {
                    if !is_provider_metadata_key(key) {
                        push_model_id(&mut models, &mut seen, provider_name, key);
                    }
                }
            }
        }
    }

    models
}

/// Extract model IDs referenced in agents and categories of oh-my-openagent.jsonc.
/// This ensures models like "kimi-for-coding/k2p6" that are used by agents/categories
/// but not declared in provider.models or global config appear in the model picker.
fn extract_referenced_models(oh_my_data: &Value) -> Vec<String> {
    let mut models = Vec::new();
    let mut seen = std::collections::HashSet::new();

    fn try_push(
        models: &mut Vec<String>,
        seen: &mut std::collections::HashSet<String>,
        model: &str,
    ) {
        if !model.is_empty() && model.contains('/') && !seen.contains(model) {
            seen.insert(model.to_string());
            models.push(model.to_string());
        }
    }

    // Extract from agents.*.model, agents.*.fallback_models[], agents.*.ultrawork.model
    if let Some(agents) = oh_my_data.get("agents").and_then(|v| v.as_object()) {
        for (_, agent_val) in agents {
            let Some(agent) = agent_val.as_object() else {
                continue;
            };

            // agents.*.model
            if let Some(model) = agent.get("model").and_then(|v| v.as_str()) {
                try_push(&mut models, &mut seen, model);
            }

            // agents.*.ultrawork.model
            if let Some(ultrawork_model) = agent
                .get("ultrawork")
                .and_then(|u| u.get("model"))
                .and_then(|v| v.as_str())
            {
                try_push(&mut models, &mut seen, ultrawork_model);
            }

            // agents.*.fallback_models[]
            if let Some(fallbacks) = agent.get("fallback_models").and_then(|v| v.as_array()) {
                for fb in fallbacks.iter().filter_map(|v| v.as_str()) {
                    try_push(&mut models, &mut seen, fb);
                }
            }
        }
    }

    // Extract from categories.*.model, categories.*.fallback_models[]
    if let Some(categories) = oh_my_data.get("categories").and_then(|v| v.as_object()) {
        for (_, cat_val) in categories {
            let Some(cat) = cat_val.as_object() else {
                continue;
            };

            // categories.*.model
            if let Some(model) = cat.get("model").and_then(|v| v.as_str()) {
                try_push(&mut models, &mut seen, model);
            }

            // categories.*.fallback_models[]
            if let Some(fallbacks) = cat.get("fallback_models").and_then(|v| v.as_array()) {
                for fb in fallbacks.iter().filter_map(|v| v.as_str()) {
                    try_push(&mut models, &mut seen, fb);
                }
            }
        }
    }

    models
}

/// Build provider catalog from model list (first-appearance order).
fn build_provider_catalog(models: &[String]) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut catalog = Vec::new();

    for model_id in models {
        if let Some(slash_pos) = model_id.find('/') {
            let provider = &model_id[..slash_pos];
            if !seen.contains(provider) {
                seen.insert(provider);
                catalog.push(provider.to_string());
            }
        }
    }

    catalog
}

fn merge_available_models(model_sets: &[Vec<String>]) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut merged = Vec::new();

    for model_set in model_sets {
        for model in model_set {
            if !seen.contains(model) {
                seen.insert(model.clone());
                merged.push(model.clone());
            }
        }
    }

    merged
}

/// Split model ID into provider and model name.
fn split_model_id(id: &str) -> (String, String) {
    if let Some(slash_pos) = id.find('/') {
        (id[..slash_pos].to_string(), id[slash_pos + 1..].to_string())
    } else {
        ("Unknown".to_string(), id.to_string())
    }
}

/// Filter models by disabled providers.
fn filter_models_by_disabled_providers(models: &[String], disabled: &[String]) -> Vec<String> {
    let disabled_set: std::collections::HashSet<&str> =
        disabled.iter().map(|s| s.as_str()).collect();

    models
        .iter()
        .filter(|model_id| {
            let (provider, _) = split_model_id(model_id);
            !disabled_set.contains(provider.as_str())
        })
        .cloned()
        .collect()
}

/// Group models by provider.
fn group_models_by_provider(models: &[String]) -> Vec<ModelGroup> {
    let mut group_map: HashMap<String, ModelGroup> = HashMap::new();

    for model_id in models {
        let (provider, model_name) = split_model_id(model_id);

        if !group_map.contains_key(&provider) {
            group_map.insert(
                provider.clone(),
                ModelGroup {
                    provider: provider.clone(),
                    label: provider.clone(),
                    models: Vec::new(),
                },
            );
        }

        if let Some(group) = group_map.get_mut(&provider) {
            group.models.push(ModelOption {
                id: model_id.clone(),
                label: model_name.clone(),
                provider: provider.clone(),
            });
        }
    }

    let mut groups: Vec<ModelGroup> = group_map.values().cloned().collect();
    groups.sort_by(|a, b| a.provider.cmp(&b.provider));
    groups
}

/// Extract misc source from raw config (top-level non-standard fields).
fn get_misc_source(raw_config: &Value) -> HashMap<String, Value> {
    let mut misc_source = HashMap::new();

    if let Some(obj) = raw_config.as_object() {
        // First add nested misc section if present
        if let Some(nested_misc) = obj.get("misc") {
            if let Some(nested_obj) = nested_misc.as_object() {
                for (key, value) in nested_obj {
                    if key != "$schema" {
                        misc_source.insert(key.clone(), value.clone());
                    }
                }
            }
        }

        // Then add top-level non-standard fields
        for (key, value) in obj {
            if key == "agents" || key == "categories" || key == "misc" || key == "$schema" {
                continue;
            }
            misc_source.insert(key.clone(), value.clone());
        }
    }

    misc_source
}

/// Normalize agent config from raw value.
fn normalize_agent_config(raw: &Value, _errors: &mut Vec<ConfigFieldError>) -> Option<AgentConfig> {
    if !raw.is_object() {
        return None;
    }

    let raw_obj = raw.as_object().unwrap();
    let mut config: HashMap<String, Value> = HashMap::new();

    for key in AGENT_MANAGED_FIELDS {
        if let Some(value) = raw_obj.get(*key) {
            if *key == "variant" {
                if let Some(variant_str) = value.as_str() {
                    if variant_str != "low" && variant_str != "medium" && variant_str != "high" && variant_str != "xhigh" && variant_str != "max" {
                        continue;
                    }
                }
            }
            if *key == "temperature" {
                if let Some(temp) = value.as_f64() {
                    if temp < 0.0 || temp > 1.0 {
                        continue;
                    }
                }
            }
            config.insert(key.to_string(), value.clone());
        }
    }

    serde_json::from_value(Value::Object(config.into_iter().collect())).ok()
}

/// Normalize category config from raw value.
fn normalize_category_config(
    raw: &Value,
    _errors: &mut Vec<ConfigFieldError>,
) -> Option<CategoryConfig> {
    if !raw.is_object() {
        return None;
    }

    let raw_obj = raw.as_object().unwrap();
    let mut config: HashMap<String, Value> = HashMap::new();

    for key in CATEGORY_MANAGED_FIELDS {
        if let Some(value) = raw_obj.get(*key) {
            if *key == "variant" {
                if let Some(variant_str) = value.as_str() {
                    if variant_str != "low" && variant_str != "medium" && variant_str != "high" && variant_str != "xhigh" && variant_str != "max" {
                        continue;
                    }
                }
            }
            if *key == "temperature" {
                if let Some(temp) = value.as_f64() {
                    if temp < 0.0 || temp > 1.0 {
                        continue;
                    }
                }
            }
            config.insert(key.to_string(), value.clone());
        }
    }

    serde_json::from_value(Value::Object(config.into_iter().collect())).ok()
}

/// Normalize misc config from raw value.
fn normalize_misc_config(raw: &Value) -> MiscConfig {
    raw.as_object()
        .map(|raw_obj| {
            raw_obj
                .iter()
                .filter(|(key, _)| key.as_str() != "$schema")
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect()
        })
        .unwrap_or_default()
}

/// Build baseline config from opencode.jsonc data.
fn build_baseline(opencode_data: &Value, errors: &mut Vec<ConfigFieldError>) -> BaselineConfig {
    let mut agents: IndexMap<String, AgentConfig> = IndexMap::new();
    let mut categories: IndexMap<String, CategoryConfig> = IndexMap::new();

    if let Some(obj) = opencode_data.as_object() {
        // Process agents
        if let Some(agents_obj) = obj.get("agents") {
            if let Some(agents_map) = agents_obj.as_object() {
                for (agent_name, raw_agent) in agents_map {
                    if agent_name == "$schema" {
                        continue;
                    }
                    if let Some(normalized) = normalize_agent_config(raw_agent, errors) {
                        agents.insert(agent_name.clone(), normalized);
                    }
                }
            }
        }

        // Process categories
        if let Some(categories_obj) = obj.get("categories") {
            if let Some(categories_map) = categories_obj.as_object() {
                for (category_name, raw_category) in categories_map {
                    if category_name == "$schema" {
                        continue;
                    }
                    if let Some(normalized) = normalize_category_config(raw_category, errors) {
                        categories.insert(category_name.clone(), normalized);
                    }
                }
            }
        }
    }

    let misc_source = get_misc_source(opencode_data);
    let misc = if misc_source.is_empty() {
        MiscConfig::new()
    } else {
        normalize_misc_config(&Value::Object(misc_source.into_iter().collect()))
    };

    BaselineConfig {
        agents,
        categories,
        misc,
    }
}

/// Build editable config from oh-my-openagent.jsonc data.
fn build_editable(oh_my_data: &Value, errors: &mut Vec<ConfigFieldError>) -> EditableConfig {
    let mut agents: IndexMap<String, Option<AgentConfig>> = IndexMap::new();
    let mut categories: IndexMap<String, Option<CategoryConfig>> = IndexMap::new();

    if let Some(obj) = oh_my_data.as_object() {
        // Process agents
        if let Some(agents_obj) = obj.get("agents") {
            if let Some(agents_map) = agents_obj.as_object() {
                for (agent_name, raw_agent) in agents_map {
                    if agent_name == "$schema" {
                        continue;
                    }
                    // null indicates deletion intent
                    if raw_agent.is_null() {
                        agents.insert(agent_name.clone(), None);
                    } else if let Some(normalized) = normalize_agent_config(raw_agent, errors) {
                        agents.insert(agent_name.clone(), Some(normalized));
                    }
                }
            }
        }

        // Process categories
        if let Some(categories_obj) = obj.get("categories") {
            if let Some(categories_map) = categories_obj.as_object() {
                for (category_name, raw_category) in categories_map {
                    if category_name == "$schema" {
                        continue;
                    }
                    if raw_category.is_null() {
                        categories.insert(category_name.clone(), None);
                    } else if let Some(normalized) = normalize_category_config(raw_category, errors)
                    {
                        categories.insert(category_name.clone(), Some(normalized));
                    }
                }
            }
        }
    }

    let misc_source = get_misc_source(oh_my_data);
    let misc = if misc_source.is_empty() {
        None
    } else {
        Some(normalize_misc_config(&Value::Object(
            misc_source.into_iter().collect(),
        )))
    };

    EditableConfig {
        agents,
        categories,
        misc,
    }
}

/// Extract readonly tail from oh-my-openagent.jsonc (unrecognized fields).
fn extract_readonly_tail(oh_my_data: &Value) -> ReadonlyTailConfig {
    let mut extra: HashMap<String, Value> = HashMap::new();

    if let Some(obj) = oh_my_data.as_object() {
        for (key, value) in obj {
            if key == "agents" || key == "categories" || key == "misc" || key == "$schema" {
                continue;
            }
            extra.insert(key.clone(), value.clone());
        }
    }

    ReadonlyTailConfig { extra }
}

/// Merge baseline and editable to create effective config.
fn merge_effective(baseline: &BaselineConfig, editable: &EditableConfig) -> EffectiveConfig {
    // Start with baseline
    let mut agents: IndexMap<String, AgentConfig> = baseline.agents.clone();
    let mut categories: IndexMap<String, CategoryConfig> = baseline.categories.clone();
    let mut misc: MiscConfig = baseline.misc.clone();

    // Apply editable overrides for agents
    for (agent_name, editable_agent) in &editable.agents {
        match editable_agent {
            Some(config) => {
                // Merge with baseline if exists
                if let Some(baseline_agent) = agents.get(agent_name) {
                    // Merge fields - editable overrides baseline
                    let merged = merge_agent_configs(baseline_agent, config);
                    agents.insert(agent_name.clone(), merged);
                } else {
                    // New agent
                    let mut next = config.clone();
                    if matches!(next.ultrawork, UltraworkField::Disabled) {
                        next.ultrawork = UltraworkField::Missing;
                    }
                    agents.insert(agent_name.clone(), next);
                }
            }
            None => {
                // null indicates deletion - remove from effective
                agents.shift_remove(agent_name);
            }
        }
    }

    // Apply editable overrides for categories
    for (category_name, editable_category) in &editable.categories {
        match editable_category {
            Some(config) => {
                if let Some(baseline_category) = categories.get(category_name) {
                    let merged = merge_category_configs(baseline_category, config);
                    categories.insert(category_name.clone(), merged);
                } else {
                    categories.insert(category_name.clone(), config.clone());
                }
            }
            None => {
                categories.shift_remove(category_name);
            }
        }
    }

    // Apply misc overrides
    if let Some(editable_misc) = &editable.misc {
        for (key, value) in editable_misc {
            if value.is_null() {
                misc.remove(key);
            } else {
                misc.insert(key.clone(), value.clone());
            }
        }
    }

    EffectiveConfig {
        agents,
        categories,
        misc,
    }
}

/// Merge two agent configs (editable overrides baseline).
fn merge_agent_configs(baseline: &AgentConfig, editable: &AgentConfig) -> AgentConfig {
    AgentConfig {
        model: editable.model.clone().or(baseline.model.clone()),
        variant: editable.variant.clone().or(baseline.variant.clone()),
        temperature: editable.temperature.or(baseline.temperature),
        prompt_append: editable
            .prompt_append
            .clone()
            .or(baseline.prompt_append.clone()),
        fallback_models: editable
            .fallback_models
            .clone()
            .or(baseline.fallback_models.clone()),
        ultrawork: match &editable.ultrawork {
            UltraworkField::Config(_) => editable.ultrawork.clone(),
            UltraworkField::Disabled => UltraworkField::Missing,
            UltraworkField::Missing => baseline.ultrawork.clone(),
        },
        max_tokens: editable.max_tokens.or(baseline.max_tokens),
        category: editable.category.clone().or(baseline.category.clone()),
    }
}

/// Merge two category configs.
fn merge_category_configs(baseline: &CategoryConfig, editable: &CategoryConfig) -> CategoryConfig {
    CategoryConfig {
        model: editable.model.clone().or(baseline.model.clone()),
        variant: editable.variant.clone().or(baseline.variant.clone()),
        temperature: editable.temperature.or(baseline.temperature),
        description: editable
            .description
            .clone()
            .or(baseline.description.clone()),
        prompt_append: editable
            .prompt_append
            .clone()
            .or(baseline.prompt_append.clone()),
        fallback_models: editable
            .fallback_models
            .clone()
            .or(baseline.fallback_models.clone()),
    }
}

/// Get disabled providers for a profile from global config.
fn get_disabled_providers(global_config: &Value, profile_id: &str) -> Vec<String> {
    if let Some(obj) = global_config.as_object() {
        if let Some(dp_obj) = obj.get("disabled_providers") {
            if let Some(dp_map) = dp_obj.as_object() {
                if let Some(arr) = dp_map.get(profile_id) {
                    if let Some(providers) = arr.as_array() {
                        return providers
                            .iter()
                            .filter_map(|v| v.as_str().map(|s| s.to_string()))
                            .collect();
                    }
                }
            }
        }
    }
    Vec::new()
}

/// Read global config and extract config_path.
fn read_global_config_with_root(paths: &AppPaths) -> Result<(Value, Option<String>), AppError> {
    let config_value = read_jsonc_file(&paths.config_file)?;
    let config_path = config_value
        .get("config_path")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());
    Ok((config_value, config_path))
}

fn is_regular_file(path: &Path) -> Result<bool, AppError> {
    let meta = match fs::metadata(path) {
        Ok(meta) => meta,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(e) => {
            return Err(AppError::ScanError(format!(
                "Failed to get metadata for {}: {}",
                path.display(),
                e
            )))
        }
    };

    #[cfg(unix)]
    if meta.file_type().is_symlink() {
        return Ok(false);
    }

    Ok(meta.is_file())
}

fn profile_location_from_dir(profile_dir: &Path) -> Result<Option<ProfileLocation>, AppError> {
    let opencode_path = profile_dir.join("opencode.jsonc");
    if !is_regular_file(&opencode_path)? {
        return Ok(None);
    }

    let Some(folder_name) = profile_dir.file_name().and_then(|name| name.to_str()) else {
        return Ok(None);
    };

    if folder_name.starts_with('.') {
        return Ok(None);
    }

    Ok(Some(ProfileLocation {
        id: folder_name.to_string(),
        label: folder_name.to_string(),
        dir: profile_dir.to_path_buf(),
        opencode_path,
        oh_my_path: profile_dir.join("oh-my-openagent.jsonc"),
    }))
}

fn scan_profile_locations_in_root(profiles_root: &Path) -> Result<Vec<ProfileLocation>, AppError> {
    let entries = fs::read_dir(profiles_root).map_err(|e| {
        AppError::ScanError(format!(
            "Failed to read profiles directory {}: {}",
            profiles_root.display(),
            e
        ))
    })?;

    let mut profiles: Vec<ProfileLocation> = Vec::new();

    for entry in entries {
        let entry = entry
            .map_err(|e| AppError::ScanError(format!("Failed to read directory entry: {}", e)))?;

        let entry_type = entry
            .file_type()
            .map_err(|e| AppError::ScanError(format!("Failed to get file type: {}", e)))?;

        // Skip non-directories
        if !entry_type.is_dir() {
            continue;
        }

        let folder_name = entry.file_name().to_string_lossy().to_string();

        if folder_name.starts_with('.') {
            continue;
        }

        let profile_dir = profiles_root.join(&folder_name);

        let profile_dir_meta = fs::metadata(&profile_dir).map_err(|e| {
            AppError::ScanError(format!(
                "Failed to get metadata for {}: {}",
                profile_dir.display(),
                e
            ))
        })?;

        #[cfg(unix)]
        if profile_dir_meta.file_type().is_symlink() {
            continue;
        }

        if let Some(profile) = profile_location_from_dir(&profile_dir)? {
            profiles.push(profile);
        }
    }

    profiles.sort_by(|a, b| compare_folder_name(&a.id, &b.id));

    Ok(profiles)
}

fn scan_profile_locations_in_path(path: &Path) -> Result<Vec<ProfileLocation>, AppError> {
    if let Some(profile) = profile_location_from_dir(path)? {
        return Ok(vec![profile]);
    }

    scan_profile_locations_in_root(path)
}

fn config_path_entries(global_config: &Value) -> Vec<String> {
    global_config
        .get("config_path")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect::<Vec<_>>()
        })
        .filter(|entries| !entries.is_empty())
        .unwrap_or_else(|| vec!["".to_string()])
}

fn scan_profile_locations_from_config(
    paths: &AppPaths,
    global_config: &Value,
) -> Result<Vec<ProfileLocation>, AppError> {
    let mut profiles = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    for entry in config_path_entries(global_config) {
        let resolved_path = paths.resolve_profiles_root(Some(&entry));
        for profile in scan_profile_locations_in_path(&resolved_path)? {
            if seen_ids.insert(profile.id.clone()) {
                profiles.push(profile);
            }
        }
    }

    profiles.sort_by(|a, b| compare_folder_name(&a.id, &b.id));
    Ok(profiles)
}

/// Internal scan profiles function (without Tauri dependency).
fn scan_profiles_internal(profiles_root: &Path) -> Result<Vec<ProfileItem>, AppError> {
    Ok(scan_profile_locations_in_root(profiles_root)?
        .into_iter()
        .map(|profile| ProfileItem {
            id: profile.id,
            label: profile.label,
        })
        .collect())
}

/// Internal get profile function (without Tauri dependency).
fn get_profile_internal(
    paths: &AppPaths,
    profile_id: &str,
) -> Result<ProfileConfigResult, AppError> {
    // Read global config to get config_path and providers
    let (global_config, config_path) = read_global_config_with_root(paths)?;
    let profile = if config_path.is_some() {
        scan_profile_locations_from_config(paths, &global_config)?
            .into_iter()
            .find(|profile| profile.id == profile_id)
    } else {
        let profiles_root = paths.resolve_profiles_root(None);
        profile_location_from_dir(&profiles_root.join(profile_id))?
    };

    let Some(profile) = profile else {
        return Err(AppError::NotFound(format!(
            "Profile '{}' does not exist or is missing opencode.jsonc",
            profile_id
        )));
    };

    // Read mtime
    let mtime = get_mtime_ms(&profile.oh_my_path);

    // Read config files
    let opencode_data = read_jsonc_file(&profile.opencode_path)?;
    let oh_my_data = read_jsonc_file(&profile.oh_my_path)?;

    // Build configs
    let mut errors: Vec<ConfigFieldError> = Vec::new();
    let baseline = build_baseline(&opencode_data, &mut errors);
    let editable = build_editable(&oh_my_data, &mut errors);
    let readonly_tail = extract_readonly_tail(&oh_my_data);
    let effective = merge_effective(&baseline, &editable);

    // Extract models from global providers
    let global_models = if let Some(providers) = global_config.get("providers") {
        extract_provider_models(providers)
    } else {
        Vec::new()
    };
    let opencode_models = if let Some(providers) = opencode_data.get("provider") {
        extract_provider_models(providers)
    } else {
        Vec::new()
    };
    let oh_my_models = if let Some(providers) = oh_my_data.get("provider") {
        extract_provider_models(providers)
    } else {
        Vec::new()
    };

    // Extract models referenced by agents/categories in oh-my-openagent.jsonc
    let referenced_models = extract_referenced_models(&oh_my_data);

    // Get disabled providers
    let disabled_providers = get_disabled_providers(&global_config, profile_id);

    // Filter and sort available models
    let merged_models = merge_available_models(&[
        global_models,
        opencode_models,
        oh_my_models,
        referenced_models,
    ]);
    let provider_catalog = build_provider_catalog(&merged_models);
    let filtered_models = filter_models_by_disabled_providers(&merged_models, &disabled_providers);
    let mut available_models: Vec<String> = filtered_models;
    available_models.sort();

    let available_model_groups = group_models_by_provider(&available_models);

    // Raw misc from oh-my-openagent
    let raw_misc = get_misc_source(&oh_my_data);

    Ok(ProfileConfigResult {
        baseline,
        editable,
        readonly_tail,
        effective,
        raw_misc,
        available_models,
        available_model_groups,
        disabled_providers,
        provider_catalog,
        mtime,
        errors,
    })
}

/// Save profile config with mtime conflict check.
fn save_profile_internal<T: Serialize>(
    paths: &AppPaths,
    profile_id: &str,
    payload: &T,
    expected_mtime: u64,
) -> Result<SaveProfileResponse, AppError> {
    let (global_config, config_path) = read_global_config_with_root(paths)?;
    let profile = if config_path.is_some() {
        scan_profile_locations_from_config(paths, &global_config)?
            .into_iter()
            .find(|profile| profile.id == profile_id)
    } else {
        let profiles_root = paths.resolve_profiles_root(None);
        profile_location_from_dir(&profiles_root.join(profile_id))?
    };

    let Some(profile) = profile else {
        return Err(AppError::NotFound(format!(
            "Profile '{}' does not exist or is missing opencode.jsonc",
            profile_id
        )));
    };

    let current_mtime = get_mtime_ms(&profile.oh_my_path);
    if expected_mtime != 0 && current_mtime != expected_mtime {
        return Err(AppError::Conflict(
            "File was modified externally. Please reload.".to_string(),
        ));
    }

    let existing_content = if profile.oh_my_path.exists() {
        fs::read_to_string(&profile.oh_my_path).map_err(|e| {
            AppError::ReadError(format!(
                "Failed to read {}: {}",
                profile.oh_my_path.display(),
                e
            ))
        })?
    } else {
        "{}".to_string()
    };

    let mut payload_value = serde_json::to_value(payload)
        .map_err(|e| AppError::WriteError(format!("Failed to serialize config: {}", e)))?;

    filter_managed_fields(&mut payload_value);

    let existing_value = jsonc_read(&existing_content)?;

    // Lossless JSONC modification: preserve comments and unmanaged keys
    let mut content = existing_content;

    if let Some(payload_agents) = payload_value.get("agents").and_then(|v| v.as_object()) {
        let existing_agent_ids: Vec<String> = existing_value
            .get("agents")
            .and_then(|v| v.as_object())
            .map(|obj| obj.keys().cloned().collect())
            .unwrap_or_default();

        let payload_agent_ids: Vec<String> = payload_agents.keys().cloned().collect();

        let all_agent_ids: Vec<&String> = existing_agent_ids
            .iter()
            .chain(payload_agent_ids.iter())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        for agent_id in all_agent_ids {
            let agent_payload = payload_agents.get(agent_id);

            if agent_payload == Some(&Value::Null) {
                content = jsonc_modify(&content, &["agents", agent_id], None)?;
                continue;
            }

            let existing_agent_fields: std::collections::HashSet<String> = existing_value
                .get("agents")
                .and_then(|v| v.as_object())
                .and_then(|obj| obj.get(agent_id))
                .and_then(|v| v.as_object())
                .map(|obj| obj.keys().cloned().collect())
                .unwrap_or_default();

            for field in AGENT_MANAGED_FIELDS {
                let path = ["agents", agent_id.as_str(), *field];

                if let Some(agent_obj) = agent_payload.and_then(|v| v.as_object()) {
                    if agent_obj.contains_key(*field) {
                        let field_value = agent_obj.get(*field).unwrap();
                        content = jsonc_modify(&content, &path, Some(field_value))?;
                    } else if existing_agent_fields.contains(*field) {
                        content = jsonc_modify(&content, &path, None)?;
                    }
                } else if existing_agent_fields.contains(*field) {
                    content = jsonc_modify(&content, &path, None)?;
                }
            }
        }
    }

    if let Some(payload_categories) = payload_value.get("categories").and_then(|v| v.as_object()) {
        let existing_category_ids: Vec<String> = existing_value
            .get("categories")
            .and_then(|v| v.as_object())
            .map(|obj| obj.keys().cloned().collect())
            .unwrap_or_default();

        let payload_category_ids: Vec<String> = payload_categories.keys().cloned().collect();

        let all_category_ids: Vec<&String> = existing_category_ids
            .iter()
            .chain(payload_category_ids.iter())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        for category_id in all_category_ids {
            let category_payload = payload_categories.get(category_id);

            if category_payload == Some(&Value::Null) {
                content = jsonc_modify(&content, &["categories", category_id], None)?;
                continue;
            }

            let existing_category_fields: std::collections::HashSet<String> = existing_value
                .get("categories")
                .and_then(|v| v.as_object())
                .and_then(|obj| obj.get(category_id))
                .and_then(|v| v.as_object())
                .map(|obj| obj.keys().cloned().collect())
                .unwrap_or_default();

            for field in CATEGORY_MANAGED_FIELDS {
                let path = ["categories", category_id.as_str(), *field];

                if let Some(category_obj) = category_payload.and_then(|v| v.as_object()) {
                    if category_obj.contains_key(*field) {
                        let field_value = category_obj.get(*field).unwrap();
                        content = jsonc_modify(&content, &path, Some(field_value))?;
                    } else if existing_category_fields.contains(*field) {
                        content = jsonc_modify(&content, &path, None)?;
                    }
                } else if existing_category_fields.contains(*field) {
                    content = jsonc_modify(&content, &path, None)?;
                }
            }
        }
    }

    if let Some(payload_misc) = payload_value.get("misc").and_then(|v| v.as_object()) {
        for (section_name, section_value) in payload_misc {
            let section_path = if existing_value.get(section_name).is_some() {
                vec![section_name.clone()]
            } else {
                vec!["misc".to_string(), section_name.clone()]
            };

            let path_refs: Vec<&str> = section_path.iter().map(|s| s.as_str()).collect();
            content = jsonc_modify(&content, &path_refs, Some(section_value))?;
        }
    }

    write_jsonc_file(&profile.oh_my_path, &content)?;

    let new_mtime = get_mtime_ms(&profile.oh_my_path);

    Ok(SaveProfileResponse {
        success: true,
        mtime: Some(new_mtime),
    })
}

/// Update disabled providers for a profile.
fn update_disabled_providers_internal(
    paths: &AppPaths,
    profile_id: &str,
    disabled_providers: &[String],
) -> Result<ProfileConfigResult, AppError> {
    // Read current global config content
    let existing_content = if paths.config_file.exists() {
        fs::read_to_string(&paths.config_file).map_err(|e| {
            AppError::ReadError(format!(
                "Failed to read {}: {}",
                paths.config_file.display(),
                e
            ))
        })?
    } else {
        "{}".to_string()
    };

    // Build the array value
    let arr_value: Value = Value::Array(
        disabled_providers
            .iter()
            .map(|s| Value::String(s.clone()))
            .collect(),
    );

    // Modify using jsonc_modify for lossless edit
    let modified = jsonc_modify(
        &existing_content,
        &["disabled_providers", profile_id],
        Some(&arr_value),
    )?;

    // Write back
    write_jsonc_file(&paths.config_file, &modified)?;

    // Re-read and return updated profile config
    get_profile_internal(paths, profile_id)
}

/// Copy profile to new target.
fn copy_profile_internal(
    paths: &AppPaths,
    source_id: &str,
    target_id: &str,
) -> Result<CopyProfileResponse, AppError> {
    // Validate target ID
    if !validate_target_id(target_id) {
        return Err(AppError::ValidationError(format!(
            "Invalid target id '{}'. Must match ^[a-z0-9][a-z0-9-_]*$",
            target_id
        )));
    }

    // Read global config to get config_path
    let (global_config, config_path) = read_global_config_with_root(paths)?;
    let source = if config_path.is_some() {
        scan_profile_locations_from_config(paths, &global_config)?
            .into_iter()
            .find(|profile| profile.id == source_id)
    } else {
        let profiles_root = paths.resolve_profiles_root(None);
        profile_location_from_dir(&profiles_root.join(source_id))?
    };

    let Some(source) = source else {
        return Err(AppError::NotFound(format!(
            "Source profile '{}' does not exist or is missing opencode.jsonc",
            source_id
        )));
    };

    let target_root = source
        .dir
        .parent()
        .map(|path| path.to_path_buf())
        .unwrap_or_else(|| paths.profiles_dir.clone());
    let target_dir = target_root.join(target_id);

    // Check target doesn't exist
    if target_dir.exists() {
        return Err(AppError::Conflict(format!(
            "Profile '{}' already exists",
            target_id
        )));
    }

    // Create target directory
    fs::create_dir_all(&target_dir).map_err(|e| {
        AppError::CopyError(format!(
            "Failed to create target directory {}: {}",
            target_dir.display(),
            e
        ))
    })?;

    // Copy opencode.jsonc
    let target_opencode = target_dir.join("opencode.jsonc");
    fs::copy(&source.opencode_path, &target_opencode)
        .map_err(|e| AppError::CopyError(format!("Failed to copy opencode.jsonc: {}", e)))?;

    // Copy oh-my-openagent.jsonc if exists, else create empty
    let target_oh_my = target_dir.join("oh-my-openagent.jsonc");

    if source.oh_my_path.exists() {
        fs::copy(&source.oh_my_path, &target_oh_my).map_err(|e| {
            AppError::CopyError(format!("Failed to copy oh-my-openagent.jsonc: {}", e))
        })?;
    } else {
        // Write empty JSON
        let mut file = fs::File::create(&target_oh_my).map_err(|e| {
            AppError::CopyError(format!(
                "Failed to create {}: {}",
                target_oh_my.display(),
                e
            ))
        })?;
        file.write_all("{}\n".as_bytes()).map_err(|e| {
            AppError::CopyError(format!("Failed to write {}: {}", target_oh_my.display(), e))
        })?;
    }

    Ok(CopyProfileResponse {
        profile: ProfileItem {
            id: target_id.to_string(),
            label: target_id.to_string(),
        },
    })
}

// ============================================================================
// Tauri Commands
// ============================================================================

async fn run_profile_task<T, F>(task: F) -> Result<T, AppError>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, AppError> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|e| AppError::ReadError(format!("Background profile task failed: {}", e)))?
}

/// List all profiles in the profiles directory.
#[tauri::command]
pub async fn list_profiles(app_handle: tauri::AppHandle) -> Result<ListProfilesResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;

    run_profile_task(move || {
        // Read global config to get config_path
        let (global_config, config_path) = read_global_config_with_root(&paths)?;
        let profiles = if config_path.is_some() {
            scan_profile_locations_from_config(&paths, &global_config)?
                .into_iter()
                .map(|profile| ProfileItem {
                    id: profile.id,
                    label: profile.label,
                })
                .collect()
        } else {
            scan_profiles_internal(&paths.profiles_dir)?
        };

        Ok(ListProfilesResponse { profiles })
    })
    .await
}

/// Get profile configuration details.
#[tauri::command]
pub async fn get_profile(
    app_handle: tauri::AppHandle,
    profile_id: String,
) -> Result<ProfileConfigResult, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_profile_task(move || get_profile_internal(&paths, &profile_id)).await
}

/// Save profile configuration with mtime conflict check.
#[tauri::command]
pub async fn save_profile(
    app_handle: tauri::AppHandle,
    request: SaveProfileRequest,
) -> Result<SaveProfileResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_profile_task(move || {
        save_profile_internal(
            &paths,
            &request.profile_id,
            &request.payload,
            request.expected_mtime,
        )
    })
    .await
}

/// Update disabled providers for a profile.
#[tauri::command]
pub async fn update_disabled_providers(
    app_handle: tauri::AppHandle,
    request: UpdateDisabledProvidersRequest,
) -> Result<ProfileConfigResult, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_profile_task(move || {
        update_disabled_providers_internal(&paths, &request.profile_id, &request.disabled_providers)
    })
    .await
}

/// Copy a profile to a new target ID.
#[tauri::command]
pub async fn copy_profile(
    app_handle: tauri::AppHandle,
    request: CopyProfileRequest,
) -> Result<CopyProfileResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_profile_task(move || copy_profile_internal(&paths, &request.source_id, &request.target_id))
        .await
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    fn create_test_paths(temp: &TempDir) -> AppPaths {
        AppPaths::from_dirs(
            temp.path().join("config/config.jsonc"),
            temp.path().join("profiles"),
            temp.path().join("logs"),
        )
    }

    fn create_profile(
        profiles_root: &Path,
        id: &str,
        opencode_content: &str,
        oh_my_content: Option<&str>,
    ) {
        let profile_dir = profiles_root.join(id);
        fs::create_dir_all(&profile_dir).unwrap();
        fs::write(profile_dir.join("opencode.jsonc"), opencode_content).unwrap();
        if let Some(content) = oh_my_content {
            fs::write(profile_dir.join("oh-my-openagent.jsonc"), content).unwrap();
        }
    }

    fn create_global_config(config_file: &Path, providers_content: Option<&str>) {
        let parent = config_file.parent().unwrap();
        fs::create_dir_all(parent).unwrap();

        let providers = providers_content.unwrap_or(
            r#"{
      "anthropic": {
        "models": ["claude-opus-4-5", "claude-sonnet-4-5"]
      },
      "openai": {
        "models": ["gpt-4o"]
      }
    }"#,
        );

        let content = format!(
            r#" {{
    "config_path": [""],
    "log_path": "",
    "providers": {},
    "ui_preferences": {{
      "sync_replace_enabled": true
    }},
    "default_profile": null,
    "disabled_providers": {}
  }}"#,
            providers, "{}"
        );

        fs::write(config_file, content).unwrap();
    }

    #[test]
    fn test_compare_folder_name_case_insensitive() {
        // Tie-break: original case comparison (ASCII ordering)
        assert_eq!(
            compare_folder_name("abc", "ABC"),
            std::cmp::Ordering::Greater
        );
        assert_eq!(compare_folder_name("ABC", "abc"), std::cmp::Ordering::Less);
        assert_eq!(compare_folder_name("Abc", "Abc"), std::cmp::Ordering::Equal);
        // Different names: case-insensitive comparison first
        assert_eq!(
            compare_folder_name("default", "work"),
            std::cmp::Ordering::Less
        );
    }

    #[test]
    fn test_validate_target_id_valid() {
        assert!(validate_target_id("abc"));
        assert!(validate_target_id("a123"));
        assert!(validate_target_id("abc-123"));
        assert!(validate_target_id("abc_123"));
        assert!(validate_target_id("my-profile-2024"));
    }

    #[test]
    fn test_validate_target_id_invalid() {
        assert!(!validate_target_id(""));
        assert!(!validate_target_id("Abc")); // uppercase first
        assert!(!validate_target_id("-abc")); // starts with hyphen
        assert!(!validate_target_id("_abc")); // starts with underscore
        assert!(!validate_target_id("ABC")); // uppercase
        assert!(!validate_target_id("abc def")); // space
        assert!(!validate_target_id("abc@123")); // special char
    }

    #[test]
    fn test_list_profiles_empty_dir() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let result = scan_profiles_internal(&profiles_root).unwrap();
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_list_profiles_one_profile() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(
            &profiles_root,
            "default",
            r#"{ "agents": { "build": { "model": "test" } } }"#,
            Some("{}"),
        );

        let result = scan_profiles_internal(&profiles_root).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "default");
        assert_eq!(result[0].label, "default");
    }

    #[test]
    fn test_config_path_can_point_to_multiple_profile_dirs() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);
        let external_root = temp.path().join("external");
        let omo_dir = external_root.join("omo");
        let omor_dir = external_root.join("omor");

        create_profile(
            &external_root,
            "omo",
            r#"{ "provider": { "local": { "models": { "m1": {} } } } }"#,
            Some(
                r#"{ "agents": { "sisyphus": { "model": "local/m1" } }, "categories": { "quick": { "model": "local/m1" } } }"#,
            ),
        );
        create_profile(&external_root, "omor", r#"{ "agents": {} }"#, Some("{}"));

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(
            &paths.config_file,
            format!(
                r#"{{"config_path": ["{}", "{}"], "providers": {{}}}}"#,
                omo_dir.display(),
                omor_dir.display()
            ),
        )
        .unwrap();

        let global_config = read_jsonc_file(&paths.config_file).unwrap();
        let profiles = scan_profile_locations_from_config(&paths, &global_config).unwrap();
        assert_eq!(
            profiles.iter().map(|p| p.id.as_str()).collect::<Vec<_>>(),
            vec!["omo", "omor"]
        );

        let result = get_profile_internal(&paths, "omo").unwrap();
        assert!(result.effective.agents.contains_key("sisyphus"));
        assert!(result.effective.categories.contains_key("quick"));
        assert!(result.available_models.contains(&"local/m1".to_string()));
    }

    #[test]
    fn test_list_profiles_skips_dirs_without_opencode() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        // Valid profile
        create_profile(&profiles_root, "valid", r#"{ "agents": {} }"#, Some("{}"));

        // Invalid - no opencode.jsonc
        let invalid_dir = profiles_root.join("invalid");
        fs::create_dir_all(&invalid_dir).unwrap();

        let result = scan_profiles_internal(&profiles_root).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "valid");
    }

    #[test]
    fn test_list_profiles_skips_dot_dirs() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        // Valid profile
        create_profile(&profiles_root, "visible", r#"{ "agents": {} }"#, Some("{}"));

        // Hidden dir (should be skipped)
        create_profile(&profiles_root, ".hidden", r#"{ "agents": {} }"#, Some("{}"));

        let result = scan_profiles_internal(&profiles_root).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "visible");
    }

    #[test]
    fn test_list_profiles_sorting() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        // Create profiles in non-alphabetical order
        for name in &["work", "default", "test", "Alpha"] {
            create_profile(&profiles_root, name, r#"{ "agents": {} }"#, Some("{}"));
        }

        let result = scan_profiles_internal(&profiles_root).unwrap();
        assert_eq!(result.len(), 4);

        // Should be sorted case-insensitive: Alpha, default, test, work
        assert_eq!(result[0].id, "Alpha");
        assert_eq!(result[1].id, "default");
        assert_eq!(result[2].id, "test");
        assert_eq!(result[3].id, "work");
    }

    #[test]
    fn test_get_profile_baseline_and_editable() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let opencode = r#"{ 
      "agents": { 
        "build": { "model": "baseline-model", "variant": "low" } 
      },
      "categories": {
        "quick": { "model": "baseline-quick" }
      }
    }"#;

        let oh_my = r#"{ 
      "agents": { 
        "build": { "model": "editable-model" } 
      }
    }"#;

        create_profile(&profiles_root, "test", opencode, Some(oh_my));

        let result = get_profile_internal(&paths, "test").unwrap();

        // Baseline should have baseline values
        assert_eq!(
            result.baseline.agents.get("build").unwrap().model,
            Some("baseline-model".to_string())
        );

        // Editable should have editable values
        assert_eq!(
            result
                .editable
                .agents
                .get("build")
                .unwrap()
                .as_ref()
                .unwrap()
                .model,
            Some("editable-model".to_string())
        );

        // Effective should merge (editable overrides baseline)
        assert_eq!(
            result.effective.agents.get("build").unwrap().model,
            Some("editable-model".to_string())
        );
        assert_eq!(
            result.effective.agents.get("build").unwrap().variant,
            Some("low".to_string())
        ); // inherited from baseline
    }

    #[test]
    fn test_get_profile_ultrawork_null_disables_baseline() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(
            &profiles_root,
            "test",
            r#"{
      "agents": {
        "sisyphus": {
          "model": "anthropic/claude",
          "ultrawork": { "model": "openai/gpt-5", "variant": "medium" }
        }
      }
    }"#,
            Some(
                r#"{
      "agents": {
        "sisyphus": {
          "ultrawork": null
        }
      }
    }"#,
            ),
        );

        let result = get_profile_internal(&paths, "test").unwrap();
        let editable = result
            .editable
            .agents
            .get("sisyphus")
            .and_then(|agent| agent.as_ref())
            .unwrap();
        let effective = result.effective.agents.get("sisyphus").unwrap();

        assert!(matches!(editable.ultrawork, UltraworkField::Disabled));
        assert!(matches!(effective.ultrawork, UltraworkField::Missing));
    }

    #[test]
    fn test_get_profile_preserves_agent_and_category_order() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let opencode = r#"{
      "agents": {
        "baseline-beta": { "model": "baseline-beta-model" },
        "baseline-alpha": { "model": "baseline-alpha-model" }
      },
      "categories": {
        "baseline-visual": { "model": "baseline-visual-model" },
        "baseline-deep": { "model": "baseline-deep-model" }
      }
    }"#;

        let oh_my = r#"{
      "agents": {
        "editable-zeta": { "model": "editable-zeta-model" },
        "editable-alpha": { "model": "editable-alpha-model" }
      },
      "categories": {
        "editable-quick": { "model": "editable-quick-model" },
        "editable-review": { "model": "editable-review-model" }
      }
    }"#;

        create_profile(&profiles_root, "test", opencode, Some(oh_my));

        let result = get_profile_internal(&paths, "test").unwrap();

        assert_eq!(
            result
                .baseline
                .agents
                .keys()
                .map(|key| key.as_str())
                .collect::<Vec<_>>(),
            vec!["baseline-beta", "baseline-alpha"]
        );
        assert_eq!(
            result
                .editable
                .agents
                .keys()
                .map(|key| key.as_str())
                .collect::<Vec<_>>(),
            vec!["editable-zeta", "editable-alpha"]
        );
        assert_eq!(
            result
                .effective
                .agents
                .keys()
                .map(|key| key.as_str())
                .collect::<Vec<_>>(),
            vec![
                "baseline-beta",
                "baseline-alpha",
                "editable-zeta",
                "editable-alpha"
            ]
        );
        assert_eq!(
            result
                .effective
                .categories
                .keys()
                .map(|key| key.as_str())
                .collect::<Vec<_>>(),
            vec![
                "baseline-visual",
                "baseline-deep",
                "editable-quick",
                "editable-review"
            ]
        );

        let serialized = serde_json::to_value(&result).unwrap();
        let serialized_agents = serialized
            .get("effective")
            .and_then(|effective| effective.get("agents"))
            .and_then(|agents| agents.as_object())
            .unwrap();
        assert_eq!(
            serialized_agents
                .keys()
                .map(|key| key.as_str())
                .collect::<Vec<_>>(),
            vec![
                "baseline-beta",
                "baseline-alpha",
                "editable-zeta",
                "editable-alpha"
            ]
        );
    }

    #[test]
    fn test_get_profile_missing_oh_my_returns_empty_editable() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let opencode = r#"{ "agents": { "build": { "model": "test" } } }"#;

        create_profile(&profiles_root, "test", opencode, None);

        let result = get_profile_internal(&paths, "test").unwrap();

        // Editable should be empty
        assert!(result.editable.agents.is_empty());
        assert!(result.editable.categories.is_empty());

        // mtime should be 0 for missing file
        assert_eq!(result.mtime, 0);

        // Effective equals baseline
        assert_eq!(
            result.effective.agents.get("build").unwrap().model,
            Some("test".to_string())
        );
    }

    #[test]
    fn test_get_profile_disabled_providers() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        // Global config with disabled providers for this profile
        let global = r#"{
      "config_path": [""],
      "providers": {
        "anthropic": { "models": ["claude-opus"] },
        "openai": { "models": ["gpt-4o"] },
        "google": { "models": ["gemini"] }
      },
      "disabled_providers": {
        "test-profile": ["openai"]
      }
    }"#;
        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, global).unwrap();

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(
            &profiles_root,
            "test-profile",
            r#"{ "agents": {} }"#,
            Some("{}"),
        );

        let result = get_profile_internal(&paths, "test-profile").unwrap();

        // Disabled providers should be extracted
        assert_eq!(result.disabled_providers, vec!["openai"]);

        // Available models should filter out openai
        assert!(!result
            .available_models
            .iter()
            .any(|m| m.starts_with("openai/")));
        assert!(result
            .available_models
            .iter()
            .any(|m| m.starts_with("anthropic/")));
        assert!(result
            .available_models
            .iter()
            .any(|m| m.starts_with("google/")));
    }

    #[test]
    fn test_get_profile_not_found() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let result = get_profile_internal(&paths, "nonexistent");
        assert!(result.is_err());
        match result {
            Err(AppError::NotFound(_)) => (),
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_save_profile_happy_path() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(&profiles_root, "test", r#"{ "agents": {} }"#, Some("{}"));

        // Get current mtime
        let oh_my_path = profiles_root.join("test/oh-my-openagent.jsonc");
        let current_mtime = get_mtime_ms(&oh_my_path);

        // Save with matching mtime
        let payload = EditableConfig {
            agents: IndexMap::new(),
            categories: IndexMap::new(),
            misc: None,
        };

        let result = save_profile_internal(&paths, "test", &payload, current_mtime).unwrap();
        assert!(result.success);
        assert!(result.mtime.is_some());
        assert!(result.mtime.unwrap() >= current_mtime);
    }

    #[test]
    fn test_save_profile_mtime_conflict() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(&profiles_root, "test", r#"{ "agents": {} }"#, Some("{}"));

        // Use an obviously stale mtime (1000 ms from epoch) that won't match actual file
        let stale_mtime = 1000;

        let payload = EditableConfig {
            agents: IndexMap::new(),
            categories: IndexMap::new(),
            misc: None,
        };

        let result = save_profile_internal(&paths, "test", &payload, stale_mtime);
        assert!(result.is_err());
        match result {
            Err(AppError::Conflict(_)) => (),
            _ => panic!("Expected Conflict error"),
        }
    }

    #[test]
    fn test_save_profile_zero_mtime_allowed() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(
            &profiles_root,
            "test",
            r#"{ "agents": {} }"#,
            None, // No oh-my file yet
        );

        // Save with mtime=0 (file doesn't exist)
        let payload = EditableConfig {
            agents: IndexMap::new(),
            categories: IndexMap::new(),
            misc: None,
        };

        let result = save_profile_internal(&paths, "test", &payload, 0).unwrap();
        assert!(result.success);

        // Check file was created
        let oh_my_path = profiles_root.join("test/oh-my-openagent.jsonc");
        assert!(oh_my_path.exists());
    }

    #[test]
    fn test_update_disabled_providers_writes_global_config() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        // Create global config with providers
        let global = r#"{
      "config_path": [""],
      "providers": {
        "anthropic": { "models": ["claude"] }
      },
      "disabled_providers": {}
    }"#;
        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, global).unwrap();

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(&profiles_root, "test", r#"{ "agents": {} }"#, Some("{}"));

        // Update disabled providers
        let disabled = vec!["anthropic".to_string()];
        let result = update_disabled_providers_internal(&paths, "test", &disabled).unwrap();

        // Check result has disabled providers
        assert_eq!(result.disabled_providers, vec!["anthropic"]);

        // Check available models filtered
        assert!(result.available_models.is_empty());

        // Verify global config was updated
        let config_content = fs::read_to_string(&paths.config_file).unwrap();
        assert!(config_content.contains("\"test\""));
        assert!(config_content.contains("\"anthropic\""));
    }

    #[test]
    fn test_copy_profile_happy_path() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let opencode = r#"{ "agents": { "build": { "model": "original" } } }"#;
        let oh_my = r#"{ "agents": { "build": { "variant": "high" } } }"#;

        create_profile(&profiles_root, "source", opencode, Some(oh_my));

        let result = copy_profile_internal(&paths, "source", "target-copy").unwrap();

        assert_eq!(result.profile.id, "target-copy");
        assert_eq!(result.profile.label, "target-copy");

        // Check target files exist
        let target_dir = profiles_root.join("target-copy");
        assert!(target_dir.join("opencode.jsonc").exists());
        assert!(target_dir.join("oh-my-openagent.jsonc").exists());

        // Check content matches
        let target_opencode = fs::read_to_string(target_dir.join("opencode.jsonc")).unwrap();
        assert!(target_opencode.contains("original"));
    }

    #[test]
    fn test_copy_profile_invalid_target_id() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(&profiles_root, "source", r#"{ "agents": {} }"#, Some("{}"));

        // Invalid target (uppercase)
        let result = copy_profile_internal(&paths, "source", "InvalidId");
        assert!(result.is_err());
        match result {
            Err(AppError::ValidationError(msg)) => {
                assert!(msg.contains("Invalid target id"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[test]
    fn test_copy_profile_source_missing() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let result = copy_profile_internal(&paths, "nonexistent", "target");
        assert!(result.is_err());
        match result {
            Err(AppError::NotFound(msg)) => {
                assert!(msg.contains("does not exist"));
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_copy_profile_target_exists() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        create_profile(&profiles_root, "source", r#"{ "agents": {} }"#, Some("{}"));
        create_profile(
            &profiles_root,
            "existing",
            r#"{ "agents": {} }"#,
            Some("{}"),
        );

        let result = copy_profile_internal(&paths, "source", "existing");
        assert!(result.is_err());
        match result {
            Err(AppError::Conflict(msg)) => {
                assert!(msg.contains("already exists"));
            }
            _ => panic!("Expected Conflict error"),
        }
    }

    #[test]
    fn test_split_model_id() {
        let (provider, model) = split_model_id("anthropic/claude-opus");
        assert_eq!(provider, "anthropic");
        assert_eq!(model, "claude-opus");

        let (provider, model) = split_model_id("no-slash-id");
        assert_eq!(provider, "Unknown");
        assert_eq!(model, "no-slash-id");
    }

    #[test]
    fn test_build_provider_catalog() {
        let models = vec![
            "anthropic/a".to_string(),
            "openai/b".to_string(),
            "anthropic/c".to_string(), // duplicate provider
        ];

        let catalog = build_provider_catalog(&models);
        assert_eq!(catalog, vec!["anthropic", "openai"]);
    }

    #[test]
    fn test_filter_models_by_disabled_providers() {
        let models = vec![
            "anthropic/a".to_string(),
            "openai/b".to_string(),
            "google/c".to_string(),
        ];

        let disabled = vec!["openai".to_string()];
        let filtered = filter_models_by_disabled_providers(&models, &disabled);

        assert_eq!(filtered.len(), 2);
        assert!(filtered.iter().any(|m| m.starts_with("anthropic")));
        assert!(filtered.iter().any(|m| m.starts_with("google")));
        assert!(!filtered.iter().any(|m| m.starts_with("openai")));
    }

    #[test]
    fn test_group_models_by_provider() {
        let models = vec![
            "anthropic/claude-opus".to_string(),
            "anthropic/claude-sonnet".to_string(),
            "openai/gpt-4o".to_string(),
        ];

        let groups = group_models_by_provider(&models);
        assert_eq!(groups.len(), 2);

        // Sorted by provider name
        assert_eq!(groups[0].provider, "anthropic");
        assert_eq!(groups[0].models.len(), 2);
        assert_eq!(groups[1].provider, "openai");
        assert_eq!(groups[1].models.len(), 1);
    }

    #[test]
    fn test_get_mtime_ms_file_exists() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("test.json");
        fs::write(&file_path, "{}").unwrap();

        let mtime = get_mtime_ms(&file_path);
        assert!(mtime > 0);
    }

    #[test]
    fn test_get_mtime_ms_file_missing() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("nonexistent.json");

        let mtime = get_mtime_ms(&file_path);
        assert_eq!(mtime, 0);
    }

    #[test]
    fn test_filter_removes_model_null() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "model": null,
                    "variant": "high"
                }
            },
            "categories": {}
        });
        filter_managed_fields(&mut payload);
        assert!(!payload["agents"]["build"]
            .as_object()
            .unwrap()
            .contains_key("model"));
        assert!(payload["agents"]["build"]["variant"] == "high");
    }

    #[test]
    fn test_filter_removes_variant_empty_string() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "variant": "",
                    "model": "gpt-4"
                }
            },
            "categories": {}
        });
        filter_managed_fields(&mut payload);
        assert!(!payload["agents"]["build"]
            .as_object()
            .unwrap()
            .contains_key("variant"));
        assert!(payload["agents"]["build"]["model"] == "gpt-4");
    }

    #[test]
    fn test_filter_removes_temperature_zero() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "temperature": 0
                }
            },
            "categories": {
                "quick": {
                    "temperature": 0.0
                }
            }
        });
        filter_managed_fields(&mut payload);
        assert!(!payload["agents"]["build"]
            .as_object()
            .unwrap()
            .contains_key("temperature"));
        assert!(!payload["categories"]["quick"]
            .as_object()
            .unwrap()
            .contains_key("temperature"));
    }

    #[test]
    fn test_filter_removes_fallback_models_empty_array() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "fallback_models": []
                }
            },
            "categories": {
                "default": {
                    "fallback_models": []
                }
            }
        });
        filter_managed_fields(&mut payload);
        assert!(!payload["agents"]["build"]
            .as_object()
            .unwrap()
            .contains_key("fallback_models"));
        assert!(!payload["categories"]["default"]
            .as_object()
            .unwrap()
            .contains_key("fallback_models"));
    }

    #[test]
    fn test_filter_keeps_non_empty_model() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "model": "gpt-4"
                }
            },
            "categories": {
                "quick": {
                    "model": "claude-opus"
                }
            }
        });
        filter_managed_fields(&mut payload);
        assert!(payload["agents"]["build"]["model"] == "gpt-4");
        assert!(payload["categories"]["quick"]["model"] == "claude-opus");
    }

    #[test]
    fn test_filter_keeps_non_zero_temperature() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "temperature": 0.7
                }
            },
            "categories": {
                "default": {
                    "temperature": 1.2
                }
            }
        });
        filter_managed_fields(&mut payload);
        assert!(payload["agents"]["build"]["temperature"] == 0.7);
        assert!(payload["categories"]["default"]["temperature"] == 1.2);
    }

    #[test]
    fn test_filter_keeps_non_empty_fallback_models() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "fallback_models": ["gpt-3.5", "gpt-4"]
                }
            },
            "categories": {
                "default": {
                    "fallback_models": ["claude-sonnet"]
                }
            }
        });
        filter_managed_fields(&mut payload);
        let arr = payload["agents"]["build"]["fallback_models"]
            .as_array()
            .unwrap();
        assert_eq!(arr.len(), 2);
        assert_eq!(arr[0], "gpt-3.5");
    }

    #[test]
    fn test_filter_preserves_unmanaged_keys() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "model": null,
                    "custom_setting": "value",
                    "another_key": 42
                }
            },
            "categories": {
                "quick": {
                    "variant": "",
                    "custom_field": true
                }
            }
        });
        filter_managed_fields(&mut payload);
        assert!(payload["agents"]["build"]["custom_setting"] == "value");
        assert!(payload["agents"]["build"]["another_key"] == 42);
        assert!(payload["categories"]["quick"]["custom_field"] == true);
        assert!(!payload["agents"]["build"]
            .as_object()
            .unwrap()
            .contains_key("model"));
        assert!(!payload["categories"]["quick"]
            .as_object()
            .unwrap()
            .contains_key("variant"));
    }

    #[test]
    fn test_filter_combines_all_omit_cases() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "model": null,
                    "variant": "",
                    "temperature": 0,
                    "fallback_models": [],
                    "prompt_append": null,
                    "maxTokens": null,
                    "category": null,
                    "ultrawork": null
                }
            },
            "categories": {
                "default": {
                    "model": null,
                    "variant": "",
                    "temperature": 0,
                    "description": "",
                    "fallback_models": [],
                    "prompt_append": null
                }
            }
        });
        filter_managed_fields(&mut payload);
        assert_eq!(payload["agents"]["build"].as_object().unwrap().len(), 0);
        assert_eq!(
            payload["categories"]["default"].as_object().unwrap().len(),
            0
        );
    }

    #[test]
    fn test_filter_keeps_all_non_default_values() {
        let mut payload = json!({
            "agents": {
                "build": {
                    "model": "claude-opus",
                    "variant": "high",
                    "temperature": 0.5,
                    "fallback_models": ["gpt-4"],
                    "prompt_append": "some text",
                    "maxTokens": 4000,
                    "category": "quick",
                    "ultrawork": { "model": "gpt-4" }
                }
            },
            "categories": {
                "default": {
                    "model": "gpt-4o",
                    "variant": "low",
                    "temperature": 0.2,
                    "description": "Default category",
                    "fallback_models": ["claude"],
                    "prompt_append": "append text"
                }
            }
        });
        filter_managed_fields(&mut payload);
        assert_eq!(payload["agents"]["build"].as_object().unwrap().len(), 8);
        assert_eq!(
            payload["categories"]["default"].as_object().unwrap().len(),
            6
        );
    }

    #[test]
    fn test_save_profile_preserves_jsonc_comments() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let initial_content = r#"{
  // Profile configuration
  "agents": {
    // Build agent settings
    "build": {
      "model": "old-model",
      "variant": "low"
    }
  },
  "categories": {
    /* Quick category */
    "quick": {
      "model": "fast-model"
    }
  }
}"#;
        create_profile(
            &profiles_root,
            "test",
            r#"{ "agents": {} }"#,
            Some(initial_content),
        );

        let oh_my_path = profiles_root.join("test/oh-my-openagent.jsonc");
        let current_mtime = get_mtime_ms(&oh_my_path);

        let mut agents = IndexMap::new();
        agents.insert(
            "build".to_string(),
            Some(AgentConfig {
                model: Some("new-model".to_string()),
                variant: Some("high".to_string()),
                temperature: None,
                prompt_append: None,
                fallback_models: None,
                ultrawork: UltraworkField::Missing,
                max_tokens: None,
                category: None,
            }),
        );

        let mut categories = IndexMap::new();
        categories.insert(
            "quick".to_string(),
            Some(CategoryConfig {
                model: Some("fast-model".to_string()),
                variant: None,
                temperature: None,
                description: None,
                prompt_append: None,
                fallback_models: None,
            }),
        );

        let payload = EditableConfig {
            agents,
            categories,
            misc: None,
        };

        save_profile_internal(&paths, "test", &payload, current_mtime).unwrap();

        let saved_content = fs::read_to_string(&oh_my_path).unwrap();

        assert!(saved_content.contains("// Profile configuration"));
        assert!(saved_content.contains("// Build agent settings"));
        assert!(saved_content.contains("/* Quick category */"));
        assert!(saved_content.contains("\"model\": \"new-model\""));
        assert!(saved_content.contains("\"variant\": \"high\""));
        assert!(!saved_content.contains("\"model\": \"old-model\""));
        assert!(!saved_content.contains("\"variant\": \"low\""));
    }

    #[test]
    fn test_save_profile_omits_empty_ultrawork_prompt_append() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let initial_content = r#"{
  "agents": {
    "sisyphus": {
      "ultrawork": {
        "model": "old-model",
        "variant": "low"
      }
    }
  }
}"#;
        create_profile(
            &profiles_root,
            "test",
            r#"{ "agents": {} }"#,
            Some(initial_content),
        );

        let oh_my_path = profiles_root.join("test/oh-my-openagent.jsonc");
        let current_mtime = get_mtime_ms(&oh_my_path);

        let mut agents = IndexMap::new();
        agents.insert(
            "sisyphus".to_string(),
            Some(AgentConfig {
                model: None,
                variant: None,
                temperature: None,
                prompt_append: None,
                fallback_models: None,
                ultrawork: UltraworkField::Config(crate::contracts::UltraworkConfig {
                    model: Some("new-model".to_string()),
                    variant: Some("medium".to_string()),
                    prompt_append: None,
                }),
                max_tokens: None,
                category: None,
            }),
        );

        let payload = EditableConfig {
            agents,
            categories: IndexMap::new(),
            misc: None,
        };

        save_profile_internal(&paths, "test", &payload, current_mtime).unwrap();

        let saved_content = fs::read_to_string(&oh_my_path).unwrap();
        let saved_value = jsonc_read(&saved_content).unwrap();
        let ultrawork = saved_value
            .get("agents")
            .and_then(|agents| agents.get("sisyphus"))
            .and_then(|agent| agent.get("ultrawork"))
            .and_then(|value| value.as_object())
            .unwrap();

        assert_eq!(ultrawork.get("model").unwrap(), "new-model");
        assert_eq!(ultrawork.get("variant").unwrap(), "medium");
        assert!(!ultrawork.contains_key("prompt_append"));
        assert!(!saved_content.contains("\"prompt_append\": null"));
    }

    #[test]
    fn test_save_profile_omits_ultrawork_null_disable() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let initial_content = r#"{
  "agents": {
    "sisyphus": {
      "model": "anthropic/claude",
      "ultrawork": {
        "model": "old-model",
        "variant": "low"
      }
    }
  }
}"#;
        create_profile(
            &profiles_root,
            "test",
            r#"{ "agents": {} }"#,
            Some(initial_content),
        );

        let oh_my_path = profiles_root.join("test/oh-my-openagent.jsonc");
        let current_mtime = get_mtime_ms(&oh_my_path);
        let payload = json!({
            "agents": {
                "sisyphus": {
                    "model": "anthropic/claude",
                    "ultrawork": null
                }
            },
            "categories": {},
            "misc": {}
        });

        save_profile_internal(&paths, "test", &payload, current_mtime).unwrap();

        let saved_content = fs::read_to_string(&oh_my_path).unwrap();
        let saved_value = jsonc_read(&saved_content).unwrap();

        let saved_agent = saved_value["agents"]["sisyphus"].as_object().unwrap();
        assert!(!saved_agent.contains_key("ultrawork"));
        assert!(!saved_content.contains("\"ultrawork\": null"));
    }

    #[test]
    fn test_save_profile_removes_blank_default_fields() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let initial_content = r#"{
  "agents": {
    "build": {
      "model": null,
      "variant": "",
      "temperature": 0,
      "fallback_models": []
    }
  },
  "categories": {
    "quick": {
      "variant": "",
      "temperature": 0
    }
  }
}"#;
        create_profile(
            &profiles_root,
            "test",
            r#"{ "agents": {} }"#,
            Some(initial_content),
        );

        let oh_my_path = profiles_root.join("test/oh-my-openagent.jsonc");
        let current_mtime = get_mtime_ms(&oh_my_path);

        let mut agents = IndexMap::new();
        agents.insert(
            "build".to_string(),
            Some(AgentConfig {
                model: None,
                variant: None,
                temperature: None,
                prompt_append: None,
                fallback_models: None,
                ultrawork: UltraworkField::Missing,
                max_tokens: None,
                category: None,
            }),
        );

        let mut categories = IndexMap::new();
        categories.insert(
            "quick".to_string(),
            Some(CategoryConfig {
                model: None,
                variant: None,
                temperature: None,
                description: None,
                prompt_append: None,
                fallback_models: None,
            }),
        );

        let payload = EditableConfig {
            agents,
            categories,
            misc: None,
        };

        save_profile_internal(&paths, "test", &payload, current_mtime).unwrap();

        let saved_content = fs::read_to_string(&oh_my_path).unwrap();
        let saved_value = jsonc_read(&saved_content).unwrap();

        let build_agent = saved_value
            .get("agents")
            .and_then(|a| a.get("build"))
            .unwrap();
        assert!(!build_agent.as_object().unwrap().contains_key("model"));
        assert!(!build_agent.as_object().unwrap().contains_key("variant"));
        assert!(!build_agent.as_object().unwrap().contains_key("temperature"));
        assert!(!build_agent
            .as_object()
            .unwrap()
            .contains_key("fallback_models"));

        let quick_category = saved_value
            .get("categories")
            .and_then(|c| c.get("quick"))
            .unwrap();
        assert!(!quick_category.as_object().unwrap().contains_key("variant"));
        assert!(!quick_category
            .as_object()
            .unwrap()
            .contains_key("temperature"));
    }

    #[test]
    fn test_save_profile_preserves_unmanaged_keys() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        create_global_config(&paths.config_file, None);

        let profiles_root = paths.resolve_profiles_root(None);
        fs::create_dir_all(&profiles_root).unwrap();

        let initial_content = r#"{
  "agents": {
    "build": {
      "model": "gpt-4",
      "custom_setting": "value",
      "another_key": 42
    }
  },
  "categories": {
    "quick": {
      "model": "claude",
      "custom_field": true
    }
  }
}"#;
        create_profile(
            &profiles_root,
            "test",
            r#"{ "agents": {} }"#,
            Some(initial_content),
        );

        let oh_my_path = profiles_root.join("test/oh-my-openagent.jsonc");
        let current_mtime = get_mtime_ms(&oh_my_path);

        let mut agents = IndexMap::new();
        agents.insert(
            "build".to_string(),
            Some(AgentConfig {
                model: Some("gpt-5".to_string()),
                variant: None,
                temperature: None,
                prompt_append: None,
                fallback_models: None,
                ultrawork: UltraworkField::Missing,
                max_tokens: None,
                category: None,
            }),
        );

        let mut categories = IndexMap::new();
        categories.insert(
            "quick".to_string(),
            Some(CategoryConfig {
                model: Some("claude-opus".to_string()),
                variant: None,
                temperature: None,
                description: None,
                prompt_append: None,
                fallback_models: None,
            }),
        );

        let payload = EditableConfig {
            agents,
            categories,
            misc: None,
        };

        save_profile_internal(&paths, "test", &payload, current_mtime).unwrap();

        let saved_content = fs::read_to_string(&oh_my_path).unwrap();
        let saved_value = jsonc_read(&saved_content).unwrap();

        let build_agent = saved_value
            .get("agents")
            .and_then(|a| a.get("build"))
            .unwrap();
        assert!(build_agent
            .as_object()
            .unwrap()
            .contains_key("custom_setting"));
        assert!(build_agent.as_object().unwrap().contains_key("another_key"));
        assert_eq!(build_agent.get("custom_setting").unwrap(), "value");
        assert_eq!(build_agent.get("another_key").unwrap(), 42);
        assert_eq!(build_agent.get("model").unwrap(), "gpt-5");

        let quick_category = saved_value
            .get("categories")
            .and_then(|c| c.get("quick"))
            .unwrap();
        assert!(quick_category
            .as_object()
            .unwrap()
            .contains_key("custom_field"));
        assert_eq!(quick_category.get("custom_field").unwrap(), true);
        assert_eq!(quick_category.get("model").unwrap(), "claude-opus");
    }
}
