//! Global config and error log commands for Tauri app.

use crate::contracts::{
    CreateModelRequest, CreateProviderRequest, DeleteResponse, ErrorLogsResponse,
    GlobalConfigResponse, ProviderModelResponse, ProvidersListResponse, UpdateGlobalConfigRequest,
    UpdateGlobalConfigResponse, UpdateModelRequest,
};
use crate::errors::AppError;
use crate::jsonc_edit::{jsonc_modify, read_jsonc_file, write_jsonc_file};
use crate::paths::AppPaths;
use serde_json::Value;
use std::fs;

const DEFAULT_APP_ZOOM_PERCENT: u16 = 100;
const MIN_APP_ZOOM_PERCENT: u16 = 50;
const MAX_APP_ZOOM_PERCENT: u16 = 200;
const APP_ZOOM_STEP_PERCENT: u16 = 5;

fn read_app_zoom_percent(config: &Value) -> u16 {
    config
        .get("ui_preferences")
        .and_then(|ui| ui.get("zoom_percent"))
        .and_then(|v| v.as_u64())
        .and_then(|value| u16::try_from(value).ok())
        .filter(|value| {
            *value >= MIN_APP_ZOOM_PERCENT
                && *value <= MAX_APP_ZOOM_PERCENT
                && *value % APP_ZOOM_STEP_PERCENT == 0
        })
        .unwrap_or(DEFAULT_APP_ZOOM_PERCENT)
}

