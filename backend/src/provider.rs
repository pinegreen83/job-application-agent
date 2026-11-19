//! Synthetic Provider contract. No HTTP, keys, files, or persistence.
use crate::error::CommandError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Mutex;
use tokio::sync::watch;
use uuid::Uuid;

pub(crate) const SOURCE: &str = "synthetic-m0-001";
pub(crate) const MODEL: &str = "mock-synthetic-v1";
const fn error(code: &'static str, message: &'static str) -> CommandError {
    CommandError { code, message }
}
pub(crate) const INVALID_REQUEST: CommandError = error(
    "INVALID_MOCK_REQUEST",
    "합성 Mock 요청의 형식과 선택값을 확인해 주세요.",
);
const BUSY: CommandError = error(
    "MOCK_BUSY",
    "진행 중인 합성 요청을 먼저 완료하거나 취소해 주세요.",
);
const UNKNOWN: CommandError = error("UNKNOWN_REQUEST", "현재 합성 요청을 찾을 수 없습니다.");
const NOT_RUNNING: CommandError =
    error("NOT_RUNNING", "이미 종료된 합성 요청은 취소할 수 없습니다.");
const UNAVAILABLE: CommandError = error("MOCK_UNAVAILABLE", "합성 Mock 상태를 확인할 수 없습니다.");
const CANCELLED: CommandError = error(
    "CANCELLED",
    "합성 요청을 취소했습니다. 기존 저장본은 변경하지 않았습니다.",
);
const INCOMPLETE: CommandError = error(
    "INCOMPLETE_RESPONSE",
    "합성 응답이 불완전하여 완료 결과로 처리하지 않았습니다.",
);

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum Operation {
    Analyze,
    Evaluate,
    Generate,
    Review,
}

