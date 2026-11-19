mod commands;
mod error;
mod provider;
mod provider_commands;
mod record;
mod storage;

fn application<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
        .manage(provider::MockService::default())
        .setup(|app| {
            use tauri::Manager;
            // Tests seed an isolated path before setup. Renderer cannot alter it.
            if app.try_state::<storage::StorageLocation>().is_none() {
                let path = app
                    .path()
                    .app_local_data_dir()
                    .map(|directory| directory.join("m0").join("synthetic.sqlite3"))
                    .map_err(|_| error::STORAGE_UNAVAILABLE);
                app.manage(storage::StorageLocation::new(path));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::m0_validate_record,
            commands::m0_save_record,
            commands::m0_load_record,
            commands::m0_simulate_save_failure,
            provider_commands::m0_start_mock,
            provider_commands::m0_mock_result,
            provider_commands::m0_cancel_mock,
        ])
}

fn application_context<R: tauri::Runtime>() -> tauri::Context<R> {
    // Expand once: macOS embeds a single process-wide Info.plist symbol.
    // Both the native app and MockRuntime tests use the same config and ACL.
    tauri::generate_context!()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Native code owns the DB path. No file/shell/HTTP plugins or external clients.
    application(tauri::Builder::default())
        .run(application_context())
        .expect("failed to start the development application");
}

#[cfg(test)]
mod ipc_tests;
