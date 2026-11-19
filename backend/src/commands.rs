use crate::{
    error::{CommandError, INVALID_RECORD, STORAGE_UNAVAILABLE},
    record::{validate_body, SyntheticRecord},
    storage::{SaveMode, StorageLocation},
};
use serde::Serialize;
use tauri::{
    ipc::{InvokeBody, Request},
    State,
};

#[derive(Serialize)]
pub(crate) struct RecordResponse {
    #[serde(flatten)]
    record: SyntheticRecord,
    status: &'static str,
}

fn record_request(request: Request<'_>) -> Result<SyntheticRecord, CommandError> {
    match request.body() {
        InvokeBody::Json(body) => validate_body(body),
        InvokeBody::Raw(_) => Err(INVALID_RECORD),
    }
}

#[tauri::command]
pub(crate) fn m0_validate_record(request: Request<'_>) -> Result<RecordResponse, CommandError> {
    Ok(RecordResponse {
        record: record_request(request)?,
        status: "validated",
    })
}

async fn save(
    record: SyntheticRecord,
    location: StorageLocation,
    mode: SaveMode,
) -> Result<RecordResponse, CommandError> {
    // Own only the validated record and trusted path across await. Connection is
    // opened, used, and dropped entirely on the blocking worker.
    let record = tauri::async_runtime::spawn_blocking(move || location.save(record, mode))
        .await
        .map_err(|_| STORAGE_UNAVAILABLE)??;
    Ok(RecordResponse {
        record,
        status: "saved",
    })
}

#[tauri::command]
pub(crate) async fn m0_save_record(
    request: Request<'_>,
    storage: State<'_, StorageLocation>,
) -> Result<RecordResponse, CommandError> {
    save(
        record_request(request)?,
        storage.inner().clone(),
        SaveMode::Commit,
    )
    .await
}

#[tauri::command]
pub(crate) async fn m0_simulate_save_failure(
    request: Request<'_>,
    storage: State<'_, StorageLocation>,
) -> Result<RecordResponse, CommandError> {
    save(
        record_request(request)?,
        storage.inner().clone(),
        SaveMode::RollbackForVerification,
    )
    .await
}

#[tauri::command]
pub(crate) async fn m0_load_record(
    request: Request<'_>,
    storage: State<'_, StorageLocation>,
) -> Result<Option<SyntheticRecord>, CommandError> {
    match request.body() {
        InvokeBody::Json(serde_json::Value::Object(fields)) if fields.is_empty() => {}
        _ => return Err(INVALID_RECORD),
    }
    let location = storage.inner().clone();
    tauri::async_runtime::spawn_blocking(move || location.load())
        .await
        .map_err(|_| STORAGE_UNAVAILABLE)?
}
