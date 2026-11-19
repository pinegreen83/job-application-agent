# M0-A Mac 실기기 확인

관련: [Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3), [PR #4](https://github.com/pinegreen83/job-application-agent/pull/4), [Windows와 CI 결과](M0_A_RESULTS.md). FR-006-01 / AC-006-01 / AC-M0-01의 실제 기본 창 실행 증거를 보완한다. Mac CI build 통과와 실기기 실행은 구분한다.

## 준비

Git, Node.js/npm, Xcode Command Line Tools와 Rust를 준비한다. Node 24.22.3/Rust 1.100.0은 CI에서 검증한 조합이다. Xcode 도구가 없을 때 `xcode-select --install`로 설치하고 요청되는 사용자 동의는 직접 완료한다. Rust는 [공식 설치 안내](https://www.rust-lang.org/tools/install)를 따른다. API 키·메일·개인 자료는 필요하지 않다.

## 코드 받기

현재 PR이 main에 merge되기 전에는 M0-A 브랜치를 받는다.

```sh
git clone --branch feat/3-m0-a-foundation https://github.com/pinegreen83/job-application-agent.git
cd job-application-agent
```

이미 checkout했다면 미커밋 변경 여부부터 확인하고 같은 브랜치에서 최신 변경을 받는다. 로컬 변경을 reset/force로 덮어쓰지 않는다.

```sh
git status --short --branch
git fetch origin
git switch feat/3-m0-a-foundation
git pull --ff-only
```

## 실행과 확인

```sh
node --version
npm --version
rustc --version
cargo --version
git rev-parse HEAD
npm ci
npm run check
npm run tauri dev
```

마지막 명령은 Vite와 Cargo를 실행하고 Mac의 Tauri 기본 창을 연다. 첫 Rust 의존성 다운로드·빌드에는 네트워크와 시간이 필요하다. `http://127.0.0.1:1420` 브라우저 탭만 보는 것은 native 창 실행 확인으로 처리하지 않는다.

다음을 직접 확인한다.

- 창 제목 `Job Application Agent · M0-A`.
- `합성 공고 예시`, `가상 스튜디오 A`, `게임 클라이언트 개발자` 표시.
- 식별자 `synthetic-m0-a-001`, `합성 데이터`, `분석하지 않음` 표시.
- 후속 기능이 연결되지 않았다는 안내 표시, 렌더링 오류/빈 화면 없음.
- 창을 닫아 종료한 뒤 같은 `npm run tauri dev`로 다시 정상 실행. 이전 명령이 계속 남아 있다면 Ctrl+C로 종료하고 재실행한다.

## 전달할 결과

Mac 모델의 CPU 계열(Apple Silicon/Intel), macOS 버전, 위 도구 버전과 commit, 실행/종료/재실행 성공 여부를 기록한다. 오류가 있으면 오류 부분만 전달하고 개인 경로·키·원본 문서는 제외한다. 사용자 확인 또는 앱 창의 직접 관찰 근거 없이 완료로 표시하지 않는다.

실기기 결과와 개발 의존성 잔여 위험을 사용자와 검토한 뒤 PR #4의 준비 상태를 갱신한다. merge는 사용자가 직접 한다. M0-B~F의 IPC·저장·Mock·전체 Gate 검증은 별도다.

## 2026-11-18 실기기 결과 — 사용자 확인 완료

검증 commit: `71df964394f0a1d7a43ce7a5b884cac090d044a4`, 브랜치 `feat/3-m0-a-foundation`. Apple Silicon (`arm64`), macOS 15.8.1 (24H32), Xcode 16.2 (16C5032a), Node 24.22.3, npm 11.19.1, Rust/Cargo 1.100.0, Rust Tauri 2.12.6 / CLI 2.12.5에서 실행했다. 이 조합은 실제 개발기 검증이며 최초 지원 CPU/최소 OS/서명·공증 결정이 아니다.

기존 기본 Node 16.16.0/npm 8.19.1은 요구 버전보다 낮았고 Rust는 설치되어 있지 않았다. 공식 배포처의 Node와 Rust를 저장소 밖 작업 폴더에 준비했다. Node 배포 파일의 SHA-256을 공식 체크섬과 대조했으며 시스템 기본 Node와 셸 설정은 변경하지 않았다.

| 검사 | 명령·증거 | 결과 |
|---|---|---|
| 의존성 재현 | `npm ci` | 성공 |
| 타입·설정·frontend build | `npm run build` (check 포함) | 성공 |
| Rust 형식 | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | 성공 |
| native 개발 실행 | `npm run tauri dev -- -- --locked` | Cargo dev build 및 native 실행 성공 |
| 첫 창·종료 | 사용자가 창이 보였고 직접 닫았다고 확인; CLI exit 0 | 성공 |
| 재실행·화면 | 같은 명령으로 재실행; 사용자가 아래 확인 항목 모두 정상 표시되고 표시 오류가 없다고 확인 | 성공 |
| 두 번째 종료 | 사용자가 창을 닫았다고 확인; CLI exit 0 | 성공 |
| 소스·lockfile | 실행 후 `git diff --exit-code`, lockfile diff 및 Git 상태 확인 | 추적 파일 변경 없음 |

화면 확인 항목: `Job Application Agent · M0-A` 창, `합성 공고 예시`, `가상 스튜디오 A`, `게임 클라이언트 개발자`, `synthetic-m0-a-001`, `합성 데이터`, `분석하지 않음`, `아직 연결되지 않은 기능` 안내. 첫 창과 재실행 화면은 **사용자의 직접 확인**이 근거다. Computer Use에서는 개발용 앱을 식별하지 못했으므로 Codex가 스크린샷·접근성 트리로 직접 관찰했다고 기록하지 않는다.

처음 시도한 `npm run tauri dev -- --locked`는 CLI 인자 오류로 실행 전에 종료됐다. Cargo 인자는 추가 `--` 뒤에 전달하는 위 명령으로 수정해 두 차례 실행했다. 앱 소스나 lockfile은 수정하지 않았다.

이번 Mac에서는 별도 `cargo check`/clippy/test, Chromium 스모크, production bundle·설치본 검증을 재실행하지 않았다. 기존 CI 결과와 구분한다. API 키나 사용자 원본 자료를 사용하지 않았다. 양쪽 OS의 M0-A 기본 창·종료·재실행 확인은 완료했으며 개발 의존성 잔여 위험 판단, 사용자 리뷰와 M0 전체 Gate는 남아 있어 PR #4의 Draft를 유지한다.
