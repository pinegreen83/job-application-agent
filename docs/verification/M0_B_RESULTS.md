# M0-B 검증 기록

관련: [Issue #10](https://github.com/pinegreen83/job-application-agent/issues/10), AC-M0-02, [계약·실기기 절차](../M0_B_IPC.md).

기록일: 2026-11-19. 구현 기준은 main `5c26c2d`에서 분기한 `feat/10-minimal-ipc-permissions`다. 최종 head별 자동 검사와 변경 이력은 연결 PR을 따른다. 사용자 merge와 Mac 실기기 확인 전에는 M0-B 전체 수용 완료로 선언하지 않는다.

## Windows

- Windows NT 10.0.26200 x64, Node 24.22.3/npm 11.10.1, Rust/Cargo 1.100.0, MSVC 14.44.35207, WebView2 157.0.4341.60.
- `npm run check`, `npm run build`: 통과.
- `npm test`: Chromium desktop/narrow 총 10건 통과. 기존 브라우저 스모크 2건과 IPC UI 시뮬레이션 8건이다. 시뮬레이션은 Rust/ACL 증거가 아니다.
- `cargo fmt --manifest-path backend/Cargo.toml -- --check`, `cargo check --manifest-path backend/Cargo.toml --locked`, `cargo clippy --manifest-path backend/Cargo.toml --locked --all-targets -- -D warnings`: 통과.
- `cargo test --manifest-path backend/Cargo.toml --locked`: 4건 통과(입력 단위 3건, 실제 handler/생성 ACL의 MockRuntime 통합 1건). 각 테스트 내부의 경계 사례를 포함한다. 라이브러리 테스트 exe의 아이콘 리소스 부재 경고가 있었으며 테스트 실패는 아니다.
- `npm run tauri build -- --debug --no-bundle --ci -- --locked`: 통과. installer·Release 게시 없음.
- 위 명령의 실행 파일을 직접 열었다. `http://tauri.localhost/`에서 production CSP를 사용하며, 정상 검증 완료·빈 입력 `INVALID_RECORD` 오류를 접근성 트리에서 직접 확인했다.
- 개발용 IPC 경계 검사는 **12/12 통과**: 정상 호출, 누락·타입·빈 값·초과 길이·제어 문자·ID·추가 필드/합성 비밀 반사 거부, core/파일/셸/미등록 명령 거부. raw native 오류 내용은 화면에 출력하지 않는다.
- 창 닫기 버튼으로 종료를 확인했다. 이어 `npm run tauri dev`로 재실행해 `http://127.0.0.1:1420/`의 dev CSP에서도 **12/12 통과**를 확인하고 창을 닫았다. 기본 테스트 경고/의도된 ACL 거부 로그를 실제 사용자 비밀값 검사 증거로 확대하지 않는다.

처음 MockRuntime 테스트를 실행할 때 Windows 로더 `0xc0000139`로 harness 실행 전에 실패했다. 실행 파일의 comctl32 imports에서 TaskDialogIndirect를 확인했고 Common Controls v6 manifest를 앱과 테스트 exe에 포함하도록 수정해 4건을 통과했다. 링크 단계의 manifest 중복 포함도 제거했다. OS 보안 정책 변경·우회는 수행하지 않았다.

## macOS

실기기 **미검증**. 기존 M0-A의 Apple M1 Pro/macOS 15.8.1 기본 창 확인은 이번 IPC·권한 변경의 증거로 재사용하지 않는다. 현재 PR의 macOS CI 결과는 연결 PR에 기록한다. CI가 성공해도 WKWebView에서의 정상·입력 오류·12/12 경계 검사·종료/재실행을 별도로 확인해야 한다.

## 남은 Gate

Mac 실기기 확인과 사용자 PR 검토·merge가 남아 있다. SQLite·Provider Mock·M0-E 전체 기밀 스캔·M0-F 저장/재실행 통합은 아직 별도 작업이다. 이번 테스트에 실제 사용자 파일·계정·API 키는 사용하지 않았다.
