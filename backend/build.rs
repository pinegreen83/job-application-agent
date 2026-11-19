fn main() {
    if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        // MockRuntime still links native menus. Unit-test executables need the
        // Common Controls v6 activation context too (TaskDialogIndirect).
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'");
    }
    // Declaring the app manifest makes application commands subject to ACL too.
    let mut attributes =
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "m0_validate_record",
            "m0_save_record",
            "m0_load_record",
            "m0_simulate_save_failure",
        ]));
    if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        // The linker embeds the same Common Controls dependency in every
        // executable. Do not embed a second resource manifest in the app binary.
        attributes = attributes
            .windows_attributes(tauri_build::WindowsAttributes::new_without_app_manifest());
    }
    tauri_build::try_build(attributes).expect("failed to build application permissions");
}
