//! App paths management for Tauri application.
//!
//! Handles resolution of config, profiles, and log directories,
//! with support for both production (Tauri APIs) and testing contexts.

use crate::errors::AppError;
use std::env;
use std::path::{Path, PathBuf};

/// Resolved absolute paths for app directories and files.
///
/// This struct holds the canonical paths used throughout the application.
/// Paths are resolved at initialization and remain immutable.
#[derive(Debug, Clone)]
pub struct AppPaths {
    /// Path to the global config file (config.jsonc).
    pub config_file: PathBuf,
    /// Directory containing profile subdirectories.
    pub profiles_dir: PathBuf,
    /// Directory for log files.
    pub log_dir: PathBuf,
}

impl AppPaths {
    /// Initialize paths from Tauri app handle (production mode).
    ///
    /// Uses Tauri 2's path APIs to resolve platform-appropriate directories:
    /// - app_config_dir() for config file location
    /// - app_data_dir() for profiles storage
    /// - app_log_dir() for log files
    ///
    /// # Example
    /// ```ignore
    /// use tauri::Manager;
    /// let paths = AppPaths::from_tauri(&app_handle)?;
    /// paths.ensure_dirs()?;
    /// ```
    pub fn from_tauri(app_handle: &tauri::AppHandle) -> Result<Self, AppError> {
        use tauri::Manager;

        let config_dir = app_handle
            .path()
            .app_config_dir()
            .map_err(|e| AppError::ReadError(format!("Failed to resolve config dir: {}", e)))?;

        let data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::ReadError(format!("Failed to resolve data dir: {}", e)))?;

        let log_dir = app_handle
            .path()
            .app_log_dir()
            .map_err(|e| AppError::ReadError(format!("Failed to resolve log dir: {}", e)))?;

        Ok(Self {
            config_file: config_dir.join("config.jsonc"),
            profiles_dir: data_dir.join("profiles"),
            log_dir,
        })
    }

    /// Initialize paths with explicit directories (testing mode).
    ///
    /// Takes absolute paths directly, useful for unit tests with temp directories.
    ///
    /// # Example
    /// ```ignore
    /// use std::path::PathBuf;
    /// let paths = AppPaths::from_dirs(
    ///     PathBuf::from("/tmp/config.jsonc"),
    ///     PathBuf::from("/tmp/profiles"),
    ///     PathBuf::from("/tmp/logs"),
    /// );
    /// ```
    pub fn from_dirs(config_file: PathBuf, profiles_dir: PathBuf, log_dir: PathBuf) -> Self {
        Self {
            config_file,
            profiles_dir,
            log_dir,
        }
    }

    /// Ensure all required directories exist (idempotent).
    ///
    /// Creates config_file's parent, profiles_dir, and log_dir if they don't exist.
    /// Safe to call multiple times - no error if directories already exist.
    pub fn ensure_dirs(&self) -> Result<(), AppError> {
        if let Some(parent) = self.config_file.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| AppError::WriteError(format!("Failed to create config dir: {}", e)))?;
        }

        std::fs::create_dir_all(&self.profiles_dir)
            .map_err(|e| AppError::WriteError(format!("Failed to create profiles dir: {}", e)))?;

        std::fs::create_dir_all(&self.log_dir)
            .map_err(|e| AppError::WriteError(format!("Failed to create log dir: {}", e)))?;

        Ok(())
    }

    /// Bootstrap default config file if it doesn't exist.
    ///
    /// Writes a minimal valid JSONC config with empty config_path and log_path,
    /// causing the app to use its own profiles_dir and log_dir by default.
    /// Does NOT overwrite existing config files.
    pub fn bootstrap_config_if_missing(&self) -> Result<(), AppError> {
        if self.config_file.exists() {
            return Ok(());
        }

        self.ensure_dirs()?;

        let default_config = r#"{
   "config_path": [""],
   "log_path": "",
   "providers": {},
   "ui_preferences": {
     "sync_replace_enabled": true
   },
   "default_profile": null,
   "disabled_providers": {}
}"#;

        std::fs::write(&self.config_file, default_config)
            .map_err(|e| AppError::WriteError(format!("Failed to write config.jsonc: {}", e)))?;

        Ok(())
    }

    /// Resolve the profiles root directory based on optional override path.
    ///
    /// Resolution logic:
    /// - None → use app's profiles_dir
    /// - Absolute path → use as-is
    /// - Relative path → resolve relative to config_file's parent directory
    ///
    /// # Example
    /// ```ignore
    /// use std::path::PathBuf;
    /// let paths = AppPaths::from_dirs(
    ///     PathBuf::from("/app/config/config.jsonc"),
    ///     PathBuf::from("/app/data/profiles"),
    ///     PathBuf::from("/app/logs"),
    /// );
    ///
    /// // None → returns profiles_dir
    /// assert_eq!(paths.resolve_profiles_root(None), PathBuf::from("/app/data/profiles"));
    ///
    /// // Absolute → returns unchanged
    /// assert_eq!(paths.resolve_profiles_root(Some("/custom/profiles")), PathBuf::from("/custom/profiles"));
    ///
    /// // Relative → resolved relative to config_file's parent
    /// assert_eq!(paths.resolve_profiles_root(Some("../other")), PathBuf::from("/app/other"));
    /// ```
    pub fn resolve_profiles_root(&self, root_path: Option<&str>) -> PathBuf {
        let Some(root_path) = root_path else {
            return self.profiles_dir.clone();
        };

        if root_path.is_empty() {
            return self.profiles_dir.clone();
        }

        if let Some(expanded) = expand_home_path(root_path) {
            return expanded;
        }

        let path = Path::new(root_path);
        if path.is_absolute() {
            return PathBuf::from(path);
        }

        let config_parent = self.config_file.parent().unwrap_or_else(|| Path::new(""));
        config_parent.join(root_path)
    }
}

