# M0-A 개발 실행

관련: [Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3), [M0 계획](../plans/M0_PLAN.md), FR-006-01 / AC-006-01 / AC-M0-01, NFR-004/011.

이 단계는 Tauri 2/Rust 실행부와 React/TypeScript 합성 기본 화면을 준비한다. 고정 합성 공고 1건은 실행 확인용이며 실제 분석·추천 결과가 아니다. 입력, 파일/DB 저장, Provider, 사용자 정의 IPC 명령은 없다. 외부 모델 계정·API 키·개인 문서는 필요하지 않다.

## 공통 준비

다른 기기에서 처음 받을 때는 [NEW_MACHINE.md](NEW_MACHINE.md)를 따른다. 공통 권장 Node 버전은 `.node-version`/`.nvmrc`에 기록하며 `npm run doctor`, `npm run setup`으로 환경 점검·의존성 설치·frontend build를 수행할 수 있다.

1. 저장소를 checkout한다. Node.js 22.12 이상과 npm 10 이상을 준비한다. 새 환경에는 지원 중인 Node LTS 사용을 권장한다. 이번 Windows frontend 검증에는 기존 Node 25.7.0/npm 11.10.1을 사용했다.
2. 프로젝트 루트에서 `npm ci`를 실행한다. npm 의존성은 정확한 직접 버전 및 `package-lock.json`으로 고정한다. 설치에는 npm registry 네트워크 접근이 필요하다.
3. 네이티브 개발에는 아래 OS별 도구를 추가한다. Rust/Cargo 의존성 최초 다운로드도 네트워크가 필요하다. 앱의 외부 서비스 호출과 개발 도구 다운로드는 구분한다.

비밀값 `.env`는 필요하지 않다. Vite의 환경 변수 자동 노출 접두사를 비워 두었고, 소스에 키를 넣거나 개발용 shell 환경을 렌더러에 전달하지 않는다.

## Windows

