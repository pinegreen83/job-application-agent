# M0-D Provider Mock 검증 기록

관련: [Issue #14](https://github.com/pinegreen83/job-application-agent/issues/14), AC-M0-04, [공통 계약](../PROVIDER_CONTRACT.md). 기록일: 2026-11-19.

검증된 SQLite `d31e390` 위의 `feat/14-provider-mock-contract`에서 구현했다. PR #13은 기능 브랜치에 병합됐으므로 main 통합은 별도 PR #15로 관리한다. head별 CI와 병합 상태는 연결 PR 및 [작업 상태](../WORK_STATUS.md)를 따른다. 자동 merge/공개 Release/실제 AI 호출은 하지 않았다.

## Windows 자동 검사

환경: Windows NT 10.0.26200 x64, Node 24.22.3/npm 11.10.1, Rust/Cargo 1.100.0, MSVC 14.44.35207, WebView2 157.0.4341.60.

| 검사 | 결과 |
|---|---|
| `npm run check`, `npm run build` | 타입·설정·frontend build 통과 |
| `npm test` | desktop/narrow Chromium 48건 통과. Mock UI 26건은 renderer 시뮬레이션이며 native 증거가 아님 |
| `cargo fmt --manifest-path backend/Cargo.toml -- --check` | 포맷 적용 후 검사 통과 |
| `cargo test --manifest-path backend/Cargo.toml --locked` | 16건 통과(기존 11 + Mock 계약 4 + 실제 handler/ACL·DB 보존 통합 1) |
| `cargo check --manifest-path backend/Cargo.toml --locked` | 통과 |
| `cargo clippy --manifest-path backend/Cargo.toml --locked --all-targets -- -D warnings` | 통과 |
| `npm run tauri build -- --debug --no-bundle --ci -- --locked` | Windows native build 통과 |

취소 테스트는 실제 Future를 Pending으로 poll한 뒤 취소 신호가 waker를 호출했는지 확인하고 Ready/CANCELLED를 검증한다. 임의 sleep/시간 경과로 취소를 흉내 내지 않는다. 구독 전 취소 보존, 중복 시작, 완료 상태 불변, 이전 receiver/새 요청 ID 분리도 검사했다.

IPC 통합은 격리 DB에 정상 합성 레코드를 저장하고 4종 정상·5종 오류·취소·main/다른 창/remote 권한·입력 비반사를 확인했다. 실패/취소 뒤 DB를 재조회해 기존 값이 같고 완료본이 새로 저장되지 않음을 검사했다. 실제 사용자 DB나 키는 테스트 fixture로 사용하지 않았다.

개발 중 Request 본문 반환 빌림 수명을 명시했고, MockRuntime의 build에서도 state가 등록되도록 MockService를 공통 Builder의 manage에 두었다. 처음 IPC 통합의 state 누락 실패를 이 방식으로 해결했다. clippy 권고에 따라 단순 ready 검사에는 표준 Waker::noop을, 실제 취소 검사에는 wake 횟수를 세는 waker를 사용했다. 실패 검사를 비활성화하지 않았다.

## Windows 실제 앱

production CSP의 `http://tauri.localhost/`에서 빌드 exe를 실행했다.

1. 기존 합성 저장본 `합성 M0-C 저장 복원 🦀`이 표시됨을 확인했다.
2. **Mock 계약 검사 실행 → 10/10 통과**를 직접 관찰했다. analyze/evaluate/generate/review 정상, 연결/네트워크/쿼터/미지원/불완전 응답 오류, 실제 취소·중복 시작 거부와 각 저장본 보존을 포함한다. 검사는 DB 읽기 비교만 수행한다.
3. 별도로 시나리오를 `wait_for_cancel`로 선택하고 시작→등록 ID/처리 중·시작 버튼 비활성→취소 버튼→CANCELLED·시작 재활성/취소 비활성을 확인했다.
4. 기존 저장본 표시는 원래 합성 값으로 유지됐으며 앱 창을 닫아 창 부재를 확인했다.

HTML select 팝업의 항목 클릭은 WebView child window 대상으로 인식돼 도구가 거부했다. 새 상태를 관찰한 뒤 같은 앱의 키보드 선택으로 정상 진행했다. 타 앱·Codex·인증·보안 UI는 조작하지 않았다.

## macOS / 남은 Gate

실기기 **미검증**, 현재 기기 사용 불가로 Issue #19에 보류한다. CI 성공은 WKWebView 실제 취소·저장본 보존 증거로 확대하지 않는다. 후속 상태(2026-11-19): #15/#16/#18/#20이 모두 사용자 main 병합됐고 Windows 통합·양쪽 OS CI를 마쳤다. [최신 결과](M0_RESULTS.md)를 따르며 전체 Gate는 Mac 미검증으로 미통과다. 위 개별 검증은 M0-D 당시 source/환경 기록이다.