fn expand_home_path(path: &str) -> Option<PathBuf> {
    let rest = if path == "~" {
        Some("")
    } else {
        path.strip_prefix("~/").or_else(|| path.strip_prefix("~\\"))
    }?;

    let home = env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)?;

    if rest.is_empty() {
        Some(home)
    } else {
        Some(home.join(rest))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_bootstrap_creates_missing_dirs() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let base = temp.path();

        let paths = AppPaths::from_dirs(
            base.join("config/config.jsonc"),
            base.join("data/profiles"),
            base.join("logs"),
        );

        assert!(!paths.config_file.parent().unwrap().exists());
        assert!(!paths.profiles_dir.exists());
        assert!(!paths.log_dir.exists());

        paths.ensure_dirs().expect("ensure_dirs failed");
        paths
            .bootstrap_config_if_missing()
            .expect("bootstrap failed");

        assert!(paths.config_file.parent().unwrap().exists());
        assert!(paths.profiles_dir.exists());
        assert!(paths.log_dir.exists());
        assert!(paths.config_file.exists());
    }

    #[test]
    fn test_bootstrap_idempotent() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let base = temp.path();

        let paths = AppPaths::from_dirs(
            base.join("config/config.jsonc"),
            base.join("data/profiles"),
            base.join("logs"),
        );

        paths.ensure_dirs().expect("ensure_dirs failed");
        paths
            .bootstrap_config_if_missing()
            .expect("first bootstrap failed");

        let content1 = fs::read_to_string(&paths.config_file).expect("Failed to read config");

        paths
            .bootstrap_config_if_missing()
            .expect("second bootstrap failed");

        let content2 = fs::read_to_string(&paths.config_file).expect("Failed to read config");
        assert_eq!(
            content1, content2,
            "Config should not change on second bootstrap"
        );
    }

    #[test]
    fn test_resolve_profiles_root_none() {
        let paths = AppPaths::from_dirs(
            PathBuf::from("/app/config/config.jsonc"),
            PathBuf::from("/app/data/profiles"),
            PathBuf::from("/app/logs"),
        );

        assert_eq!(
            paths.resolve_profiles_root(None),
            PathBuf::from("/app/data/profiles")
        );
    }

    #[test]
    fn test_resolve_profiles_root_absolute() {
        let paths = AppPaths::from_dirs(
            PathBuf::from("/app/config/config.jsonc"),
            PathBuf::from("/app/data/profiles"),
            PathBuf::from("/app/logs"),
        );

        assert_eq!(
            paths.resolve_profiles_root(Some("/custom/profiles")),
            PathBuf::from("/custom/profiles")
        );
    }

    #[test]
    fn test_resolve_profiles_root_home_relative() {
        let paths = AppPaths::from_dirs(
            PathBuf::from("/app/config/config.jsonc"),
            PathBuf::from("/app/data/profiles"),
            PathBuf::from("/app/logs"),
        );
        let home = std::env::var_os("HOME")
            .or_else(|| std::env::var_os("USERPROFILE"))
            .map(PathBuf::from)
            .expect("home directory must be set for test");

        assert_eq!(paths.resolve_profiles_root(Some("~")), home);
        assert_eq!(
            paths.resolve_profiles_root(Some("~/devop/tshouse/omo-switch/config/profiles/omo")),
            home.join("devop/tshouse/omo-switch/config/profiles/omo")
        );
    }

    #[test]
    fn test_resolve_profiles_root_empty_uses_default() {
        let paths = AppPaths::from_dirs(
            PathBuf::from("/app/config/config.jsonc"),
            PathBuf::from("/app/data/profiles"),
            PathBuf::from("/app/logs"),
        );

        assert_eq!(
            paths.resolve_profiles_root(Some("")),
            PathBuf::from("/app/data/profiles")
        );
    }

    #[test]
    fn test_resolve_profiles_root_relative() {
        let paths = AppPaths::from_dirs(
            PathBuf::from("/app/config/config.jsonc"),
            PathBuf::from("/app/data/profiles"),
            PathBuf::from("/app/logs"),
        );

        let resolved = paths.resolve_profiles_root(Some("../other"));
        assert_eq!(resolved, PathBuf::from("/app/config/../other"));

        let resolved2 = paths.resolve_profiles_root(Some("subdir"));
        assert_eq!(resolved2, PathBuf::from("/app/config/subdir"));
    }

    #[test]
    fn test_bootstrap_config_not_machine_specific() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let base = temp.path();

        let paths = AppPaths::from_dirs(
            base.join("config/config.jsonc"),
            base.join("data/profiles"),
            base.join("logs"),
        );

        paths.ensure_dirs().expect("ensure_dirs failed");
        paths
            .bootstrap_config_if_missing()
            .expect("bootstrap failed");

        let content = fs::read_to_string(&paths.config_file).expect("Failed to read config");

        assert!(
            !content.contains("/Users/panh"),
            "Config should not contain user home path"
        );
        assert!(
            !content.contains("/home/"),
            "Config should not contain Linux home path"
        );
        assert!(
            !content.contains("C:\\"),
            "Config should not contain Windows path"
        );

        assert!(
            content.contains("\"config_path\": [\"\"]"),
            "config_path should be empty array"
        );
        assert!(
            content.contains("\"log_path\": \"\""),
            "log_path should be empty"
        );
    }

    #[test]
    fn test_missing_config_returns_defaults() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let base = temp.path();

        let config_path = base.join("config/config.jsonc");
        let paths = AppPaths::from_dirs(
            config_path.clone(),
            base.join("data/profiles"),
            base.join("logs"),
        );

        assert!(!config_path.exists());

        paths.ensure_dirs().expect("ensure_dirs failed");
        paths
            .bootstrap_config_if_missing()
            .expect("bootstrap failed");

        assert!(config_path.exists());

        let content = fs::read_to_string(&config_path).expect("Failed to read config");
        let parsed: serde_json::Value =
            serde_json::from_str(&content).expect("Config should be valid JSON");

        assert!(parsed.is_object());
        assert!(parsed.get("config_path").is_some());
        assert!(parsed.get("log_path").is_some());
        assert!(parsed.get("providers").is_some());
        assert!(parsed.get("ui_preferences").is_some());
    }

    #[test]
    fn test_ensure_dirs_idempotent() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let base = temp.path();

        let paths = AppPaths::from_dirs(
            base.join("config/config.jsonc"),
            base.join("data/profiles"),
            base.join("logs"),
        );

        paths.ensure_dirs().expect("first call failed");
        paths.ensure_dirs().expect("second call failed");
        paths.ensure_dirs().expect("third call failed");

        assert!(paths.config_file.parent().unwrap().exists());
        assert!(paths.profiles_dir.exists());
        assert!(paths.log_dir.exists());
    }
}