#[derive(Clone, Copy, Debug, Deserialize)]
enum Model {
    #[serde(rename = "mock-synthetic-v1")]
    Synthetic,
    #[serde(rename = "mock-unsupported")]
    Unsupported,
}
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum Scenario {
    Success,
    ConnectionError,
    NetworkError,
    QuotaExceeded,
    IncompleteResponse,
    WaitForCancel,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MockRequest {
    source_id: String,
    operation: Operation,
    model_id: Model,
    scenario: Scenario,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct StartArguments {
    request: MockRequest,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct IdArguments {
    request_id: String,
}

pub(crate) fn parse_start(body: &Value) -> Result<MockRequest, CommandError> {
    let request = StartArguments::deserialize(body)
        .map_err(|_| INVALID_REQUEST)?
        .request;
    if request.source_id != SOURCE {
        return Err(INVALID_REQUEST);
    }
    Ok(request)
}
pub(crate) fn parse_id(body: &Value) -> Result<String, CommandError> {
    let id = IdArguments::deserialize(body)
        .map_err(|_| INVALID_REQUEST)?
        .request_id;
    if id.len() != 36 || Uuid::parse_str(&id).is_err() {
        return Err(INVALID_REQUEST);
    }
    Ok(id)
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MockTicket {
    pub(crate) request_id: String,
    pub(crate) operation: Operation,
}
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MockOutput {
    kind: Operation,
    summary: &'static str,
    source_id: &'static str,
}
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MockResult {
    synthetic: bool,
    model_id: &'static str,
    prompt_version: &'static str,
    output: MockOutput,
}
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub(crate) enum Completion {
    Succeeded { result: MockResult },
    Failed { error: CommandError },
    Cancelled { error: CommandError },
}
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MockOutcome {
    pub(crate) request_id: String,
    pub(crate) operation: Operation,
    #[serde(flatten)]
    pub(crate) completion: Completion,
}

// Raw response is not serializable: only a validated output may cross IPC.
struct RawOutput {
    kind: Option<Operation>,
    summary: Option<&'static str>,
    source_id: Option<&'static str>,
}
fn validate_output(operation: Operation, raw: RawOutput) -> Result<MockOutput, CommandError> {
    if raw.kind != Some(operation) || raw.source_id != Some(SOURCE) {
        return Err(INCOMPLETE);
    }
    let summary = raw
        .summary
        .filter(|value| !value.trim().is_empty())
        .ok_or(INCOMPLETE)?;
    Ok(MockOutput {
        kind: operation,
        summary,
        source_id: SOURCE,
    })
}

struct MockProvider;
impl MockProvider {
    fn initial_completion(request: &MockRequest) -> Option<Completion> {
        let failed = |error| Some(Completion::Failed { error });
        if let Model::Unsupported = request.model_id {
            return failed(error("UNSUPPORTED_MODEL", "지원하지 않는 가상 모델입니다."));
        }
        match request.scenario {
            Scenario::ConnectionError => {
                failed(error("CONNECTION_ERROR", "합성 공급자 연결 오류입니다."))
            }
            Scenario::NetworkError => failed(error("NETWORK_ERROR", "합성 네트워크 오류입니다.")),
            Scenario::QuotaExceeded => {
                failed(error("QUOTA_EXCEEDED", "합성 요청 한도 오류입니다."))
            }
            Scenario::WaitForCancel => None,
            Scenario::Success | Scenario::IncompleteResponse => {
                let summary = match request.operation {
                    Operation::Analyze => "고정 합성 공고 분석 예시",
                    Operation::Evaluate => "고정 합성 적합성 평가 예시",
                    Operation::Generate => "고정 합성 초안 생성 예시",
                    Operation::Review => "고정 합성 검토 예시 · 사람 승인 아님",
                };
                let raw = RawOutput {
                    kind: Some(request.operation),
                    source_id: Some(SOURCE),
                    summary: if matches!(request.scenario, Scenario::IncompleteResponse) {
                        None
                    } else {
                        Some(summary)
                    },
                };
                Some(match validate_output(request.operation, raw) {
                    Ok(output) => Completion::Succeeded {
                        result: MockResult {
                            synthetic: true,
                            model_id: MODEL,
                            prompt_version: "m0-mock-v1",
                            output,
                        },
                    },
                    Err(error) => Completion::Failed { error },
                })
            }
        }
    }
}

struct MockJob {
    ticket: MockTicket,
    sender: watch::Sender<Option<MockOutcome>>,
}
#[derive(Default)]
pub(crate) struct MockService {
    current: Mutex<Option<MockJob>>,
}
impl MockService {
    pub(crate) fn start(&self, request: MockRequest) -> Result<MockTicket, CommandError> {
        let mut state = self.current.lock().map_err(|_| UNAVAILABLE)?;
        if state
            .as_ref()
            .is_some_and(|job| job.sender.borrow().is_none())
        {
            return Err(BUSY);
        }
        let ticket = MockTicket {
            request_id: Uuid::new_v4().to_string(),
            operation: request.operation,
        };
        let initial = MockProvider::initial_completion(&request).map(|completion| MockOutcome {
            request_id: ticket.request_id.clone(),
            operation: ticket.operation,
            completion,
        });
        let (sender, _) = watch::channel(initial);
        *state = Some(MockJob {
            ticket: ticket.clone(),
            sender,
        });
        Ok(ticket)
    }
    pub(crate) fn subscribe(
        &self,
        id: &str,
    ) -> Result<watch::Receiver<Option<MockOutcome>>, CommandError> {
        let state = self.current.lock().map_err(|_| UNAVAILABLE)?;
        let job = state
            .as_ref()
            .filter(|job| job.ticket.request_id == id)
            .ok_or(UNKNOWN)?;
        // Clone an owned receiver; release the mutex before the caller awaits.
        Ok(job.sender.subscribe())
    }
    pub(crate) fn cancel(&self, id: &str) -> Result<MockTicket, CommandError> {
        let state = self.current.lock().map_err(|_| UNAVAILABLE)?;
        let job = state
            .as_ref()
            .filter(|job| job.ticket.request_id == id)
            .ok_or(UNKNOWN)?;
        if job.sender.borrow().is_some() {
            return Err(NOT_RUNNING);
        }
        // Keep the terminal outcome even if result() has not subscribed yet.
        job.sender.send_replace(Some(MockOutcome {
            request_id: id.to_owned(),
            operation: job.ticket.operation,
            completion: Completion::Cancelled { error: CANCELLED },
        }));
        Ok(job.ticket.clone())
    }
}

pub(crate) async fn wait_for_outcome(
    mut receiver: watch::Receiver<Option<MockOutcome>>,
) -> Result<MockOutcome, CommandError> {
    loop {
        let snapshot = { receiver.borrow().clone() };
        if let Some(outcome) = snapshot {
            return Ok(outcome);
        }
        receiver.changed().await.map_err(|_| UNAVAILABLE)?;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::{
        future::Future,
        sync::{
            atomic::{AtomicUsize, Ordering},
            Arc,
        },
        task::{Context, Poll, Wake, Waker},
    };
    #[derive(Default)]
    struct CountWake(AtomicUsize);
    impl Wake for CountWake {
        fn wake(self: Arc<Self>) {
            self.0.fetch_add(1, Ordering::SeqCst);
        }
    }
    fn request(operation: &str, scenario: &str, model: &str) -> MockRequest {
        parse_start(&json!({"request":{"sourceId":SOURCE,"operation":operation,"modelId":model,"scenario":scenario}})).unwrap()
    }
    fn outcome(service: &MockService, id: &str) -> MockOutcome {
        let mut future = Box::pin(wait_for_outcome(service.subscribe(id).unwrap()));
        match future
            .as_mut()
            .poll(&mut Context::from_waker(Waker::noop()))
        {
            Poll::Ready(Ok(value)) => value,
            _ => panic!("expected terminal result"),
        }
    }
    #[test]
    fn four_operations_have_distinct_ids_and_complete_synthetic_metadata() {
        let service = MockService::default();
        let mut ids = std::collections::HashSet::new();
        for operation in ["analyze", "evaluate", "generate", "review"] {
            let ticket = service.start(request(operation, "success", MODEL)).unwrap();
            assert!(ids.insert(ticket.request_id.clone()));
            let value = serde_json::to_value(outcome(&service, &ticket.request_id)).unwrap();
            assert_eq!(value["requestId"], ticket.request_id);
            assert_eq!(value["operation"], operation);
            assert_eq!(value["status"], "succeeded");
            assert_eq!(value["result"]["output"]["kind"], operation);
            assert_eq!(value["result"]["output"]["sourceId"], SOURCE);
            assert_eq!(value["result"]["synthetic"], true);
            assert_eq!(value["result"]["modelId"], MODEL);
            assert_eq!(value["result"]["promptVersion"], "m0-mock-v1");
        }
    }
    #[test]
    fn failures_are_distinct_and_incomplete_output_cannot_be_success() {
        let service = MockService::default();
        for (scenario, model, code) in [
            ("connection_error", MODEL, "CONNECTION_ERROR"),
            ("network_error", MODEL, "NETWORK_ERROR"),
            ("quota_exceeded", MODEL, "QUOTA_EXCEEDED"),
            ("success", "mock-unsupported", "UNSUPPORTED_MODEL"),
            ("incomplete_response", MODEL, "INCOMPLETE_RESPONSE"),
        ] {
            let ticket = service.start(request("generate", scenario, model)).unwrap();
            let value = serde_json::to_value(outcome(&service, &ticket.request_id)).unwrap();
            assert_eq!(value["status"], "failed");
            assert_eq!(value["error"]["code"], code);
            assert!(value.get("result").is_none());
        }
        for raw in [
            RawOutput {
                kind: None,
                summary: Some("synthetic"),
                source_id: Some(SOURCE),
            },
            RawOutput {
                kind: Some(Operation::Analyze),
                summary: Some(" "),
                source_id: Some(SOURCE),
            },
            RawOutput {
                kind: Some(Operation::Review),
                summary: Some("synthetic"),
                source_id: Some(SOURCE),
            },
        ] {
            assert_eq!(validate_output(Operation::Analyze, raw), Err(INCOMPLETE));
        }
    }
    #[test]
    fn cancellation_wakes_real_pending_future_and_preserves_identity_after_replacement() {
        let service = MockService::default();
        let first = service
            .start(request("review", "wait_for_cancel", MODEL))
            .unwrap();
        let mut pending = Box::pin(wait_for_outcome(
            service.subscribe(&first.request_id).unwrap(),
        ));
        let wakes = Arc::new(CountWake::default());
        let waker = Waker::from(wakes.clone());
        let mut context = Context::from_waker(&waker);
        assert!(pending.as_mut().poll(&mut context).is_pending());
        assert_eq!(
            service.start(request("analyze", "success", MODEL)),
            Err(BUSY)
        );
        let before = wakes.0.load(Ordering::SeqCst);
        service.cancel(&first.request_id).unwrap();
        assert!(
            wakes.0.load(Ordering::SeqCst) > before,
            "cancellation must notify the pending task"
        );
        assert_eq!(service.cancel(&first.request_id), Err(NOT_RUNNING));
        let second = service.start(request("analyze", "success", MODEL)).unwrap();
        let result = match pending.as_mut().poll(&mut context) {
            Poll::Ready(Ok(value)) => value,
            _ => panic!("cancel did not wake pending result"),
        };
        assert_eq!(result.request_id, first.request_id);
        assert_eq!(
            result.completion,
            Completion::Cancelled { error: CANCELLED }
        );
        assert!(matches!(service.subscribe(&first.request_id), Err(UNKNOWN)));
        let completed = outcome(&service, &second.request_id);
        assert_eq!(service.cancel(&second.request_id), Err(NOT_RUNNING));
        assert_eq!(outcome(&service, &second.request_id), completed);
        assert_eq!(
            service.cancel("00000000-0000-4000-8000-000000000001"),
            Err(UNKNOWN)
        );
    }
    #[test]
    fn cancel_before_result_subscription_is_retained_and_bad_inputs_do_not_reflect_data() {
        let service = MockService::default();
        let ticket = service
            .start(request("analyze", "wait_for_cancel", MODEL))
            .unwrap();
        service.cancel(&ticket.request_id).unwrap();
        assert_eq!(
            outcome(&service, &ticket.request_id).completion,
            Completion::Cancelled { error: CANCELLED }
        );
        for body in [
            json!({}),
            json!({"request":null}),
            json!({"request":{"sourceId":SOURCE,"operation":"wrong","modelId":MODEL,"scenario":"success"}}),
            json!({"request":{"sourceId":"other","operation":"analyze","modelId":MODEL,"scenario":"success"}}),
            json!({"request":{"sourceId":SOURCE,"operation":"analyze","modelId":"synthetic-secret-model","scenario":"success"}}),
            json!({"request":{"sourceId":SOURCE,"operation":"analyze","modelId":MODEL,"scenario":"unknown"}}),
            json!({"request":{"operation":"analyze","modelId":MODEL,"scenario":"success"}}),
            json!({"request":{"sourceId":SOURCE,"operation":"analyze","modelId":MODEL,"scenario":"success"},"extra":"synthetic-secret"}),
            json!({"request":{"sourceId":SOURCE,"operation":"analyze","modelId":MODEL,"scenario":"success","apiKey":"synthetic-secret-never-reflect"}}),
        ] {
            let error = parse_start(&body).unwrap_err();
            assert_eq!(error, INVALID_REQUEST);
            assert!(!serde_json::to_string(&error)
                .unwrap()
                .contains("synthetic-secret"));
        }
        for body in [
            json!({"requestId":"synthetic-secret"}),
            json!({"requestId":4}),
            json!({"requestId":"00000000-0000-4000-8000-000000000001","extra":true}),
        ] {
            assert_eq!(parse_id(&body), Err(INVALID_REQUEST));
        }
    }
}
