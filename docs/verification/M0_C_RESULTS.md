# M0-C 검증 기록

관련: [Issue #12](https://github.com/pinegreen83/job-application-agent/issues/12), AC-M0-03, [계약과 통합 절차](../M0_C_SQLITE.md). 기록일: 2026-11-19.

구현은 M0-B `c08bdb0` 위의 `feat/12-synthetic-sqlite-storage`다. 선행 PR #11과 M0-C 변경은 별도 PR로 관리한다. head별 자동 검사와 결과는 연결 PR을 확인한다. 사용자 지시에 따라 Mac 실기기는 M0 통합 때 일괄 검증하며, 확인 전까지 M0 Gate는 미통과다.

## Windows 자동 검사

환경: Windows NT 10.0.26200 x64, Node 24.22.3/npm 11.10.1, Rust/Cargo 1.100.0, MSVC 14.44.35207, WebView2 157.0.4341.60.

| 명령 | 결과 |
|---|---|
| `npm run build` / `npm run check` | TypeScript·설정·Vite build 통과 |
| `npm test` | Chromium desktop/narrow 22건 통과(저장 UI 12건 포함). renderer 시뮬레이션이며 native DB 증거는 아님 |
| `cargo fmt --manifest-path backend/Cargo.toml -- --check` | 통과 |
| `cargo check --manifest-path backend/Cargo.toml --locked` | 통과 |
| `cargo clippy --manifest-path backend/Cargo.toml --locked --all-targets -- -D warnings` | 통과 |
| `cargo test --manifest-path backend/Cargo.toml --locked` | 11건 통과. 입력 3건, DB 6건, 실제 handler/ACL MockRuntime 통합 2건 |
| `npm run tauri build -- --debug --no-bundle --ci -- --locked` | SQLite 포함 native build 통과. installer/Release 게시 없음 |

DB 테스트는 매번 독립 TempDir를 사용한다. migration 반복/실패/상위 버전 보존, 연결 종료 후 재연결 복원, Unicode·SQL 문자열 바인딩, UPSERT 뒤 rollback, 빈 DB 실패, read-only·열기 실패, 손상/잘못된 저장본, 동시 8개 transaction의 완전한 단일 레코드를 검사한다. IPC 저장 테스트도 임시 DB를 주입하고 실제 앱 전용 경로에 쓰지 않는다.

처음 UI 검사에서는 두 패널의 비슷한 입력 label과 StrictMode의 초기 재읽기를 테스트가 구분하지 못해 실패했다. 대상 section을 좁히고 초기 읽기 성공 후에만 오류를 주입하도록 수정해 22건을 통과했다. 제품의 StrictMode를 끄거나 오류를 숨겨 통과시키지 않았다.

## Windows 실제 앱

빌드된 exe의 `http://tauri.localhost/`와 production CSP에서 직접 관찰했다. 개인 자료 대신 아래 고정 합성 문자열만 사용했다.

1. 새 DB의 `저장된 합성 레코드가 없습니다.` 표시 확인.
2. `합성 M0-C 저장 복원 🦀`를 저장하고 `로컬 저장 완료` 및 마지막 확인 저장본 일치 확인.
3. 입력만 `실패할 합성 변경`으로 바꿔도 마지막 확인 저장본은 원래 값 유지.
4. `저장 실패·보존 검사`에서 `SIMULATED_SAVE_FAILURE`, `의도된 실패 후 저장본 보존을 확인했습니다.`와 원래 값 확인.
5. 닫기 버튼으로 창 종료 후 앱 프로세스가 없음을 확인. exe 재실행 뒤 입력은 기본 예시로 시작하지만 마지막 확인 저장본은 `합성 M0-C 저장 복원 🦀`로 자동 복원됨을 확인.
6. 재실행된 앱의 기존 IPC 경계 검사 12/12 통과. 검사 후 창 종료 확인.

스모크가 만든 합성 DB는 앱 전용 로컬 경로에 남는다. DB·로그·원본을 저장소/CI artifact/Release에 복사하지 않았다. 마지막 종료 입력의 도구 응답은 foreground process id 오류를 반환했으나 이후 창 목록을 다시 확인해 해당 앱 창 부재를 확인했다. 이 재관찰은 입력 결과를 추정하지 않기 위한 절차다.

## macOS와 남은 Gate

실기기 **미검증·사용자 요청으로 M0 통합 검증에 이연**. 양쪽 OS CI 결과는 연결 PR을 따른다. CI 성공은 Mac 실제 WKWebView 저장·rollback·프로세스 재시작 복원의 증거가 아니다. 사용자 PR 리뷰·merge와 M0-D/E/F도 남아 있으며 현재 M0 전체 완료를 선언하지 않는다.
