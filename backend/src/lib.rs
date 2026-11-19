mod commands;

fn application<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![commands::m0_validate_record])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // No file/shell/HTTP plugins, shared state, or external clients in M0-B.
    application(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("failed to start the development application");
}

#[cfg(test)]
mod ipc_tests;