fn get_global_config_impl(paths: &AppPaths) -> Result<GlobalConfigResponse, AppError> {
    let config = match read_jsonc_file(&paths.config_file) {
        Ok(v) => v,
        Err(AppError::InvalidJson(e)) => {
            return Err(AppError::ReadError(format!(
                "Failed to parse config file: {}",
                e
            )));
        }
        Err(e) => return Err(e),
    };

    let sync_replace_enabled = config
        .get("ui_preferences")
        .and_then(|ui| ui.get("sync_replace_enabled"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let default_profile = config
        .get("default_profile")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(GlobalConfigResponse {
        sync_replace_enabled,
        app_zoom_percent: read_app_zoom_percent(&config),
        default_profile,
    })
}

fn list_profile_ids_in_dir(profiles_dir: &std::path::Path) -> Result<Vec<String>, AppError> {
    if !profiles_dir.exists() {
        return Ok(Vec::new());
    }

    if profiles_dir.join("opencode.jsonc").is_file() {
        return Ok(profiles_dir
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| vec![name.to_string()])
            .unwrap_or_default());
    }

    let entries = fs::read_dir(profiles_dir).map_err(|e| {
        AppError::ScanError(format!(
            "Failed to read profiles directory {}: {}",
            profiles_dir.display(),
            e
        ))
    })?;

    let mut ids: Vec<String> = Vec::new();

    for entry in entries {
        let entry = entry
            .map_err(|e| AppError::ScanError(format!("Failed to read directory entry: {}", e)))?;

        let entry_type = entry
            .file_type()
            .map_err(|e| AppError::ScanError(format!("Failed to get file type: {}", e)))?;

        if !entry_type.is_dir() {
            continue;
        }

        let folder_name = entry.file_name().to_string_lossy().to_string();

        if folder_name.starts_with('.') {
            continue;
        }

        ids.push(folder_name);
    }

    Ok(ids)
}

fn update_global_config_impl(
    paths: &AppPaths,
    request: UpdateGlobalConfigRequest,
) -> Result<UpdateGlobalConfigResponse, AppError> {
    if request.sync_replace_enabled.is_none()
        && request.app_zoom_percent.is_none()
        && request.default_profile.is_none()
    {
        return Err(AppError::ValidationError(
            "At least one field must be provided".to_string(),
        ));
    }

    if let Some(zoom_percent) = request.app_zoom_percent {
        if !(MIN_APP_ZOOM_PERCENT..=MAX_APP_ZOOM_PERCENT).contains(&zoom_percent)
            || zoom_percent % APP_ZOOM_STEP_PERCENT != 0
        {
            return Err(AppError::ValidationError(format!(
                "appZoomPercent must be between {} and {} in {}% increments",
                MIN_APP_ZOOM_PERCENT, MAX_APP_ZOOM_PERCENT, APP_ZOOM_STEP_PERCENT
            )));
        }
    }

    let mut content = if paths.config_file.exists() {
        fs::read_to_string(&paths.config_file).unwrap_or_else(|_| "{}".to_string())
    } else {
        "{}".to_string()
    };

    let mut result = UpdateGlobalConfigResponse {
        sync_replace_enabled: None,
        app_zoom_percent: None,
        default_profile: None,
    };

    if let Some(enabled) = request.sync_replace_enabled {
        let val = Value::Bool(enabled);
        content = jsonc_modify(
            &content,
            &["ui_preferences", "sync_replace_enabled"],
            Some(&val),
        )
        .map_err(|e| AppError::WriteError(e.message()))?;
        result.sync_replace_enabled = Some(enabled);
    }

    if let Some(zoom_percent) = request.app_zoom_percent {
        let val = Value::Number(serde_json::Number::from(zoom_percent));
        content = jsonc_modify(&content, &["ui_preferences", "zoom_percent"], Some(&val))
            .map_err(|e| AppError::WriteError(e.message()))?;
        result.app_zoom_percent = Some(zoom_percent);
    }

    if let Some(new_default) = request.default_profile {
        if let Some(id) = &new_default {
            let config_value = read_jsonc_file(&paths.config_file)
                .unwrap_or_else(|_| Value::Object(serde_json::Map::new()));
            let config_paths = config_value
                .get("config_path")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
                .filter(|entries| !entries.is_empty())
                .unwrap_or_else(|| vec![""]);
            let mut profile_ids = Vec::new();
            for config_path in config_paths {
                let profiles_root = paths.resolve_profiles_root(Some(config_path));
                profile_ids.extend(list_profile_ids_in_dir(&profiles_root)?);
            }
            if !profile_ids.iter().any(|p| p == id) {
                return Err(AppError::ProfileNotFound(format!(
                    "Profile \"{}\" does not exist",
                    id
                )));
            }
        }

        let val = match &new_default {
            None => Value::Null,
            Some(id) => Value::String(id.clone()),
        };
        content = jsonc_modify(&content, &["default_profile"], Some(&val))
            .map_err(|e| AppError::WriteError(e.message()))?;
        result.default_profile = Some(new_default);
    }

    write_jsonc_file(&paths.config_file, &content)
        .map_err(|e| AppError::WriteError(e.message()))?;

    Ok(result)
}

fn get_error_logs_impl(paths: &AppPaths) -> ErrorLogsResponse {
    let log_file = paths.log_dir.join("omo-switch.error.log");

    let content = match fs::read_to_string(&log_file) {
        Ok(c) => c,
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                return ErrorLogsResponse {
                    entries: vec![],
                    source_file: "omo-switch.error.log".to_string(),
                    truncated: false,
                    read_error: None,
                };
            }
            return ErrorLogsResponse {
                entries: vec![],
                source_file: "omo-switch.error.log".to_string(),
                truncated: false,
                read_error: Some(format!("Failed to read error log: {}", e)),
            };
        }
    };

    let all_lines: Vec<&str> = content.lines().filter(|l| !l.is_empty()).collect();

    let total_count = all_lines.len();
    let truncated = total_count >= 20;

    let entries: Vec<String> = if total_count <= 20 {
        all_lines.iter().rev().map(|s| s.to_string()).collect()
    } else {
        all_lines
            .iter()
            .skip(total_count - 20)
            .rev()
            .map(|s| s.to_string())
            .collect()
    };

    ErrorLogsResponse {
        entries,
        source_file: "omo-switch.error.log".to_string(),
        truncated,
        read_error: None,
    }
}

fn validate_provider_name(name: &str) -> Result<(), AppError> {
    if name.is_empty() {
        return Err(AppError::ValidationError(
            "Provider name cannot be empty".to_string(),
        ));
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err(AppError::ValidationError(
            "Provider name must contain only lowercase letters, digits, and hyphens".to_string(),
        ));
    }
    Ok(())
}

fn validate_model_name(name: &str) -> Result<(), AppError> {
    if name.is_empty() {
        return Err(AppError::ValidationError(
            "Model name cannot be empty".to_string(),
        ));
    }
    if name.contains('/') {
        return Err(AppError::ValidationError(
            "Model name cannot contain '/'".to_string(),
        ));
    }
    Ok(())
}

