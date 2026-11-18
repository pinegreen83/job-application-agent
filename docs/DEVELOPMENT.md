# M0-A 개발 실행

관련: [Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3), [M0 계획](../plans/M0_PLAN.md), FR-006-01 / AC-006-01 / AC-M0-01, NFR-004/011.

이 단계는 Tauri 2/Rust 실행부와 React/TypeScript 합성 기본 화면을 준비한다. 고정 합성 공고 1건은 실행 확인용이며 실제 분석·추천 결과가 아니다. 입력, 파일/DB 저장, Provider, 사용자 정의 IPC 명령은 없다. 외부 모델 계정·API 키·개인 문서는 필요하지 않다.

## 공통 준비

1. 저장소를 checkout한다. Node.js 22.12 이상과 npm 10 이상을 준비한다. 새 환경에는 지원 중인 Node LTS 사용을 권장한다. 이번 Windows frontend 검증에는 기존 Node 25.7.0/npm 11.10.1을 사용했다.
2. 프로젝트 루트에서 `npm ci`를 실행한다. npm 의존성은 정확한 직접 버전 및 `package-lock.json`으로 고정한다. 설치에는 npm registry 네트워크 접근이 필요하다.
3. 네이티브 개발에는 아래 OS별 도구를 추가한다. Rust/Cargo 의존성 최초 다운로드도 네트워크가 필요하다. 앱의 외부 서비스 호출과 개발 도구 다운로드는 구분한다.

비밀값 `.env`는 필요하지 않다. Vite의 환경 변수 자동 노출 접두사를 비워 두었고, 소스에 키를 넣거나 개발용 shell 환경을 렌더러에 전달하지 않는다.

## Windows