- [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows): Visual Studio Build Tools의 **Desktop development with C++**, 해당 Windows SDK, Microsoft Edge WebView2 Runtime이 필요하다.
- [Rust 설치](https://www.rust-lang.org/tools/install): MSVC용 stable toolchain을 준비하고 새 터미널에서 `rustc --version`, `cargo --version`을 확인한다. 도구 설치는 개발자 환경을 변경하므로 직접 검토해 설치한다.
- WebView2가 있어도 Rust나 C++ toolchain을 대체하지 않는다.
- Rust/Cargo 1.100.0, VS Build Tools 17.14.45와 Windows SDK 설치 후 초기에는 앱 제어 정책에 차단됐다(`os error 4551`). 후속 실행을 허용하는 개발 환경에서 `npm run tauri dev`의 로컬 native compile, 기본 창·합성 화면, 종료 후 재실행을 확인했다. [Windows 실행 기록](verification/M0_A_RESULTS.md)을 참조한다.

## macOS

- [Tauri macOS prerequisites](https://v2.tauri.app/start/prerequisites/#macos): Xcode Command Line Tools (`xcode-select --install`)와 Rust stable을 준비한다.
- Node/npm 설치 후 루트에서 같은 명령을 사용한다. WKWebView는 OS가 제공한다.
- macOS ARM64 CI의 정적 검사·native build를 통과했고 **Apple Silicon/macOS 15.8.1 실기기의 기본 창·종료·재실행도 사용자 확인으로 검증했다**. Node 24.22.3/npm 11.19.1, Rust/Cargo 1.100.0, Xcode 16.2를 사용했다. 최초 지원 CPU/최소 OS/서명·공증은 아직 제품 결정이 아니다. 현 개발기 아키텍처의 실행과 최초 배포 대상 결정을 구분한다. 실행 절차·사용자 확인 근거·미검증 범위는 [Mac 실기기 기록](verification/M0_A_MACOS_SMOKE.md)을 참조한다.

## 명령

프로젝트 루트에서 실행한다.

| 목적 | 명령 | 범위 |
|---|---|---|
| 의존성 재현 | `npm ci` | JS/TS 개발 도구 설치 |
| 타입·설정 검사 | `npm run check` | TypeScript, CLI 패키지의 JSON schema 구조·패턴(URI format 제외), 아이콘 경로 검사 |
| 브라우저 개발 | `npm run dev` | `http://127.0.0.1:1420`에서 합성 화면, Ctrl+C로 종료 |
| frontend build | `npm run build` | `dist/` 생성. 데스크톱 설치본 아님 |
| 브라우저 준비·스모크 | `npm run setup -- --tests` | lock 설치·build·고정 Chromium 준비·테스트. 이후 `npm test`로 재실행, 1420 포트가 비어 있어야 함 |
| 기존 Edge 스모크 | `npm run test:edge` | 로컬 Microsoft Edge 사용 |
| 네이티브 개발 | `npm run tauri dev` | OS toolchain 필요. Vite와 Tauri 기본 창 실행 |
| 네이티브 비번들 빌드 | `npm run tauri build -- --no-bundle` | 컴파일 확인용, 설치 파일/Release 게시 없음 |
| Rust 형식 | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Rust 도구 필요 |
| Rust 컴파일 | `cargo check --manifest-path src-tauri/Cargo.toml` | OS toolchain 필요 |
| Rust 정적 검사 | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | OS toolchain 필요 |
| Rust 테스트 | `cargo test --manifest-path src-tauri/Cargo.toml` | 이번 최소 실행부에는 별도 Rust 테스트 사례 없음. 앱 실행 증거의 대체 아님 |

브라우저 스모크는 개발 서버에서 desktop/narrow viewport를 확인한다. 외부 HTTP 요청을 차단·기록하고 합성 표시, 미분석 상태, 콘솔 오류와 수평 overflow를 검사한다. 스크린샷은 제외 경로 `test-results/`에 남긴다. 이는 WebView2/WKWebView 네이티브 창 검증이 아니다. CI와 기본 테스트는 고정 Chromium을 사용하고 기존 Edge 테스트도 별도 명령으로 유지한다.

`src-tauri/Cargo.lock`을 Cargo 1.100.0으로 생성했고 Tauri 2.12.6을 포함해 Rust 의존성을 고정했다. 검증 시 Cargo 명령에 `--locked`를 사용한다. lock 생성은 native compile 성공 증거가 아니다.

## PR 네이티브 CI

사용자가 추가 승인한 `.github/workflows/m0-a-native.yml`은 main 대상 PR에서 Windows/macOS 검증용 러너로 Node 24.22.3과 Rust 1.100.0을 준비한다. 새 기기와 동일한 `npm run setup -- --tests`로 npm lock 설치·TS/설정/build·Chromium 스모크를 실행하고, Rust fmt/check/clippy/test·Tauri debug 비번들 build·lockfile 무변경도 검사한다. Action은 commit SHA로 고정하며 읽기 권한만 사용하고 인증정보·개인 자료·설치본·Release를 게시하지 않는다.

러너는 검증 환경이며 최초 지원 CPU/최소 OS/서명 결정이 아니다. CI 컴파일과 실제 기기에서의 기본 창·IPC·저장 스모크를 구분한다. 이 검사는 M0-E의 전체 기밀 스캐너/배포 CI나 M0-F의 OS별 Gate를 완료한 것이 아니다. 기반 검증은 PR #4, 공통 setup 통합의 최신 결과는 PR #6에서 확인한다.

## 네이티브 스모크 기록 방법

각 OS에서 commit/OS·CPU/Node·npm/Rust·Tauri 버전을 기록한다. API 키를 설정하지 않고 `npm ci` → `npm run check` → `npm run tauri dev`를 실행한다. 기본 창, 합성 표시, 미분석 상태와 미구현 안내가 보이는지 확인하고 종료/재실행한다. 명령·오류·화면 결과를 OS별로 기록한다. 저장·IPC·Mock은 M0-B~D에서 추가 검증한다.

## 설정과 보안 경계

- `src-tauri/tauri.conf.json`: 개발용 identifier `dev.jobapplicationagent.app`, 비출시 버전 `0.0.0`, installer bundling 비활성. 최종 제품 ID/릴리스 결정이 아니다.
- 사용자 정의 Rust command, OS/셸/HTTP/file plugin, capability 파일이 없다. 빈 capability 목록은 Tauri에서 파일 자동 탐색을 뜻하므로 **추후 capability 파일 추가 시 권한을 다시 검토**해야 한다. 실제 IPC 거부 검증은 M0-B 범위다.
- production CSP는 외부 연결을 막고, dev CSP는 Vite 로컬 서버·HMR에 필요한 loopback 연결과 개발용 inline script/style만 허용한다. 설정 schema 통과는 네이티브 런타임 보안 검증이 아니다.
- Vite는 `127.0.0.1:1420`으로 제한하고 다른 포트로 자동 전환하지 않는다. 네트워크에 노출하지 말고 작업 후 종료한다.
- 개발 아이콘은 저장소의 `scripts/generate-dev-icon.mjs`로 만든 고정 placeholder다. 재생성: `node scripts/generate-dev-icon.mjs`.
- 실제 메일·프로필·지원서·키를 소스/fixtures/로그에 넣지 않는다. `dist`, `target`, `test-results`, `.env`, 원본 개인 문서와 로컬 데이터는 Git에서 제외한다.

## 의존성 검사 기록

2026-11-19 GitHub가 아래 picomatch advisory를 철회했다. 패키지·lockfile 변경 없이 fresh clone 설치와 전체 npm audit을 다시 확인해 현재 0건이다. [검토 기록](verification/M0_A_DEPENDENCY_REVIEW.md)의 공식 철회 시각과 재검사 근거를 참조한다.

2026-11-18 `npm audit` 결과 high 영향 패키지 5건: picomatch의 ReDoS([GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf))가 Vite/tinyglobby/fdir/plugin-react 의존 경로에 전파된다. 최신 picomatch 4.0.7도 영향 범위이며 수정판을 확인하지 못했다. 자동 제안 버전도 격리 검증했으나 다른 Vite 취약점이 검출돼 적용하지 않았다. [상세 검토](verification/M0_A_DEPENDENCY_REVIEW.md)를 참조한다.

앱 runtime 의존성은 React/React DOM이며 당시 문제는 개발 도구 경로였다. 개발 서버 loopback 제한을 보안 검사 대체로 간주하지 않는다. 의존성 변경 시 전체와 runtime npm audit을 구분해 확인하고 새 검출은 근거와 함께 별도 추적한다.