fn get_providers_impl(paths: &AppPaths) -> Result<ProvidersListResponse, AppError> {
    let config = read_jsonc_file(&paths.config_file)?;

    let providers = config
        .get("providers")
        .and_then(|v| {
            if v.is_object() {
                Some(
                    v.as_object()
                        .unwrap()
                        .iter()
                        .map(|(provider_name, provider_value)| {
                            let provider_models = if let Some(models_array) = provider_value.as_array() {
                                models_array
                                    .iter()
                                    .filter_map(|model_value| model_value.as_str().map(String::from))
                                    .collect()
                            } else {
                                Vec::new()
                            };
                            (provider_name.clone(), provider_models)
                        })
                        .collect(),
                )
            } else {
                None
            }
        })
        .unwrap_or_else(|| std::collections::HashMap::new());

    Ok(ProvidersListResponse { providers })
}

fn create_provider_impl(
    paths: &AppPaths,
    request: CreateProviderRequest,
) -> Result<ProviderModelResponse, AppError> {
    validate_provider_name(&request.name)?;

    let config = read_jsonc_file(&paths.config_file)?;
    if config
        .get("providers")
        .and_then(|p| p.get(&request.name))
        .is_some()
    {
        return Err(AppError::ValidationError(format!(
            "Provider '{}' already exists",
            request.name
        )));
    }

    let mut content = if paths.config_file.exists() {
        fs::read_to_string(&paths.config_file).unwrap_or_else(|_| "{}".to_string())
    } else {
        "{}".to_string()
    };

    content = jsonc_modify(
        &content,
        &["providers", &request.name],
        Some(&Value::Array(Vec::new())),
    )
    .map_err(|e| AppError::WriteError(e.message()))?;

    write_jsonc_file(&paths.config_file, &content)
        .map_err(|e| AppError::WriteError(e.message()))?;

    Ok(ProviderModelResponse { success: true })
}

fn create_model_impl(
    paths: &AppPaths,
    provider_name: String,
    request: CreateModelRequest,
) -> Result<ProviderModelResponse, AppError> {
    validate_provider_name(&provider_name)?;
    validate_model_name(&request.name)?;

    let config = read_jsonc_file(&paths.config_file)?;
    let provider = config
        .get("providers")
        .and_then(|p| p.get(&provider_name));

    let mut models = match provider {
        Some(Value::Array(items)) => items
            .iter()
            .filter_map(|item| item.as_str().map(String::from))
            .collect::<Vec<_>>(),
        Some(_) => {
            return Err(AppError::ValidationError(format!(
                "Provider '{}' must be an array of model names",
                provider_name
            )));
        }
        None => Vec::new(),
    };

    if models.iter().any(|model| model == &request.name) {
        return Err(AppError::ValidationError(format!(
            "Model '{}' already exists under provider '{}'",
            request.name, provider_name
        )));
    }
    models.push(request.name);

    let mut content = if paths.config_file.exists() {
        fs::read_to_string(&paths.config_file).unwrap_or_else(|_| "{}".to_string())
    } else {
        "{}".to_string()
    };

    content = jsonc_modify(
        &content,
        &["providers", &provider_name],
        Some(&Value::Array(models.into_iter().map(Value::String).collect())),
    )
    .map_err(|e| AppError::WriteError(e.message()))?;

    write_jsonc_file(&paths.config_file, &content)
        .map_err(|e| AppError::WriteError(e.message()))?;

    Ok(ProviderModelResponse { success: true })
}

fn update_model_impl(
    paths: &AppPaths,
    provider_name: String,
    model_name: String,
    request: UpdateModelRequest,
) -> Result<ProviderModelResponse, AppError> {
    validate_provider_name(&provider_name)?;
    validate_model_name(&model_name)?;

    let config = read_jsonc_file(&paths.config_file)?;
    let provider = config
        .get("providers")
        .and_then(|p| p.get(&provider_name));

    let Some(Value::Array(models)) = provider else {
        return Err(AppError::ValidationError(format!(
            "Provider '{}' must be an array of model names",
            provider_name
        )));
    };

    if !models.iter().any(|model| model.as_str() == Some(&model_name)) {
        return Err(AppError::ValidationError(format!(
            "Model '{}' does not exist under provider '{}'",
            model_name, provider_name
        )));
    }

    let _ = request;
    Err(AppError::ValidationError(
        "Array-format providers do not support per-model configuration updates".to_string(),
    ))
}

