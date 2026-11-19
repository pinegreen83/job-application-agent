use crate::{
    error::CommandError,
    provider::{self, MockOutcome, MockService, MockTicket, INVALID_REQUEST},
};
use tauri::{
    ipc::{InvokeBody, Request},
    State,
};

fn json_body<'a>(request: &'a Request<'_>) -> Result<&'a serde_json::Value, CommandError> {
    match request.body() {
        InvokeBody::Json(value) => Ok(value),
        InvokeBody::Raw(_) => Err(INVALID_REQUEST),
    }
}
#[tauri::command]
pub(crate) fn m0_start_mock(
    request: Request<'_>,
    mock: State<'_, MockService>,
) -> Result<MockTicket, CommandError> {
    mock.start(provider::parse_start(json_body(&request)?)?)
}
#[tauri::command]
pub(crate) async fn m0_mock_result(
    request: Request<'_>,
    mock: State<'_, MockService>,
) -> Result<MockOutcome, CommandError> {
    let id = provider::parse_id(json_body(&request)?)?;
    let receiver = mock.subscribe(&id)?;
    provider::wait_for_outcome(receiver).await
}
#[tauri::command]
pub(crate) fn m0_cancel_mock(
    request: Request<'_>,
    mock: State<'_, MockService>,
) -> Result<MockTicket, CommandError> {
    mock.cancel(&provider::parse_id(json_body(&request)?)?)
}
