# M0 통합 검증과 Gate

관련: [Issue #19](https://github.com/pinegreen83/job-application-agent/issues/19), [승인된 M0 계획](../../plans/M0_PLAN.md), AC-M0-01~06, NFR-004/011, FR-006-04, AC-006-06. 기록일: 2026-11-19.

**현재 M0 Gate: 미통과.** Windows 실제 통합과 양쪽 OS CI는 통과했다. Mac 실제 통합 확인 및 사용자 PR 리뷰·main 병합이 남았다. 과거 M0-A Mac 기본 창 성공을 이후 IPC·SQLite·Mock 성공으로 확대하지 않는다.

## 검증 기준과 증거

- 앱 코드/도구 기준: `e27a0d5d7e69645859d46d15432764da9dd9c27a` (M0-E까지 포함). 이 보고서 PR은 해당 source 위의 문서 변경이다.
- [CI run 44468357728](https://github.com/pinegreen83/job-application-agent/actions/runs/44468357728): 위 head의 Windows/macOS 각각 success. scanner self-test, setup/TS·설정/frontend build, Chromium 48건, Rust fmt/check/clippy, Rust 16건, Tauri debug no-bundle build, lockfile 무변경 검사 통과.
- [M0-B IPC](M0_B_RESULTS.md), [M0-C SQLite](M0_C_RESULTS.md), [M0-D Mock](M0_D_RESULTS.md), [M0-E 기밀 검사](M0_E_RESULTS.md)는 개별 구현 증거다. 아래는 같은 최종 source로 다시 확인한 통합 결과다.
- PR #13의 SQLite가 기능 브랜치로 병합된 점을 발견했다. main 통합은 [#15](https://github.com/pinegreen83/job-application-agent/pull/15) → [#16](https://github.com/pinegreen83/job-application-agent/pull/16) → [#18](https://github.com/pinegreen83/job-application-agent/pull/18) → 이 보고서 순서로 사용자 검토한다. main ancestry를 확인하기 전 의존 브랜치를 지우지 않는다.

| AC | Windows 실제 실행 / 자동 검사 | macOS |
|---|---|---|
| AC-M0-01 개발 실행·합성 화면 | 문서화한 환경에서 debug exe 창·키 없는 합성 화면 확인 | M0-A 당시 사용자 확인 완료. 최종 통합 source 실행은 미검증 |
| AC-M0-02 IPC·최소 권한 | 정상 입력 성공, 빈 입력 `INVALID_RECORD`, 실제 경계 검사 12/12 | CI handler/ACL 테스트 통과. 실제 WKWebView IPC 미검증 |
| AC-M0-03 SQLite·재시작·실패 | 합성 저장, 강제 실패/보존, 전체 프로세스 종료 후 복원 통과 | CI 격리 DB 테스트 통과. 실제 앱 로컬 저장/재시작 미검증 |
| AC-M0-04 Provider Mock | 실제 native 10/10, UI 대기→취소→`CANCELLED`, 저장본 유지 | CI 계약·취소 테스트 통과. 실제 앱 Mock 미검증 |
| AC-M0-05 CI·기밀·양쪽 빌드 | 위 head/run 모든 단계 통과, scanner 양성/음성·변조·redaction 검증 | 같은 run 모든 단계 통과. CI는 실제 창 실행 증거가 아님 |
| AC-M0-06 양쪽 OS 통합 | 아래 실제 통합 절차 통과 | 아래 일괄 체크리스트 실행 대기 → 전체 Gate 미통과 |

## Windows 실제 통합 결과

환경: Windows NT 10.0.26200 x64, Node 24.22.3/npm 11.10.1, Rust/Cargo 1.100.0, MSVC 14.44.35207, WebView2 157.0.4341.60. 로컬에서 `npm run tauri build -- --debug --no-bundle --ci -- --locked`를 성공한 뒤 생성 exe를 실행했다. 개발 서버가 아닌 `http://tauri.localhost/`의 production CSP에서 확인했다.

1. 기본 창과 합성 공고, 기존 합성 저장본을 확인했다. `Rust로 검증` 정상 입력 성공, 빈 입력의 `INVALID_RECORD` 오류를 관찰했다.
2. `개발용 IPC 경계 검사` → `경계 검사 실행`: **12/12 통과**. 허용 명령, 필드/타입/빈 값/길이/제어 문자/ID/추가 필드 거부, 비밀 비반사, core/file/shell/미등록 명령 거부를 포함한다.
3. `합성 M0-F 통합 저장 복원 🦀`를 로컬에 저장했다. 마지막 확인 저장본과 저장 완료 표시가 같았다. 기존 값도 합성 데이터임을 먼저 확인했으며 실제 사용자 레코드는 사용하지 않았다.
4. `개발용 저장 실패 검증` → `저장 실패·보존 검사`: `SIMULATED_SAVE_FAILURE`와 기존 저장본 보존 문구가 표시됐다. 저장본은 위 합성 값 그대로였다.
5. 창을 닫고 앱 창 및 `job-application-agent` 프로세스 부재를 각각 확인했다. 같은 exe를 새로 실행하자 **위 저장본이 자동 복원**됐다. 페이지 새로고침만으로 재시작을 대체하지 않았다.
6. `개발용 Mock 계약 검사` → `Mock 계약 검사 실행`: **10/10 통과**. 작업 4종 정상, 오류 5종, 실제 취소/중복 시작 거부와 각 저장본 보존을 확인했다.
7. 시나리오를 `wait_for_cancel`로 바꿔 `Mock 시작`: 입력·시작 비활성, 취소 활성 상태를 관찰했다. `Mock 취소` 뒤 **CANCELLED**, 시작/입력 재활성, 취소 비활성, 저장본 유지가 확인됐다. 앱을 닫고 창·프로세스 부재를 확인했다.

실제 AI/키/비용 발생 호출이나 외부 제출은 없다. UI 관찰에는 Computer Use를 사용했고, 타 앱·Codex·인증·보안 UI는 조작하지 않았다. 화면 캡처나 로컬 DB/로그를 저장소·CI artifact에 올리지 않았다.

## Mac 일괄 검증 절차

대상 예상: 기존 사용자 기기 Apple M1 Pro/macOS Sequoia 15.8.1. 실제 실행 때 OS/CPU와 commit을 다시 기록한다. 아래는 **미실행 체크리스트**이며 체크 전에는 통과가 아니다.

### 1. 같은 source 준비

로컬 변경을 먼저 확인한다. 변경이 있으면 덮어쓰지 않고 보존한 뒤 진행한다. 이미 프로젝트가 있으면 그 폴더에서, 없으면 [NEW_MACHINE](../NEW_MACHINE.md)에 따라 clone한 폴더에서 실행한다.

```sh
git status --short --branch
git fetch origin
git switch --detach e27a0d5d7e69645859d46d15432764da9dd9c27a
git rev-parse HEAD
sw_vers
uname -m
node --version
npm --version
rustc --version
cargo --version
npm run doctor -- --native
npm run setup -- --tests
npm run check:privacy -- --self-test
cargo test --manifest-path backend/Cargo.toml --locked
npm run tauri build -- --debug --no-bundle --ci -- --locked
./backend/target/debug/job-application-agent
```

Node 권장 24.22.3/Rust 1.100.0. 첫 설치/도구 준비는 [DEVELOPMENT](../DEVELOPMENT.md)를 따른다. 빌드 실패나 OS 경고가 있으면 멈추고 원문 비밀·경로를 제외한 오류 단계만 알려준다. 보안 설정을 우회하지 않는다. 이 detached checkout에서는 수정/commit하지 않고 검증만 한다. 검증 후 앱 종료, `git switch <원래-브랜치>`로 돌아간다.

### 2. 실제 창에서 한 번에 확인

- [ ] 키 없이 기본 합성 화면이 열린다.
- [ ] `Rust로 검증` 정상 입력 성공, 빈 입력 `INVALID_RECORD` 오류.
- [ ] `개발용 IPC 경계 검사`를 펼쳐 `경계 검사 실행` → **12/12**.
- [ ] 저장할 합성 텍스트를 `합성 M0-F 통합 저장 복원 🦀`로 바꾸고 `로컬에 저장` → 같은 마지막 저장본·완료 표시.
- [ ] `개발용 저장 실패 검증` → `저장 실패·보존 검사` → **SIMULATED_SAVE_FAILURE + 원본 보존**.
- [ ] 창 닫기 후 앱 프로세스 종료를 확인하고 위 실행 파일을 다시 실행 → **같은 저장본 복원**. 실제 개인 자료나 다른 앱의 DB는 사용하지 않는다.
- [ ] `개발용 Mock 계약 검사` → `Mock 계약 검사 실행` → **10/10**.
- [ ] `wait_for_cancel` 선택 → 시작 → 대기/취소 활성 → 취소 → **CANCELLED + 시작 재활성**, 저장본 그대로.
- [ ] 앱 종료/재실행 정상. 불필요한 외부 로그인/API 키 요청 없음.

### 3. 알려줄 결과

OS/CPU, `git rev-parse HEAD`, Node/Rust 버전, setup·scanner·Rust test·native build 성공 여부와 위 체크 결과를 알려준다. 예: `M1 Pro / 15.8.1 / e27a0d5 / Node ... / Rust ... / 자동검사 통과 / IPC 12/12 / 저장·강제 실패·재실행 복원 정상 / Mock 10/10·수동 취소 정상`.

실패하면 해당 단계·오류 코드만 공유한다. 개인 파일/DB/API 키/원본 로그나 실제 토큰은 보내지 않는다. Mac 결과를 받은 뒤 이 문서와 PR을 갱신하고 main 통합 여부를 확인해 최종 Gate를 판단한다.

## 완료 범위와 제한

M0는 후속 기능을 위한 개발 기반이다. 메일/JD 수집·실제 Provider·개인 자료·지원서·알림·설치본/서명/공증/배포 검증은 이번 통과 주장에 포함되지 않는다. no-bundle debug 빌드는 설치 파일이 아니며 공개 Release를 생성하지 않았다. 번들 identifier의 `.app` 끝자리 권고 경고는 기존 설정으로 남아 있고 현재 빌드는 성공했다. 향후 식별자 변경은 앱 저장 경로/배포 영향 검토 후 별도 처리한다.

스캐너 0건은 모든 개인정보 부재의 증명이 아니다. 공개 diff·파일 출처·로그/생성물 경계를 함께 검토한다. Mac 실제 결과가 없으면 CI 성공이나 Windows 통과만으로 M0 전체 완료를 선언하지 않는다.