fn delete_model_impl(
    paths: &AppPaths,
    provider_name: String,
    model_name: String,
) -> Result<DeleteResponse, AppError> {
    validate_provider_name(&provider_name)?;
    validate_model_name(&model_name)?;

    let config = read_jsonc_file(&paths.config_file)?;
    let provider = config
        .get("providers")
        .and_then(|p| p.get(&provider_name));

    let Some(Value::Array(models)) = provider else {
        return Ok(DeleteResponse { success: true });
    };

    let next_models = models
        .iter()
        .filter_map(|item| item.as_str())
        .filter(|item| *item != model_name)
        .map(|item| Value::String(item.to_string()))
        .collect::<Vec<_>>();

    let mut content = if paths.config_file.exists() {
        fs::read_to_string(&paths.config_file).unwrap_or_else(|_| "{}".to_string())
    } else {
        "{}".to_string()
    };

    content = jsonc_modify(
        &content,
        &["providers", &provider_name],
        Some(&Value::Array(next_models)),
    )
    .map_err(|e| AppError::WriteError(e.message()))?;

    write_jsonc_file(&paths.config_file, &content)
        .map_err(|e| AppError::WriteError(e.message()))?;

    Ok(DeleteResponse { success: true })
}

fn delete_provider_impl(
    paths: &AppPaths,
    provider_name: String,
) -> Result<DeleteResponse, AppError> {
    validate_provider_name(&provider_name)?;

    let mut content = if paths.config_file.exists() {
        fs::read_to_string(&paths.config_file).unwrap_or_else(|_| "{}".to_string())
    } else {
        "{}".to_string()
    };

    content = jsonc_modify(&content, &["providers", &provider_name], None)
        .map_err(|e| AppError::WriteError(e.message()))?;

    write_jsonc_file(&paths.config_file, &content)
        .map_err(|e| AppError::WriteError(e.message()))?;

    Ok(DeleteResponse { success: true })
}

async fn run_config_task<T, F>(task: F) -> Result<T, AppError>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, AppError> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|e| AppError::ReadError(format!("Background config task failed: {}", e)))?
}

#[tauri::command]
pub async fn get_global_config(
    app_handle: tauri::AppHandle,
) -> Result<GlobalConfigResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_config_task(move || get_global_config_impl(&paths)).await
}

#[tauri::command]
pub async fn update_global_config(
    app_handle: tauri::AppHandle,
    request: UpdateGlobalConfigRequest,
) -> Result<UpdateGlobalConfigResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_config_task(move || update_global_config_impl(&paths, request)).await
}

#[tauri::command]
pub async fn get_error_logs(app_handle: tauri::AppHandle) -> ErrorLogsResponse {
    let paths = match AppPaths::from_tauri(&app_handle) {
        Ok(p) => p,
        Err(e) => {
            return ErrorLogsResponse {
                entries: vec![],
                source_file: "omo-switch.error.log".to_string(),
                truncated: false,
                read_error: Some(e.message()),
            };
        }
    };
    match tauri::async_runtime::spawn_blocking(move || get_error_logs_impl(&paths)).await {
        Ok(response) => response,
        Err(e) => ErrorLogsResponse {
            entries: vec![],
            source_file: "omo-switch.error.log".to_string(),
            truncated: false,
            read_error: Some(format!("Background error log task failed: {}", e)),
        },
    }
}

#[tauri::command]
pub async fn get_providers(
    app_handle: tauri::AppHandle,
) -> Result<ProvidersListResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_config_task(move || get_providers_impl(&paths)).await
}

#[tauri::command]
pub async fn create_provider(
    app_handle: tauri::AppHandle,
    request: CreateProviderRequest,
) -> Result<ProviderModelResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_config_task(move || create_provider_impl(&paths, request)).await
}

#[tauri::command]
pub async fn create_model(
    app_handle: tauri::AppHandle,
    provider_name: String,
    request: CreateModelRequest,
) -> Result<ProviderModelResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_config_task(move || create_model_impl(&paths, provider_name, request)).await
}

#[tauri::command]
pub async fn update_model(
    app_handle: tauri::AppHandle,
    provider_name: String,
    model_name: String,
    request: UpdateModelRequest,
) -> Result<ProviderModelResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_config_task(move || update_model_impl(&paths, provider_name, model_name, request)).await
}

