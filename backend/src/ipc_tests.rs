//! These exercise the real handler and generated ACL with MockRuntime.
//! Native WebView transport/CSP still require per-OS smoke verification.
use serde_json::{json, Value};
use tauri::{ipc::InvokeBody, test::MockRuntime, webview::InvokeRequest, WebviewWindow};

fn invoke(
    window: &WebviewWindow<MockRuntime>,
    url: &str,
    command: &str,
    body: InvokeBody,
) -> Result<Value, Value> {
    tauri::test::get_ipc_response(
        window,
        InvokeRequest {
            cmd: command.into(),
            callback: tauri::ipc::CallbackFn(0),
            error: tauri::ipc::CallbackFn(1),
            url: url.parse().unwrap(),
            body,
            headers: Default::default(),
            invoke_key: tauri::test::INVOKE_KEY.into(),
        },
    )
    .map(|response| response.deserialize::<Value>().unwrap())
}

#[test]
fn real_handler_and_acl_enforce_input_origin_and_window_boundaries() {
    let app = super::application(tauri::test::mock_builder())
        .build(tauri::generate_context!())
        .unwrap();
    let main = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    let other = tauri::WebviewWindowBuilder::new(&app, "other", Default::default())
        .build()
        .unwrap();
    let local = if cfg!(windows) {
        "http://tauri.localhost"
    } else {
        "tauri://localhost"
    };
    let body = json!({"record": {"id": "synthetic-m0-001", "text": "합성 IPC 🦀"}});
    assert_eq!(
        invoke(&main, local, "m0_validate_record", body.clone().into()).unwrap(),
        json!({"id": "synthetic-m0-001", "text": "합성 IPC 🦀", "status": "validated"})
    );

    for invalid in [
        json!({}),
        json!({"record": {"id": "synthetic-m0-001", "text": 5}}),
        json!({"record": {"id": "synthetic-m0-001", "text": "a".repeat(257)}}),
        json!({"record": {"id": "synthetic-m0-001", "text": "ok", "synthetic-secret": "must-not-leak"}}),
    ] {
        let error = invoke(&main, local, "m0_validate_record", invalid.into()).unwrap_err();
        assert_eq!(error["code"], "INVALID_RECORD");
        assert!(!error.to_string().contains("must-not-leak"));
    }
    assert_eq!(
        invoke(
            &main,
            local,
            "m0_validate_record",
            InvokeBody::Raw(b"{not-json".to_vec())
        )
        .unwrap_err()["code"],
        "INVALID_RECORD"
    );

    for (window, origin) in [(&other, local), (&main, "https://example.invalid")] {
        let error = invoke(window, origin, "m0_validate_record", body.clone().into()).unwrap_err();
        assert!(error.as_str().unwrap().contains("not allowed"), "{error}");
    }
    // Core app/version is registered by Tauri: denial proves ACL, not absence.
    for command in [
        "plugin:app|version",
        "plugin:path|resolve_directory",
        "plugin:fs|read_text_file",
        "plugin:shell|execute",
        "m0_unregistered",
    ] {
        let error = invoke(&main, local, command, json!({}).into()).unwrap_err();
        assert!(
            error.as_str().unwrap().contains("not allowed"),
            "{command}: {error}"
        );
    }
}
