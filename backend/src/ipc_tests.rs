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
        .build(super::application_context())
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

#[test]
fn storage_ipc_persists_rolls_back_and_rejects_extra_arguments_or_untrusted_callers() {
    use crate::storage::StorageLocation;
    let directory = tempfile::tempdir().unwrap();
    let location = StorageLocation::new(Ok(directory.path().join("isolated.sqlite3")));
    let app = super::application(tauri::test::mock_builder().manage(location))
        .build(super::application_context())
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
    let original = json!({"id": "synthetic-m0-001", "text": "로컬 합성 🦀"});
    assert_eq!(
        invoke(&main, local, "m0_load_record", json!({}).into()).unwrap(),
        Value::Null
    );
    assert_eq!(
        invoke(
            &main,
            local,
            "m0_save_record",
            json!({"record": original}).into()
        )
        .unwrap()["status"],
        "saved"
    );
    assert_eq!(
        invoke(&main, local, "m0_load_record", json!({}).into()).unwrap(),
        original
    );
    let error = invoke(
        &main,
        local,
        "m0_simulate_save_failure",
        json!({"record": {"id":"synthetic-m0-001", "text":"실패할 합성"}}).into(),
    )
    .unwrap_err();
    assert_eq!(error["code"], "SIMULATED_SAVE_FAILURE");
    assert_eq!(
        invoke(&main, local, "m0_load_record", json!({}).into()).unwrap(),
        original
    );
    for command in [
        "m0_save_record",
        "m0_load_record",
        "m0_simulate_save_failure",
    ] {
        let bad = invoke(
            &main,
            local,
            command,
            json!({"path": "synthetic-private-path", "sql": "not accepted"}).into(),
        )
        .unwrap_err();
        assert_eq!(bad["code"], "INVALID_RECORD");
        assert!(!bad.to_string().contains("synthetic-private-path"));
        for (window, origin) in [(&other, local), (&main, "https://example.invalid")] {
            let error =
                invoke(window, origin, command, json!({"record": original}).into()).unwrap_err();
            assert!(error.as_str().unwrap().contains("not allowed"), "{error}");
        }
    }
    assert_eq!(
        invoke(&main, local, "m0_load_record", json!({}).into()).unwrap(),
        original
    );
}

#[test]
fn mock_ipc_contract_failures_cancellation_and_acl_preserve_existing_database() {
    use crate::storage::StorageLocation;
    let directory = tempfile::tempdir().unwrap();
    let app = super::application(tauri::test::mock_builder().manage(StorageLocation::new(Ok(
        directory.path().join("mock-isolated.sqlite3"),
    ))))
    .build(super::application_context())
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
    let original = json!({"id":"synthetic-m0-001", "text":"Mock 이전 합성 저장본 🦀"});
    invoke(
        &main,
        local,
        "m0_save_record",
        json!({"record":original}).into(),
    )
    .unwrap();
    let input = |operation: &str, scenario: &str, model: &str| json!({"request":{"sourceId":"synthetic-m0-001","operation":operation,"modelId":model,"scenario":scenario}});
    for operation in ["analyze", "evaluate", "generate", "review"] {
        let ticket = invoke(
            &main,
            local,
            "m0_start_mock",
            input(operation, "success", "mock-synthetic-v1").into(),
        )
        .unwrap();
        let result = invoke(
            &main,
            local,
            "m0_mock_result",
            json!({"requestId":ticket["requestId"]}).into(),
        )
        .unwrap();
        assert_eq!(result["status"], "succeeded");
        assert_eq!(result["operation"], operation);
        assert_eq!(result["result"]["output"]["kind"], operation);
        assert_eq!(
            invoke(
                &main,
                local,
                "m0_cancel_mock",
                json!({"requestId":ticket["requestId"]}).into()
            )
            .unwrap_err()["code"],
            "NOT_RUNNING"
        );
    }
    for (scenario, model, code) in [
        ("connection_error", "mock-synthetic-v1", "CONNECTION_ERROR"),
        ("network_error", "mock-synthetic-v1", "NETWORK_ERROR"),
        ("quota_exceeded", "mock-synthetic-v1", "QUOTA_EXCEEDED"),
        ("success", "mock-unsupported", "UNSUPPORTED_MODEL"),
        (
            "incomplete_response",
            "mock-synthetic-v1",
            "INCOMPLETE_RESPONSE",
        ),
    ] {
        let ticket = invoke(
            &main,
            local,
            "m0_start_mock",
            input("generate", scenario, model).into(),
        )
        .unwrap();
        let result = invoke(
            &main,
            local,
            "m0_mock_result",
            json!({"requestId":ticket["requestId"]}).into(),
        )
        .unwrap();
        assert_eq!(result["status"], "failed");
        assert_eq!(result["error"]["code"], code);
        assert!(result.get("result").is_none());
        assert_eq!(
            invoke(&main, local, "m0_load_record", json!({}).into()).unwrap(),
            original
        );
    }
    let waiting = invoke(
        &main,
        local,
        "m0_start_mock",
        input("review", "wait_for_cancel", "mock-synthetic-v1").into(),
    )
    .unwrap();
    assert_eq!(
        invoke(
            &main,
            local,
            "m0_start_mock",
            input("analyze", "success", "mock-synthetic-v1").into()
        )
        .unwrap_err()["code"],
        "MOCK_BUSY"
    );
    invoke(
        &main,
        local,
        "m0_cancel_mock",
        json!({"requestId":waiting["requestId"]}).into(),
    )
    .unwrap();
    let result = invoke(
        &main,
        local,
        "m0_mock_result",
        json!({"requestId":waiting["requestId"]}).into(),
    )
    .unwrap();
    assert_eq!(result["status"], "cancelled");
    assert_eq!(result["error"]["code"], "CANCELLED");
    assert_eq!(
        invoke(&main, local, "m0_load_record", json!({}).into()).unwrap(),
        original
    );
    for command in ["m0_start_mock", "m0_mock_result", "m0_cancel_mock"] {
        let error = invoke(
            &main,
            local,
            command,
            json!({"apiKey":"synthetic-secret-never-reflect"}).into(),
        )
        .unwrap_err();
        assert_eq!(error["code"], "INVALID_MOCK_REQUEST");
        assert!(!error.to_string().contains("synthetic-secret"));
        for (window, origin) in [(&other, local), (&main, "https://example.invalid")] {
            assert!(invoke(window, origin, command, json!({}).into())
                .unwrap_err()
                .as_str()
                .unwrap()
                .contains("not allowed"));
        }
    }
}
