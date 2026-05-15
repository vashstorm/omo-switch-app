pub mod contracts;
pub mod errors;
pub mod global_config;
pub mod jsonc_edit;
pub mod logging;
pub mod paths;
pub mod profiles;

use tauri_plugin_window_state::{Builder as WindowStateBuilder, StateFlags};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::Builder::new().build())
        .plugin(
            WindowStateBuilder::new()
                .with_state_flags(StateFlags::SIZE)
                .build(),
        )
        .setup(|app| {
            let paths = paths::AppPaths::from_tauri(app.handle())?;
            paths.bootstrap_config_if_missing()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            profiles::list_profiles,
            profiles::get_profile,
            profiles::save_profile,
            profiles::update_disabled_providers,
            profiles::copy_profile,
            global_config::get_global_config,
            global_config::update_global_config,
            global_config::get_error_logs,
            global_config::get_providers,
            global_config::create_provider,
            global_config::create_model,
            global_config::update_model,
            global_config::delete_model,
            global_config::delete_provider,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
