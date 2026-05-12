//! JSONC lossless read/write with path-based edit parity.

use crate::errors::AppError;
use jsonc_parser::cst::{CstInputValue, CstObject, CstRootNode};
use jsonc_parser::{json, ParseOptions};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::Path;

/// Read JSONC content, strip comments, parse to serde_json::Value.
pub fn jsonc_read(content: &str) -> Result<Value, AppError> {
    if content.trim().is_empty() {
        return Ok(Value::Object(serde_json::Map::new()));
    }

    let root = CstRootNode::parse(content, &ParseOptions::default())
        .map_err(|e| AppError::InvalidJson(format!("Failed to parse JSONC: {}", e)))?;

    let value = root.value();
    match value {
        Some(v) => v
            .to_serde_value()
            .ok_or_else(|| AppError::InvalidJson("Failed to convert CST to Value".to_string())),
        None => Ok(Value::Object(serde_json::Map::new())),
    }
}

/// Modify a value at the given JSON path in JSONC text.
pub fn jsonc_modify(
    content: &str,
    path: &[&str],
    value: Option<&Value>,
) -> Result<String, AppError> {
    let working_content = if content.trim().is_empty() {
        "{}"
    } else {
        content
    };

    let root = CstRootNode::parse(working_content, &ParseOptions::default())
        .map_err(|e| AppError::InvalidJson(format!("Failed to parse JSONC: {}", e)))?;

    let root_obj = root.object_value_or_set();

    modify_path(&root_obj, path, value)?;

    Ok(root.to_string())
}

fn modify_path(obj: &CstObject, path: &[&str], value: Option<&Value>) -> Result<(), AppError> {
    if path.is_empty() {
        return Err(AppError::InvalidJson("Empty path provided".to_string()));
    }

    let key = path[0];
    let remaining_path = &path[1..];

    if remaining_path.is_empty() {
        apply_value_at_key(obj, key, value)?;
    } else {
        match value {
            Some(v) => {
                let nested_obj = obj.object_value_or_set(key);
                modify_path(&nested_obj, remaining_path, Some(v))?;
            }
            None => {
                if let Some(prop) = obj.get(key) {
                    if let Some(nested) = prop.object_value() {
                        modify_path(&nested, remaining_path, None)?;
                    } else {
                        prop.remove();
                    }
                }
            }
        }
    }

    Ok(())
}

fn apply_value_at_key(obj: &CstObject, key: &str, value: Option<&Value>) -> Result<(), AppError> {
    match value {
        Some(v) => {
            if let Some(prop) = obj.get(key) {
                prop.set_value(value_to_cst_input(v));
            } else {
                obj.append(key, value_to_cst_input(v));
            }
        }
        None => {
            if let Some(prop) = obj.get(key) {
                prop.remove();
            }
        }
    }
    Ok(())
}

fn value_to_cst_input(value: &Value) -> CstInputValue {
    match value {
        Value::Null => json!(null),
        Value::Bool(b) => json!(*b),
        Value::Number(n) => n
            .as_f64()
            .or_else(|| n.as_i64().map(|i| i as f64))
            .or_else(|| n.as_u64().map(|u| u as f64))
            .map(|f| json!(f))
            .unwrap_or(json!(0)),
        Value::String(s) => json!(s.as_str()),
        Value::Array(arr) => {
            json!(arr.iter().map(value_to_cst_input).collect::<Vec<_>>())
        }
        Value::Object(obj) => {
            json!(obj
                .iter()
                .map(|(k, v)| (k.clone(), value_to_cst_input(v)))
                .collect::<Vec<_>>())
        }
    }
}

/// Read a JSONC file from disk, returning empty object on missing file.
pub fn read_jsonc_file(path: &Path) -> Result<Value, AppError> {
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                return Ok(Value::Object(serde_json::Map::new()));
            }
            return Err(AppError::ReadError(format!(
                "Failed to read file {}: {}",
                path.display(),
                e
            )));
        }
    };

    jsonc_read(&content)
}

