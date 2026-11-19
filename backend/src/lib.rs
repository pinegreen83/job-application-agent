mod commands;

fn application<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![commands::m0_validate_record])
}

fn application_context<R: tauri::Runtime>() -> tauri::Context<R> {
    // Expand once: macOS embeds a single process-wide Info.plist symbol.
    // Both the native app and MockRuntime tests use the same config and ACL.
    tauri::generate_context!()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // No file/shell/HTTP plugins, shared state, or external clients in M0-B.
    application(tauri::Builder::default())
        .run(application_context())
        .expect("failed to start the development application");
}

#[cfg(test)]
mod ipc_tests;
