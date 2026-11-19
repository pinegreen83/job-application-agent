#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // No application commands, plugins, managed state, or external clients in M0-A.
    // Builder owns the event loop; startup failures remain explicit to the developer.
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to start the development application");
}