/// Write JSONC content to disk atomically.
pub fn write_jsonc_file(path: &Path, content: &str) -> Result<(), AppError> {
    let parent = path.parent();
    if let Some(parent) = parent {
        fs::create_dir_all(parent).map_err(|e| {
            AppError::WriteError(format!(
                "Failed to create directory {}: {}",
                parent.display(),
                e
            ))
        })?;
    }

    let temp_path = path.with_extension("tmp");

    let mut temp_file = fs::File::create(&temp_path).map_err(|e| {
        AppError::WriteError(format!(
            "Failed to create temp file {}: {}",
            temp_path.display(),
            e
        ))
    })?;

    temp_file.write_all(content.as_bytes()).map_err(|e| {
        AppError::WriteError(format!(
            "Failed to write temp file {}: {}",
            temp_path.display(),
            e
        ))
    })?;

    temp_file.flush().map_err(|e| {
        AppError::WriteError(format!(
            "Failed to flush temp file {}: {}",
            temp_path.display(),
            e
        ))
    })?;

    fs::rename(&temp_path, path).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        AppError::WriteError(format!(
            "Failed to rename temp file to {}: {}",
            path.display(),
            e
        ))
    })?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_read_jsonc_strips_comments() {
        let content = r#"{
  // This is a line comment
  "key": "value",
  /* This is a block comment */
  "number": 123
}"#;

        let result = jsonc_read(content).unwrap();
        assert_eq!(result["key"], "value");
        assert_eq!(result["number"], 123);
    }

    #[test]
    fn test_read_empty_content_returns_empty_object() {
        let result = jsonc_read("").unwrap();
        assert!(result.is_object());
        assert_eq!(result.as_object().unwrap().len(), 0);

        let result = jsonc_read("   ").unwrap();
        assert!(result.is_object());
        assert_eq!(result.as_object().unwrap().len(), 0);
    }

    #[test]
    fn test_read_invalid_jsonc_returns_error() {
        let content = "{ invalid json }";
        let result = jsonc_read(content);
        assert!(result.is_err());
        match result {
            Err(AppError::InvalidJson(_)) => (),
            _ => panic!("Expected InvalidJson error"),
        }
    }

    #[test]
    fn test_read_nested_object() {
        let content = r#"{
  "agents": {
    "build": {
      "model": "gpt-5",
      "variant": "high"
    }
  }
}"#;

        let result = jsonc_read(content).unwrap();
        assert_eq!(result["agents"]["build"]["model"], "gpt-5");
        assert_eq!(result["agents"]["build"]["variant"], "high");
    }

    #[test]
    fn test_modify_preserves_comments_in_profile() {
        let content = r#"{
  // Profile configuration
  "agents": {
    // Build agent
    "build": {
      "model": "old-model",
      "variant": "low"
    },
    "oracle": {
      "model": "oracle-model"
    }
  },
  "categories": {
    "quick": {
      "model": "fast-model"
    }
  }
}"#;

        let result = jsonc_modify(
            content,
            &["agents", "build", "model"],
            Some(&json!("new-model")),
        )
        .unwrap();

        assert!(result.contains("// Profile configuration"));
        assert!(result.contains("// Build agent"));
        assert!(result.contains("\"model\": \"new-model\""));
        assert!(!result.contains("\"model\": \"old-model\""));
        assert!(result.contains("\"variant\": \"low\""));
    }

    #[test]
    fn test_modify_sync_replace_enabled_preserves_comments() {
        let content = r#"{
  // Config paths for profiles
  "config_path": [""],
  // Logging configuration
  "log_path": "",
  "providers": {},
  "ui_preferences": {
    // Enable/disable sync replace
    "sync_replace_enabled": false
  },
  "default_profile": null,
  "disabled_providers": {}
}"#;

        let result = jsonc_modify(
            content,
            &["ui_preferences", "sync_replace_enabled"],
            Some(&json!(true)),
        )
        .unwrap();

        assert!(result.contains("// Config paths for profiles"));
        assert!(result.contains("// Logging configuration"));
        assert!(result.contains("// Enable/disable sync replace"));
        assert!(result.contains("\"sync_replace_enabled\": true"));
        assert!(!result.contains("\"sync_replace_enabled\": false"));
    }

    #[test]
    fn test_modify_default_profile_null_to_string() {
        let content = r#"{ "default_profile": null }"#;
        let result = jsonc_modify(content, &["default_profile"], Some(&json!("omo"))).unwrap();
        assert!(result.contains("\"default_profile\": \"omo\""));
        assert!(!result.contains("\"default_profile\": null"));
    }

    #[test]
    fn test_modify_default_profile_string_to_null() {
        let content = r#"{ "default_profile": "omo" }"#;
        let result = jsonc_modify(content, &["default_profile"], Some(&json!(null))).unwrap();
        assert!(result.contains("\"default_profile\": null"));
    }

    #[test]
    fn test_modify_disabled_providers_array() {
        let content = r#"{
  "disabled_providers": {}
}"#;

        let result = jsonc_modify(
            content,
            &["disabled_providers", "profile123"],
            Some(&json!(["provider1", "provider2"])),
        )
        .unwrap();

        assert!(result.contains("\"profile123\""));
        assert!(result.contains("\"provider1\""));
        assert!(result.contains("\"provider2\""));
    }

    #[test]
    fn test_delete_agent_removes_key() {
        let content = r#"{
  "agents": {
    "build": {
      "model": "gpt-5"
    },
    "oracle": {
      "model": "oracle-model"
    }
  }
}"#;

        let result = jsonc_modify(content, &["agents", "build"], None).unwrap();
        assert!(!result.contains("\"build\""));
        assert!(!result.contains("\"model\": \"gpt-5\""));
        assert!(result.contains("\"oracle\""));
    }

    #[test]
    fn test_insert_new_nested_key() {
        let content = "{}";

        let result = jsonc_modify(
            content,
            &["ui_preferences", "sync_replace_enabled"],
            Some(&json!(true)),
        )
        .unwrap();

        assert!(result.contains("\"ui_preferences\""));
        assert!(result.contains("\"sync_replace_enabled\": true"));
    }

    #[test]
    fn test_modify_empty_content_creates_object() {
        let result = jsonc_modify("", &["key"], Some(&json!("value"))).unwrap();
        assert!(result.contains("\"key\": \"value\""));
    }

    #[test]
    fn test_modify_multiple_preserves_formatting() {
        let content = r#"{
  // Comment A
  "a": 1,
  // Comment B
  "b": 2,
  // Comment C
  "c": 3
}"#;

        let result1 = jsonc_modify(content, &["a"], Some(&json!(10))).unwrap();
        assert!(result1.contains("// Comment A"));
        assert!(result1.contains("// Comment B"));
        assert!(result1.contains("// Comment C"));
        assert!(result1.contains("\"a\": 10"));

        let result2 = jsonc_modify(&result1, &["b"], Some(&json!(20))).unwrap();
        assert!(result2.contains("// Comment A"));
        assert!(result2.contains("// Comment B"));
        assert!(result2.contains("// Comment C"));
        assert!(result2.contains("\"a\": 10"));
        assert!(result2.contains("\"b\": 20"));
        assert!(result2.contains("\"c\": 3"));
    }

    #[test]
    fn test_modify_boolean_values() {
        let content = r#"{ "enabled": false }"#;
        let result = jsonc_modify(content, &["enabled"], Some(&json!(true))).unwrap();
        assert!(result.contains("\"enabled\": true"));

        let result = jsonc_modify(&result, &["enabled"], Some(&json!(false))).unwrap();
        assert!(result.contains("\"enabled\": false"));
    }

    #[test]
    fn test_modify_number_values() {
        let content = r#"{ "temperature": 0.5 }"#;
        let result = jsonc_modify(content, &["temperature"], Some(&json!(0.2))).unwrap();
        assert!(result.contains("\"temperature\": 0.2"));

        let result = jsonc_modify(content, &["temperature"], Some(&json!(0))).unwrap();
        assert!(result.contains("\"temperature\": 0"));
    }

    #[test]
    fn test_delete_nested_key() {
        let content = r#"{
  "agents": {
    "build": {
      "model": "gpt-5",
      "variant": "high"
    }
  }
}"#;

        let result = jsonc_modify(content, &["agents", "build", "variant"], None).unwrap();
        assert!(!result.contains("\"variant\""));
        assert!(result.contains("\"model\": \"gpt-5\""));
        assert!(result.contains("\"build\""));
    }

    #[test]
    fn test_delete_nonexistent_key_succeeds() {
        let content = r#"{ "existing": "value" }"#;
        let result = jsonc_modify(content, &["nonexistent"], None).unwrap();
        assert!(result.contains("\"existing\": \"value\""));
        assert!(!result.contains("\"nonexistent\""));
    }

    #[test]
    fn test_read_jsonc_file_existing() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.jsonc");

        let content = r#"{
  // Comment
  "key": "value"
}"#;
        fs::write(&file_path, content).unwrap();

        let result = read_jsonc_file(&file_path).unwrap();
        assert_eq!(result["key"], "value");
    }

    #[test]
    fn test_read_jsonc_file_missing_returns_empty_object() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("nonexistent.jsonc");

        let result = read_jsonc_file(&file_path).unwrap();
        assert!(result.is_object());
        assert_eq!(result.as_object().unwrap().len(), 0);
    }

    #[test]
    fn test_write_jsonc_file_creates_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("new.jsonc");

        let content = "{ \"key\": \"value\" }";
        write_jsonc_file(&file_path, content).unwrap();

        let read_content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_content, content);
    }

    #[test]
    fn test_write_jsonc_file_overwrites_existing() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("existing.jsonc");

        fs::write(&file_path, "old content").unwrap();
        let new_content = "{ \"new\": \"value\" }";
        write_jsonc_file(&file_path, new_content).unwrap();

        let read_content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_content, new_content);
    }

    #[test]
    fn test_write_jsonc_file_creates_parent_dirs() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("nested/dir/file.jsonc");

        let content = "{ \"key\": \"value\" }";
        write_jsonc_file(&file_path, content).unwrap();

        let read_content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_content, content);
    }

    #[test]
    fn test_roundtrip_file_read_modify_write() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("config.jsonc");

        let initial = r#"{
  // UI settings
  "ui_preferences": {
    "sync_replace_enabled": false
  }
}"#;
        fs::write(&file_path, initial).unwrap();

        let value = read_jsonc_file(&file_path).unwrap();
        assert_eq!(value["ui_preferences"]["sync_replace_enabled"], false);

        let current_content = fs::read_to_string(&file_path).unwrap();
        let modified = jsonc_modify(
            &current_content,
            &["ui_preferences", "sync_replace_enabled"],
            Some(&json!(true)),
        )
        .unwrap();

        write_jsonc_file(&file_path, &modified).unwrap();

        let final_content = fs::read_to_string(&file_path).unwrap();
        assert!(final_content.contains("// UI settings"));
        assert!(final_content.contains("\"sync_replace_enabled\": true"));
    }

    #[test]
    fn test_array_manipulation() {
        let content = r#"{ "items": [] }"#;
        let result = jsonc_modify(content, &["items"], Some(&json!([1, 2, 3]))).unwrap();
        assert!(result.contains("[1, 2, 3]"));
    }

    #[test]
    fn test_preserve_inline_comments() {
        let content = r#"{
  "key": "value"  // inline comment
}"#;

        let result = jsonc_modify(content, &["key"], Some(&json!("new-value"))).unwrap();
        assert!(result.contains("// inline comment"));
        assert!(result.contains("\"key\": \"new-value\""));
    }
}
