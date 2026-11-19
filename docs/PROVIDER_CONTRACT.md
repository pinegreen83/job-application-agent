# M0-D 합성 Provider Mock 계약

근거: [Issue #14](https://github.com/pinegreen83/job-application-agent/issues/14), AC-M0-04, FR-004-01/02/07, AC-004-04/06/07의 Mock 부분, NFR-003/006/011. 사용자가 2026-11-19 해당 구현·검증 진행을 지시했다.

실제 HTTP·계정·키·모델 호출은 없다. 이 Mock 성공은 실제 AI 품질, 공급자 연결, 초안 저장, 독립 AI 리뷰 또는 제품 전체 Spec 완료 증거가 아니다. 실제 공급자와 작업별 출력 schema는 M1 및 해당 기능에서 별도 확정한다.

## 요청과 결과

```text
m0_start_mock({ request: { sourceId, operation, modelId, scenario } })
  → { requestId, operation }
m0_mock_result({ requestId })
  → { requestId, operation, status, result? / error? }
m0_cancel_mock({ requestId })
  → { requestId, operation } 또는 고정 오류
```

- sourceId는 `synthetic-m0-001` 하나만 허용한다. 임의 원문·endpoint·API key는 받지 않는다.
- operation은 `analyze/evaluate/generate/review`. 요청 ID는 Rust가 UUID v4로 생성한다. 생성과 리뷰는 별도 요청·결과 ID로 식별한다.
- modelId는 `mock-synthetic-v1` 또는 미지원 오류 검사용 `mock-unsupported`. 실제 첫 모델 선택이 아니다.
- scenario는 `success/connection_error/network_error/quota_exceeded/incomplete_response/wait_for_cancel`.
- 누락·타입·enum·추가 필드·다른 source/잘못된 ID 형식은 `INVALID_MOCK_REQUEST`. 역직렬화 원문/오류를 반사하지 않는다.
- 정상 result는 `synthetic: true`, 고정 `modelId: mock-synthetic-v1`, `promptVersion: m0-mock-v1`, `output: { kind, summary, sourceId }`다. kind는 operation과 일치한다. summary는 작업별 고정 합성 예시다.
- 정상 결과만 `status: succeeded`와 result를 가진다. 실패는 `status: failed`, 취소는 `status: cancelled`와 고정 error를 가지며 result는 없다.

| 사례 | 오류 코드 |
|---|---|
| 연결 | `CONNECTION_ERROR` |
| 네트워크 | `NETWORK_ERROR` |
| 쿼터 | `QUOTA_EXCEEDED` |
| 미지원 가상 모델 | `UNSUPPORTED_MODEL` |
| 불완전 응답 | `INCOMPLETE_RESPONSE` |
| 실제 취소 | `CANCELLED` |
| 진행 중 중복 시작 | `MOCK_BUSY` |
| 미지/지난 요청 | `UNKNOWN_REQUEST` |
| 종료된 요청 취소 | `NOT_RUNNING` |

불완전 응답은 내부 비직렬화 raw output으로 만들고, kind/source/summary를 검사해 고정 오류로 바꾼다. 불완전 raw 구조가 성공으로 직렬화되지 않는다. 오류/화면에는 고정 코드·안내만 쓰고 네이티브 세부 오류·원문·키를 출력하지 않는다.

## async·소유권·보존

MockService는 진행 중 요청 하나와 마지막 결과 하나만 메모리에 보관한다. start가 ID를 등록한 뒤 반환하므로 UI가 그 ID를 받은 뒤 취소를 활성화한다. 진행 중에는 새 시작을 거부하고, 완료 뒤 다음 요청은 이전 ID를 대체한다. 이전 ID로 새 결과를 조회할 수 없다. 이는 제품의 최종 동시성/이력 보존 정책이 아니다.

짧은 std Mutex 구간에서 상태를 검사·갱신하고 결과 조회는 소유한 watch receiver를 복제해 lock/borrow를 해제한 뒤 await한다. `wait_for_cancel`은 sleep이나 CPU polling 없이 실제 변경 신호를 기다린다. cancel은 `send_replace`로 터미널 결과를 보관하므로 결과 조회가 아직 구독하지 않은 경우도 취소가 유실되지 않는다. 이미 완료된 결과는 취소로 뒤집지 않는다. 이미 대기 중인 이전 receiver는 다음 요청이 시작돼도 자기 요청 ID의 결과만 받는다.

Mock은 DB를 읽거나 쓰지 않는다. UI의 개발용 계약 검사는 기존 SQLite 저장본을 전후로 읽어 비교하지만 쓰지 않는다. 정상·오류·취소 결과 모두 제품 초안/합성 레코드에 자동 저장하지 않는다. 보존 통합 테스트는 격리 DB에 정상 저장본을 준비하고 실패·취소 후 재연결 조회를 비교한다.

IPC 권한은 local main에 위 3개만 추가한다. core/파일/셸/HTTP plugin·remote 권한은 추가하지 않는다. 원문 입력이 없고 가상 모델·합성 데이터만 사용한다.

## 검증 절차

- Rust: 4종 metadata/고유 ID, 5종 오류, raw output 거부, 실제 Future Pending→취소 wake 신호→Ready, 시작 중복/완료 불변/미지·지난 ID/구독 전 취소, 입력/비반사.
- 실제 handler/ACL MockRuntime: 허용 호출·다른 창/remote 거부, 격리 DB의 모든 실패/취소 전후 보존. MockRuntime은 실제 WebView 증거와 구분한다.
- Playwright: desktop/narrow에서 4종 정상, 5종 오류, 등록 후 취소·중복 시작, 잘못된 ID/불완전 성공/네이티브 예외 비반사. renderer 시뮬레이션이며 실제 AI/native 증거가 아니다.
- Windows/macOS CI: 기존 형식·정적·단위/통합·frontend·native build·lock 검사를 실행한다.

실기기에서는 `npm run setup -- --tests` → `npm run tauri dev` 또는 비번들 빌드 exe를 실행한다. 먼저 합성 저장본이 있는지 확인한 뒤 **합성 Provider Mock → 개발용 Mock 계약 검사 → Mock 계약 검사 실행**에서 **10/10 통과**를 확인한다. 4종 정상, 5종 오류, 실제 취소/중복/미지 ID 및 각 저장본 보존을 포함한다. 별도로 `wait_for_cancel`을 선택해 시작→등록 ID/처리 중→취소→CANCELLED를 확인할 수 있다.

Mac 실기기는 사용자 지시에 따라 M0 통합 때 일괄 진행하며 미검증으로 남긴다. 최신 head별 결과는 연결 PR을 따른다. M0-E 기밀 검사와 M0-F OS Gate까지 통과하기 전 M0 전체 완료를 선언하지 않는다.
