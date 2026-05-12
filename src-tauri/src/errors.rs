//! App error types for Tauri commands.
//!
//! All errors serialize to `{ code: "CODE", message: "..." }` JSON format,
//! matching the legacy HTTP API error responses.

use serde::{Deserialize, Serialize};

/// Serializable error payload matching the legacy HTTP API format.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AppErrorPayload {
    pub code: String,
    pub message: String,
}

/// Application error variants for Tauri commands.
#[derive(Debug, Clone)]
pub enum AppError {
    ScanError(String),
    NotFound(String),
    ValidationError(String),
    Conflict(String),
    WriteError(String),
    CopyError(String),
    ReadError(String),
    InvalidJson(String),
    ProfileNotFound(String),
}

impl AppError {
    pub fn to_payload(&self) -> AppErrorPayload {
        AppErrorPayload {
            code: self.code(),
            message: self.message(),
        }
    }

    pub fn code(&self) -> String {
        match self {
            AppError::ScanError(_) => "SCAN_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::ValidationError(_) => "VALIDATION_ERROR",
            AppError::Conflict(_) => "CONFLICT",
            AppError::WriteError(_) => "WRITE_ERROR",
            AppError::CopyError(_) => "COPY_ERROR",
            AppError::ReadError(_) => "READ_ERROR",
            AppError::InvalidJson(_) => "INVALID_JSON",
            AppError::ProfileNotFound(_) => "PROFILE_NOT_FOUND",
        }
        .to_string()
    }

    pub fn message(&self) -> String {
        match self {
            AppError::ScanError(msg) => msg.clone(),
            AppError::NotFound(msg) => msg.clone(),
            AppError::ValidationError(msg) => msg.clone(),
            AppError::Conflict(msg) => msg.clone(),
            AppError::WriteError(msg) => msg.clone(),
            AppError::CopyError(msg) => msg.clone(),
            AppError::ReadError(msg) => msg.clone(),
            AppError::InvalidJson(msg) => msg.clone(),
            AppError::ProfileNotFound(msg) => msg.clone(),
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.to_payload().serialize(serializer)
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code(), self.message())
    }
}

impl std::error::Error for AppError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_error_serialization() {
        let err = AppError::ScanError("Failed to scan profiles directory".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "SCAN_ERROR");
        assert_eq!(payload.message, "Failed to scan profiles directory");

        let json = serde_json::to_string(&err).unwrap();
        assert_eq!(
            json,
            r#"{"code":"SCAN_ERROR","message":"Failed to scan profiles directory"}"#
        );
    }

    #[test]
    fn test_not_found_serialization() {
        let err = AppError::NotFound("Profile 'test' does not exist".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "NOT_FOUND");
        assert_eq!(payload.message, "Profile 'test' does not exist");
    }

    #[test]
    fn test_validation_error_serialization() {
        let err = AppError::ValidationError("Request body must be valid JSON".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "VALIDATION_ERROR");
        assert_eq!(payload.message, "Request body must be valid JSON");
    }

    #[test]
    fn test_conflict_serialization() {
        let err = AppError::Conflict("Profile was modified by another process".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "CONFLICT");
        assert_eq!(payload.message, "Profile was modified by another process");
    }

    #[test]
    fn test_write_error_serialization() {
        let err = AppError::WriteError("Failed to write profile configuration".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "WRITE_ERROR");
        assert_eq!(payload.message, "Failed to write profile configuration");
    }

    #[test]
    fn test_copy_error_serialization() {
        let err = AppError::CopyError("Failed to copy profile to target".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "COPY_ERROR");
        assert_eq!(payload.message, "Failed to copy profile to target");
    }

    #[test]
    fn test_read_error_serialization() {
        let err = AppError::ReadError("Failed to read global config".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "READ_ERROR");
        assert_eq!(payload.message, "Failed to read global config");
    }

    #[test]
    fn test_invalid_json_serialization() {
        let err = AppError::InvalidJson("Request body must be valid JSON".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "INVALID_JSON");
        assert_eq!(payload.message, "Request body must be valid JSON");
    }

    #[test]
    fn test_profile_not_found_serialization() {
        let err = AppError::ProfileNotFound("Profile \"test\" does not exist".to_string());
        let payload = err.to_payload();
        assert_eq!(payload.code, "PROFILE_NOT_FOUND");
        assert_eq!(payload.message, "Profile \"test\" does not exist");
    }

    #[test]
    fn test_all_error_codes_serialize_correctly() {
        let errors = [
            ("SCAN_ERROR", AppError::ScanError("msg".to_string())),
            ("NOT_FOUND", AppError::NotFound("msg".to_string())),
            (
                "VALIDATION_ERROR",
                AppError::ValidationError("msg".to_string()),
            ),
            ("CONFLICT", AppError::Conflict("msg".to_string())),
            ("WRITE_ERROR", AppError::WriteError("msg".to_string())),
            ("COPY_ERROR", AppError::CopyError("msg".to_string())),
            ("READ_ERROR", AppError::ReadError("msg".to_string())),
            ("INVALID_JSON", AppError::InvalidJson("msg".to_string())),
            (
                "PROFILE_NOT_FOUND",
                AppError::ProfileNotFound("msg".to_string()),
            ),
        ];

        for (expected_code, err) in errors {
            let json = serde_json::to_string(&err).unwrap();
            let parsed: AppErrorPayload = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed.code, expected_code);
            assert_eq!(parsed.message, "msg");
        }
    }

    #[test]
    fn test_error_payload_deserialization() {
        let json = r#"{"code":"SCAN_ERROR","message":"Test message"}"#;
        let payload: AppErrorPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.code, "SCAN_ERROR");
        assert_eq!(payload.message, "Test message");
    }
}
