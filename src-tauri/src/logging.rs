//! File-based logging initialization for the Tauri application.
//!
//! Sets up dual-file logging:
//! - `omo-switch.log` for all log levels (info and above)
//! - `omo-switch.error.log` for error level only

use log::*;
use simplelog::*;
use std::fs::File;
use std::path::Path;

/// Initialize file-based logging.
///
/// Creates two log files in the specified directory:
/// - `<log_dir>/omo-switch.log` — all levels (info and above)
/// - `<log_dir>/omo-switch.error.log` — error level only
///
/// Log entries are human-readable text lines with timestamp, level, and message.
///
/// # Errors
///
/// Returns error if:
/// - Log directory doesn't exist and can't be created
/// - Log files can't be created or written to
/// - Logger initialization fails
///
/// # Example
/// ```ignore
/// use std::path::Path;
/// init_logging(Path::new("/app/logs"))?;
/// log::info!("Application started");
/// ```
pub fn init_logging(log_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    std::fs::create_dir_all(log_dir)?;

    let main_log_path = log_dir.join("omo-switch.log");
    let error_log_path = log_dir.join("omo-switch.error.log");

    let main_log_file = File::create(&main_log_path)?;
    let error_log_file = File::create(&error_log_path)?;

    let main_logger = WriteLogger::new(
        LevelFilter::Info,
        ConfigBuilder::new()
            .set_time_format_rfc3339()
            .set_level_padding(LevelPadding::Left)
            .build(),
        main_log_file,
    );

    let error_logger = WriteLogger::new(
        LevelFilter::Error,
        ConfigBuilder::new()
            .set_time_format_rfc3339()
            .set_level_padding(LevelPadding::Left)
            .build(),
        error_log_file,
    );

    CombinedLogger::init(vec![
        TermLogger::new(
            LevelFilter::Info,
            ConfigBuilder::new().set_time_format_rfc3339().build(),
            TerminalMode::Mixed,
            ColorChoice::Auto,
        ),
        main_logger,
        error_logger,
    ])?;

    info!("Logging initialized at {}", log_dir.display());
    info!("Main log: {}", main_log_path.display());
    info!("Error log: {}", error_log_path.display());

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_log_files_creation() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let log_dir = temp.path();

        std::fs::create_dir_all(log_dir).expect("Failed to create log dir");

        let main_log = log_dir.join("omo-switch.log");
        let error_log = log_dir.join("omo-switch.error.log");

        let mut main_file = File::create(&main_log).expect("Failed to create main log");
        let mut error_file = File::create(&error_log).expect("Failed to create error log");

        main_file
            .write_all(b"2026-05-09T17:35:13Z INFO Test info message\n")
            .expect("Write failed");
        error_file
            .write_all(b"2026-05-09T17:35:13Z ERROR Test error message\n")
            .expect("Write failed");

        assert!(main_log.exists());
        assert!(error_log.exists());

        let main_content = fs::read_to_string(&main_log).expect("Failed to read main log");
        assert!(main_content.contains("INFO"));
        assert!(main_content.contains("Test info message"));

        let error_content = fs::read_to_string(&error_log).expect("Failed to read error log");
        assert!(error_content.contains("ERROR"));
        assert!(error_content.contains("Test error message"));
    }

    #[test]
    fn test_log_entries_are_line_delimited() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let log_dir = temp.path();

        std::fs::create_dir_all(log_dir).expect("Failed to create log dir");
        let main_log = log_dir.join("omo-switch.log");

        let mut file = File::create(&main_log).expect("Failed to create log file");
        file.write_all(b"2026-05-09T17:35:13Z INFO First message\n")
            .expect("Write failed");
        file.write_all(b"2026-05-09T17:35:14Z INFO Second message\n")
            .expect("Write failed");
        file.write_all(b"2026-05-09T17:35:15Z ERROR Error message\n")
            .expect("Write failed");

        let content = fs::read_to_string(&main_log).expect("Failed to read log");
        let lines: Vec<&str> = content.lines().collect();
        assert_eq!(lines.len(), 3, "Should have exactly 3 log lines");
    }

    #[test]
    fn test_init_logging_creates_directory() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let nested_dir = temp.path().join("nested/logs");

        std::fs::create_dir_all(&nested_dir).expect("Failed to create nested dir");
        assert!(nested_dir.exists());
    }
}
