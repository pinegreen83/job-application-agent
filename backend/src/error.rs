use serde::Serialize;

/// Only fixed codes/messages cross IPC. Native errors and paths stay private.
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
pub(crate) struct CommandError {
    pub(crate) code: &'static str,
    pub(crate) message: &'static str,
}

pub(crate) const INVALID_RECORD: CommandError = CommandError {
    code: "INVALID_RECORD",
    message: "합성 레코드의 형식과 입력 범위를 확인해 주세요.",
};
pub(crate) const STORAGE_UNAVAILABLE: CommandError = CommandError {
    code: "STORAGE_UNAVAILABLE",
    message: "로컬 저장소를 열 수 없습니다. 기존 데이터는 초기화하지 않습니다.",
};
pub(crate) const UNSUPPORTED_SCHEMA: CommandError = CommandError {
    code: "UNSUPPORTED_SCHEMA",
    message: "지원하지 않는 저장소 버전입니다. 기존 데이터는 초기화하지 않습니다.",
};
pub(crate) const SAVE_FAILED: CommandError = CommandError {
    code: "SAVE_FAILED",
    message: "저장하지 못했습니다. 마지막 확인 저장본을 유지합니다.",
};
pub(crate) const LOAD_FAILED: CommandError = CommandError {
    code: "LOAD_FAILED",
    message: "저장본을 읽지 못했습니다. 마지막 확인 저장본을 유지합니다.",
};
pub(crate) const SIMULATED_SAVE_FAILURE: CommandError = CommandError {
    code: "SIMULATED_SAVE_FAILURE",
    message: "개발용 저장 실패를 발생시켜 변경을 되돌렸습니다.",
};