#[tauri::command]
pub async fn delete_model(
    app_handle: tauri::AppHandle,
    provider_name: String,
    model_name: String,
) -> Result<DeleteResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_config_task(move || delete_model_impl(&paths, provider_name, model_name)).await
}

#[tauri::command]
pub async fn delete_provider(
    app_handle: tauri::AppHandle,
    provider_name: String,
) -> Result<DeleteResponse, AppError> {
    let paths = AppPaths::from_tauri(&app_handle)?;
    run_config_task(move || delete_provider_impl(&paths, provider_name)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_paths(temp: &TempDir) -> AppPaths {
        AppPaths::from_dirs(
            temp.path().join("config/config.jsonc"),
            temp.path().join("profiles"),
            temp.path().join("logs"),
        )
    }

    fn create_profile(profiles_dir: &std::path::Path, id: &str) {
        let profile_dir = profiles_dir.join(id);
        fs::create_dir_all(&profile_dir).unwrap();
        fs::write(profile_dir.join("opencode.jsonc"), "{}").unwrap();
    }

    #[test]
    fn test_get_global_config_missing_file() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        let result = get_global_config_impl(&paths).unwrap();
        assert_eq!(result.sync_replace_enabled, false);
        assert_eq!(result.app_zoom_percent, 100);
        assert_eq!(result.default_profile, None);
    }

    #[test]
    fn test_get_global_config_with_values() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let content = r#"{
      "ui_preferences": {
        "sync_replace_enabled": true,
        "zoom_percent": 125
      },
      "default_profile": "my-profile"
    }"#;
        fs::write(&paths.config_file, content).unwrap();

        let result = get_global_config_impl(&paths).unwrap();
        assert_eq!(result.sync_replace_enabled, true);
        assert_eq!(result.app_zoom_percent, 125);
        assert_eq!(result.default_profile, Some("my-profile".to_string()));
    }

    #[test]
    fn test_get_global_config_empty_object() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, "{}").unwrap();

        let result = get_global_config_impl(&paths).unwrap();
        assert_eq!(result.sync_replace_enabled, false);
        assert_eq!(result.app_zoom_percent, 100);
        assert_eq!(result.default_profile, None);
    }

    #[test]
    fn test_update_global_config_sync_replace_enabled() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, "{}").unwrap();

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: Some(true),
            app_zoom_percent: None,
            default_profile: None,
        };

        let result = update_global_config_impl(&paths, request).unwrap();
        assert_eq!(result.sync_replace_enabled, Some(true));
        assert_eq!(result.default_profile, None);

        let updated_content = fs::read_to_string(&paths.config_file).unwrap();
        assert!(updated_content.contains("\"sync_replace_enabled\": true"));
    }

    #[test]
    fn test_update_global_config_app_zoom_percent() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, "{}").unwrap();

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: None,
            app_zoom_percent: Some(115),
            default_profile: None,
        };

        let result = update_global_config_impl(&paths, request).unwrap();
        assert_eq!(result.sync_replace_enabled, None);
        assert_eq!(result.app_zoom_percent, Some(115));
        assert_eq!(result.default_profile, None);

        let updated_content = fs::read_to_string(&paths.config_file).unwrap();
        assert!(updated_content.contains("\"zoom_percent\": 115"));
    }

    #[test]
    fn test_update_global_config_rejects_invalid_app_zoom_percent() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: None,
            app_zoom_percent: Some(113),
            default_profile: None,
        };

        let result = update_global_config_impl(&paths, request);
        assert!(result.is_err());
        match result {
            Err(AppError::ValidationError(msg)) => {
                assert!(msg.contains("appZoomPercent"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[test]
    fn test_update_global_config_default_profile_set() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(&paths.profiles_dir).unwrap();
        create_profile(&paths.profiles_dir, "existing-profile");

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, "{}").unwrap();

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: None,
            app_zoom_percent: None,
            default_profile: Some(Some("existing-profile".to_string())),
        };

        let result = update_global_config_impl(&paths, request).unwrap();
        assert_eq!(result.sync_replace_enabled, None);
        assert_eq!(
            result.default_profile,
            Some(Some("existing-profile".to_string()))
        );

        let updated_content = fs::read_to_string(&paths.config_file).unwrap();
        assert!(updated_content.contains("\"default_profile\": \"existing-profile\""));
    }

    #[test]
    fn test_update_global_config_default_profile_clear() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, r#"{ "default_profile": "old" }"#).unwrap();

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: None,
            app_zoom_percent: None,
            default_profile: Some(None),
        };

        let result = update_global_config_impl(&paths, request).unwrap();
        assert_eq!(result.sync_replace_enabled, None);
        assert_eq!(result.default_profile, Some(None));

        let updated_content = fs::read_to_string(&paths.config_file).unwrap();
        assert!(updated_content.contains("\"default_profile\": null"));
    }

    #[test]
    fn test_update_global_config_profile_not_found() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, "{}").unwrap();

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: None,
            app_zoom_percent: None,
            default_profile: Some(Some("nonexistent".to_string())),
        };

        let result = update_global_config_impl(&paths, request);
        assert!(result.is_err());
        match result {
            Err(AppError::ProfileNotFound(msg)) => {
                assert!(msg.contains("nonexistent"));
            }
            _ => panic!("Expected ProfileNotFound error"),
        }
    }

    #[test]
    fn test_update_global_config_default_profile_with_config_path() {
        let temp = TempDir::new().unwrap();
        let custom_profiles_dir = temp.path().join("custom_profiles");
        let paths = AppPaths::from_dirs(
            temp.path().join("config/config.jsonc"),
            temp.path().join("profiles"),
            temp.path().join("logs"),
        );

        fs::create_dir_all(&custom_profiles_dir).unwrap();
        create_profile(&custom_profiles_dir, "custom-profile");

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let config_content = format!(
            r#"{{"config_path": ["{}"]}}"#,
            custom_profiles_dir.display()
        );
        fs::write(&paths.config_file, config_content).unwrap();

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: None,
            app_zoom_percent: None,
            default_profile: Some(Some("custom-profile".to_string())),
        };

        let result = update_global_config_impl(&paths, request).unwrap();
        assert_eq!(
            result.default_profile,
            Some(Some("custom-profile".to_string()))
        );

        let updated_content = fs::read_to_string(&paths.config_file).unwrap();
        assert!(updated_content.contains("\"default_profile\": \"custom-profile\""));
    }

    #[test]
    fn test_update_global_config_default_profile_not_found_with_config_path() {
        let temp = TempDir::new().unwrap();
        let custom_profiles_dir = temp.path().join("custom_profiles");
        let paths = AppPaths::from_dirs(
            temp.path().join("config/config.jsonc"),
            temp.path().join("profiles"),
            temp.path().join("logs"),
        );

        fs::create_dir_all(&custom_profiles_dir).unwrap();
        create_profile(&custom_profiles_dir, "other-profile");

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let config_content = format!(
            r#"{{"config_path": ["{}"]}}"#,
            custom_profiles_dir.display()
        );
        fs::write(&paths.config_file, config_content).unwrap();

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: None,
            app_zoom_percent: None,
            default_profile: Some(Some("missing-profile".to_string())),
        };

        let result = update_global_config_impl(&paths, request);
        assert!(result.is_err());
        match result {
            Err(AppError::ProfileNotFound(msg)) => {
                assert!(msg.contains("missing-profile"));
            }
            _ => panic!("Expected ProfileNotFound error"),
        }
    }

    #[test]
    fn test_update_global_config_validation_error() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: None,
            app_zoom_percent: None,
            default_profile: None,
        };

        let result = update_global_config_impl(&paths, request);
        assert!(result.is_err());
        match result {
            Err(AppError::ValidationError(msg)) => {
                assert!(msg.contains("At least one field must be provided"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[test]
    fn test_update_global_config_preserves_comments() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let initial = r#"{
      // Global configuration
      "ui_preferences": {
        "sync_replace_enabled": false
      }
    }"#;
        fs::write(&paths.config_file, initial).unwrap();

        let request = UpdateGlobalConfigRequest {
            sync_replace_enabled: Some(true),
            app_zoom_percent: None,
            default_profile: None,
        };

        let _ = update_global_config_impl(&paths, request).unwrap();

        let updated_content = fs::read_to_string(&paths.config_file).unwrap();
        assert!(updated_content.contains("// Global configuration"));
        assert!(updated_content.contains("\"sync_replace_enabled\": true"));
    }

    #[test]
    fn test_get_error_logs_missing_file() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        let result = get_error_logs_impl(&paths);
        assert_eq!(result.entries.len(), 0);
        assert_eq!(result.source_file, "omo-switch.error.log");
        assert_eq!(result.truncated, false);
        assert_eq!(result.read_error, None);
    }

    #[test]
    fn test_get_error_logs_empty_file() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(&paths.log_dir).unwrap();
        fs::write(paths.log_dir.join("omo-switch.error.log"), "").unwrap();

        let result = get_error_logs_impl(&paths);
        assert_eq!(result.entries.len(), 0);
        assert_eq!(result.truncated, false);
    }

    #[test]
    fn test_get_error_logs_less_than_20() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(&paths.log_dir).unwrap();
        let lines: Vec<String> = (1..=5).map(|i| format!("Error line {}", i)).collect();
        fs::write(paths.log_dir.join("omo-switch.error.log"), lines.join("\n")).unwrap();

        let result = get_error_logs_impl(&paths);
        assert_eq!(result.entries.len(), 5);
        assert_eq!(result.truncated, false);
        assert_eq!(result.entries[0], "Error line 5");
        assert_eq!(result.entries[4], "Error line 1");
    }

    #[test]
    fn test_get_error_logs_exactly_20() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(&paths.log_dir).unwrap();
        let lines: Vec<String> = (1..=20).map(|i| format!("Line {}", i)).collect();
        fs::write(paths.log_dir.join("omo-switch.error.log"), lines.join("\n")).unwrap();

        let result = get_error_logs_impl(&paths);
        assert_eq!(result.entries.len(), 20);
        assert_eq!(result.truncated, true);
        assert_eq!(result.entries[0], "Line 20");
        assert_eq!(result.entries[19], "Line 1");
    }

    #[test]
    fn test_get_error_logs_more_than_20() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(&paths.log_dir).unwrap();
        let lines: Vec<String> = (1..=25).map(|i| format!("Line {}", i)).collect();
        fs::write(paths.log_dir.join("omo-switch.error.log"), lines.join("\n")).unwrap();

        let result = get_error_logs_impl(&paths);
        assert_eq!(result.entries.len(), 20);
        assert_eq!(result.truncated, true);
        assert_eq!(result.entries[0], "Line 25");
        assert_eq!(result.entries[19], "Line 6");
    }

    #[test]
    fn test_get_error_logs_reversed_order() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(&paths.log_dir).unwrap();
        fs::write(
            paths.log_dir.join("omo-switch.error.log"),
            "First\nSecond\nThird",
        )
        .unwrap();

        let result = get_error_logs_impl(&paths);
        assert_eq!(result.entries, vec!["Third", "Second", "First"]);
    }

    #[test]
    fn test_validate_provider_name() {
        assert!(validate_provider_name("anthropic").is_ok());
        assert!(validate_provider_name("openai").is_ok());
        assert!(validate_provider_name("my-provider-123").is_ok());
        assert!(validate_provider_name("provider-1").is_ok());
        assert!(validate_provider_name("").is_err());
        assert!(validate_provider_name("Provider").is_err());
        assert!(validate_provider_name("provider_name").is_err());
        assert!(validate_provider_name("provider!").is_err());
    }

    #[test]
    fn test_validate_model_name() {
        assert!(validate_model_name("gpt-5").is_ok());
        assert!(validate_model_name("claude-opus-4-5").is_ok());
        assert!(validate_model_name("model123").is_ok());
        assert!(validate_model_name("").is_err());
        assert!(validate_model_name("provider/model").is_err());
        assert!(validate_model_name("model/name").is_err());
    }

    #[test]
    fn test_get_providers_accepts_array_model_catalog() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(
            &paths.config_file,
            r#"{"providers":{"openai":["gpt-5.4","gpt-5.3-codex"]}}"#,
        )
        .unwrap();

        let result = get_providers_impl(&paths).unwrap();
        let openai = result.providers.get("openai").unwrap();

        assert!(openai.contains(&"gpt-5.4".to_string()));
        assert!(openai.contains(&"gpt-5.3-codex".to_string()));
    }

    #[test]
    fn test_create_provider_fresh_config() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, "{}").unwrap();

        let request = CreateProviderRequest {
            name: "custom-provider".to_string(),
        };
        let result = create_provider_impl(&paths, request).unwrap();
        assert!(result.success);

        let config = read_jsonc_file(&paths.config_file).unwrap();
        assert_eq!(config
            .get("providers")
            .unwrap()
            .get("custom-provider")
            .unwrap()
            .as_array()
            .unwrap()
            .len(), 0);
    }

    #[test]
    fn test_create_provider_already_exists() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let content = r#"{"providers":{"anthropic":[]}}"#;
        fs::write(&paths.config_file, content).unwrap();

        let request = CreateProviderRequest {
            name: "anthropic".to_string(),
        };
        let result = create_provider_impl(&paths, request);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_model_preserves_sibling_models() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let content = r#"{"providers":{"anthropic":["claude-opus-4-5","claude-sonnet-4"]}}"#;
        fs::write(&paths.config_file, content).unwrap();

        let result = delete_model_impl(
            &paths,
            "anthropic".to_string(),
            "claude-opus-4-5".to_string(),
        )
        .unwrap();
        assert!(result.success);

        let config = read_jsonc_file(&paths.config_file).unwrap();
        let provider = config.get("providers").unwrap().get("anthropic").unwrap();
        let models = provider.as_array().unwrap();
        assert!(!models.iter().any(|item| item.as_str() == Some("claude-opus-4-5")));
        assert!(models.iter().any(|item| item.as_str() == Some("claude-sonnet-4")));
    }

    #[test]
    fn test_delete_provider_preserves_other_keys() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let content = r#"{
      "providers": {
        "anthropic": [],
        "openai": []
      },
      "default_profile": "work"
    }"#;
        fs::write(&paths.config_file, content).unwrap();

        let result = delete_provider_impl(&paths, "anthropic".to_string()).unwrap();
        assert!(result.success);

        let config = read_jsonc_file(&paths.config_file).unwrap();
        let providers = config.get("providers").unwrap();
        assert!(providers.get("anthropic").is_none());
        assert!(providers.get("openai").is_some());
        assert!(config.get("default_profile").is_some());
    }

    #[test]
    fn test_nested_create_provider_model() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        fs::write(&paths.config_file, "{}").unwrap();

        let provider_request = CreateProviderRequest {
            name: "custom-provider".to_string(),
        };
        create_provider_impl(&paths, provider_request).unwrap();

        let model_request = CreateModelRequest {
            name: "custom-model".to_string(),
            max_tokens: Some(128000),
            extra: std::collections::HashMap::new(),
        };
        create_model_impl(&paths, "custom-provider".to_string(), model_request).unwrap();

        let config = read_jsonc_file(&paths.config_file).unwrap();
        let models = config
            .get("providers")
            .unwrap()
            .get("custom-provider")
            .unwrap()
            .as_array()
            .unwrap();
        assert!(models.iter().any(|item| item.as_str() == Some("custom-model")));
    }

    #[test]
    fn test_create_model_default_max_tokens() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let content = r#"{"providers":{"anthropic":[]}}"#;
        fs::write(&paths.config_file, content).unwrap();

        let request = CreateModelRequest {
            name: "claude-new".to_string(),
            max_tokens: None,
            extra: std::collections::HashMap::new(),
        };
        create_model_impl(&paths, "anthropic".to_string(), request).unwrap();

        let config = read_jsonc_file(&paths.config_file).unwrap();
        let models = config
            .get("providers")
            .unwrap()
            .get("anthropic")
            .unwrap()
            .as_array()
            .unwrap();
        assert!(models.iter().any(|item| item.as_str() == Some("claude-new")));
    }

    #[test]
    fn test_update_model_rejects_array_format_config_updates() {
        let temp = TempDir::new().unwrap();
        let paths = create_test_paths(&temp);

        fs::create_dir_all(paths.config_file.parent().unwrap()).unwrap();
        let content = r#"{"providers":{"anthropic":["claude-opus-4-5"]}}"#;
        fs::write(&paths.config_file, content).unwrap();

        let request = UpdateModelRequest {
            max_tokens: Some(128000),
            extra: std::collections::HashMap::new(),
        };
        let result = update_model_impl(
            &paths,
            "anthropic".to_string(),
            "claude-opus-4-5".to_string(),
            request,
        );

        assert!(result.is_err());
    }
}