- [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows): Visual Studio Build Tools의 **Desktop development with C++**, 해당 Windows SDK, Microsoft Edge WebView2 Runtime이 필요하다.
- [Rust 설치](https://www.rust-lang.org/tools/install): MSVC용 stable toolchain을 준비하고 새 터미널에서 `rustc --version`, `cargo --version`을 확인한다. 도구 설치는 개발자 환경을 변경하므로 직접 검토해 설치한다.
- WebView2가 있어도 Rust나 C++ toolchain을 대체하지 않는다.
- 이 PC는 WebView2만 확인됐다. Rust/Cargo와 VS Build Tools가 없고, 설치된 Tauri CLI의 네이티브 모듈은 Windows Application Control 정책에 차단됐다. 따라서 네이티브 compile·창 실행을 검증하지 못했다. OS 보안 정책을 해제하거나 우회하지 않았다.

## macOS

- [Tauri macOS prerequisites](https://v2.tauri.app/start/prerequisites/#macos): Xcode Command Line Tools (`xcode-select --install`)와 Rust stable을 준비한다.
- Node/npm 설치 후 루트에서 같은 명령을 사용한다. WKWebView는 OS가 제공한다.
- 이번 작업에서 macOS는 빌드·실행 모두 미검증이다. 최초 지원 CPU/최소 OS/서명·공증은 아직 제품 결정이 아니다. 현 개발기 아키텍처의 실행과 최초 배포 대상 결정을 구분한다.

## 명령

프로젝트 루트에서 실행한다.

| 목적 | 명령 | 범위 |
|---|---|---|
| 의존성 재현 | `npm ci` | JS/TS 개발 도구 설치 |
| 타입·설정 검사 | `npm run check` | TypeScript, CLI 패키지의 JSON schema 구조·패턴(URI format 제외), 아이콘 경로 검사 |
| 브라우저 개발 | `npm run dev` | `http://127.0.0.1:1420`에서 합성 화면, Ctrl+C로 종료 |
| frontend build | `npm run build` | `dist/` 생성. 데스크톱 설치본 아님 |
| 브라우저 스모크 | `npm test` | 로컬 Microsoft Edge 필요. 테스트가 서버를 시작·종료, 1420 포트가 비어 있어야 함 |
| 네이티브 개발 | `npm run tauri dev` | OS toolchain 필요. Vite와 Tauri 기본 창 실행 |
| 네이티브 비번들 빌드 | `npm run tauri build -- --no-bundle` | 컴파일 확인용, 설치 파일/Release 게시 없음 |
| Rust 형식 | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Rust 도구 필요 |
| Rust 컴파일 | `cargo check --manifest-path src-tauri/Cargo.toml` | OS toolchain 필요 |
| Rust 정적 검사 | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | OS toolchain 필요 |
| Rust 테스트 | `cargo test --manifest-path src-tauri/Cargo.toml` | 이번 최소 실행부에는 별도 Rust 테스트 사례 없음. 앱 실행 증거의 대체 아님 |

브라우저 스모크는 개발 서버에서 desktop/narrow viewport를 확인한다. 외부 HTTP 요청을 차단·기록하고 합성 표시, 미분석 상태, 콘솔 오류와 수평 overflow를 검사한다. 스크린샷은 제외 경로 `test-results/`에 남긴다. 이는 WebView2/WKWebView 네이티브 창 검증이 아니다. Edge가 없는 테스트 환경은 Edge 설치 또는 후속 테스트 러너 검토가 필요하다.

Rust 의존성은 Tauri major 2의 허용 범위만 선언했다. 이 환경에 Cargo가 없어 **Cargo.lock을 생성·검증하지 못했다**. 네이티브 도구가 준비되면 Cargo 명령으로 lockfile을 생성해 commit하고 동일 결과를 재검증해야 한다. 그 전에는 네이티브 의존성 재현과 AC-M0-01 전체 통과를 주장하지 않는다.

## 네이티브 스모크 기록 방법

각 OS에서 commit/OS·CPU/Node·npm/Rust·Tauri 버전을 기록한다. API 키를 설정하지 않고 `npm ci` → `npm run check` → `npm run tauri dev`를 실행한다. 기본 창, 합성 표시, 미분석 상태와 미구현 안내가 보이는지 확인하고 종료/재실행한다. 명령·오류·화면 결과를 OS별로 기록한다. 저장·IPC·Mock은 M0-B~D에서 추가 검증한다.

## 설정과 보안 경계

- `src-tauri/tauri.conf.json`: 개발용 identifier `dev.jobapplicationagent.app`, 비출시 버전 `0.0.0`, installer bundling 비활성. 최종 제품 ID/릴리스 결정이 아니다.
- 사용자 정의 Rust command, OS/셸/HTTP/file plugin, capability 파일이 없다. 빈 capability 목록은 Tauri에서 파일 자동 탐색을 뜻하므로 **추후 capability 파일 추가 시 권한을 다시 검토**해야 한다. 실제 IPC 거부 검증은 M0-B 범위다.
- production CSP는 외부 연결을 막고, dev CSP는 Vite 로컬 서버·HMR에 필요한 loopback 연결과 개발용 inline script/style만 허용한다. 설정 schema 통과는 네이티브 런타임 보안 검증이 아니다.
- Vite는 `127.0.0.1:1420`으로 제한하고 다른 포트로 자동 전환하지 않는다. 네트워크에 노출하지 말고 작업 후 종료한다.
- 개발 아이콘은 저장소의 `scripts/generate-dev-icon.mjs`로 만든 고정 placeholder다. 재생성: `node scripts/generate-dev-icon.mjs`.
- 실제 메일·프로필·지원서·키를 소스/fixtures/로그에 넣지 않는다. `dist`, `target`, `test-results`, `.env`, 원본 개인 문서와 로컬 데이터는 Git에서 제외한다.

## 알려진 의존성 문제

2026-11-18 `npm audit` 결과 high 5건: picomatch의 ReDoS([GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf))가 Vite/tinyglobby/fdir/plugin-react 의존 경로에 전파된다. 설치 시점 최신 picomatch 4.0.7도 영향 범위이며 수정판을 확인하지 못했다. 자동 제안의 과거 Vite major로 강제 변경하거나 검사 결과를 숨기지 않았다.

현재 앱 runtime 의존성은 React/React DOM이며 이 문제는 개발 도구 경로다. 개발 서버 loopback 제한은 노출을 줄일 뿐 취약점 해결을 뜻하지 않는다. `npm audit --omit=dev`와 전체 audit을 구분해 기록하고, 수정판이 나오면 별도 검증 후 갱신한다. 미해결 상태는 리뷰/Gate 검토 대상으로 남긴다.
