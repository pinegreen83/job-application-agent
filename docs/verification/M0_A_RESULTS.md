# M0-A 검증 기록 — 2026-11-18

관련: [Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3), [개발 절차](../DEVELOPMENT.md), [계획](../../plans/M0_PLAN.md). 기준: NFR-004/011, FR-006-01, AC-006-01, AC-M0-01. 준비 계획·M0 AC는 사용자가 PR #2에서 승인·merge했고 후속 진행을 지시했다. 이번 변경은 해당 범위만 구현한다.

## 초기 환경과 결과 (후속 검증은 아래 참조)

Windows NT 10.0.26200.0 / x64, Node 25.7.0, npm 11.10.1, Microsoft Edge 157.0.4341.60, WebView2 157.0.4341.60. 이 조합은 실측 개발 환경이며 최초 지원 OS/CPU/최소 버전 확정이 아니다. 직접 npm 패키지 버전은 `package.json`, 전이 버전은 `package-lock.json` 참조.

| 검증 | 명령·방법 | 결과 |
|---|---|---|
| JS 의존성 재현 | `npm ci` | 성공. lockfile에서 34개 패키지 재설치. 전체 audit high 5건 별도 기록 |
| 타입·Tauri 설정 구조 | `npm run check` | 성공. TypeScript와 설치된 Tauri CLI schema의 구조/패턴·아이콘 경로 검사. URI format 및 네이티브 컴파일 검증 아님 |
| frontend production build | `npm run build` | 성공. `dist/` 생성. 네이티브 앱/설치본 아님 |
| 브라우저 통합 | `npm test` | 2건 통과: desktop 1280×900, narrow 390×844. 합성 예시·미분석 표시, 외부 HTTP 요청 없음, JS/console 오류 없음, 수평 overflow 없음 |
| 화면 검토 | 테스트의 두 `startup.png` 확인 | 본문·합성 라벨·미구현 안내가 두 크기에서 잘림 없이 표시됨. 테스트 산출물은 Git 제외 |
| 앱 runtime 의존성 audit | `npm audit --omit=dev --json` | 알려진 취약점 0건. 전체 dependency audit과 구분 |
| 전체 개발 의존성 audit | `npm audit --json` | high 5건. picomatch ReDoS 및 Vite/tinyglobby/fdir/plugin-react 전파. 설치 시점 최신 4.0.7에도 수정 미확인 |
| Tauri CLI | `npm run tauri info` | 실패. native binding의 Windows Application Control 차단. 일반 optional dependency 안내보다 내부 원인인 정책 차단을 우선 진단 |
| Rust 형식·정적·컴파일·단위 테스트 | Rust/Cargo 및 MSVC toolchain 미설치 | 미실행/미검증. Cargo.lock 생성도 미완료 |
| Windows Tauri 기본 창 | 네이티브 선행 조건 미충족 | 미실행/미검증. 브라우저 Edge 스모크와 구분 |
| macOS | 환경 없음 | 빌드·네이티브 실행·스모크 모두 미검증 |

초기 타입 검사에서 CSS side-effect import 선언이 없어 실패했고 Vite client 타입 참조를 추가해 해결했다. 초기 로컬 테스트 서버가 남은 상태의 중복 실행은 포트 충돌로 실패해 해당 세션을 종료한 뒤 재검증했다. 최종 `npm ci` → `npm run build` → `npm test` 순서는 성공했다.

## 변경 범위와 Rust 판단

Rust는 Tauri Builder를 구성해 이벤트 루프를 시작하는 최소 실행부다. Builder 소유권은 `.run()`으로 넘긴다. 시작 실패는 개발자에게 명시적으로 드러내도록 `expect`로 종료한다. 사용자 작업을 수행하는 서비스·오류 변환·async 작업·저장소는 없으며 그런 기능의 오류 정책을 여기서 결정하지 않는다. 사용자 정의 IPC 명령이나 plugin/capability 파일을 등록하지 않았다. 실제 IPC 거부 검사는 M0-B에서 수행한다.

SQLite 라이브러리·schema, Provider 연결, 메일/JD 추출, 제품 정렬·상태 정책, 사용자 자료, 알림·제출·Release는 추가하지 않았다. UI와 아이콘은 개발 실행 확인용이며 최종 디자인·제품 identity 결정이 아니다.

## 공개 데이터·보안 검토

고정 합성 공고는 코드에서 직접 작성했고 실제 개인 자료를 참조하지 않았다. 외부 리소스·폰트를 사용하지 않고 API 키·개인 문서를 요구하지 않는다. npm 환경 변수 자동 노출 접두사는 비워 두었다. production CSP의 외부 연결 차단과 dev loopback/HMR 제한을 설정했으나 네이티브 enforcement는 미검증이다.

공개 대상 49개 파일(문서 28개), 로컬 파일 링크 19개, FR/AC 정의 144개·참조 229개, 표 구조와 제외 규칙 13개 사례 및 diff whitespace를 점검해 통과했다. 공개 텍스트와 generated frontend에서 key prefix·개인키·이메일·사용자 절대 경로 패턴 후보가 없었다. PNG 32×32와 ICO의 동일 PNG payload도 확인했다. 점검 스크립트는 Git 제외 경로의 로컬 준비 도구다. URL/fragment 전체 검증이나 전용 기밀 스캐너를 대체하지 않는다. 패턴 검사가 모든 비밀값 부재를 보증하지 않는다. Git 작성자 metadata는 기존 Git 설정이다. 실제 키·사용자 자료로 보안 테스트하지 않았다.

## 추가 검증과 사용자 승인

사용자가 PR #4 미완료 사항 우선 완료를 지시하고, Windows 정책 차단 진단 후 **GitHub Actions의 Windows·macOS 빌드 검사 추가**를 명시적으로 선택했다. 따라서 최초 PR의 CI 미포함 범위에 이번 네이티브 검증 workflow만 추가한다. 앱 기능 코드는 변경하지 않는다.

- Windows 개발 도구: Rust/Cargo 1.100.0(stable MSVC), VS Build Tools 17.14.45 및 Windows SDK 설치 완료. 설치 프로그램의 재부팅 안내는 있었으나 vswhere는 complete/launchable이며 reboot-required=false로 보고했다. 자동 재부팅하지 않았다.
- Cargo.lock 생성 성공: 427개 package, Tauri 2.12.6. 생성된 lock을 소스와 함께 추적한다.
- Tauri CLI `info` 재실행 성공. 이전 CLI 모듈 차단은 현재 재현되지 않았다.
- `cargo fmt -- --check`: Windows 앱 제어가 cargo-fmt를 차단해 실패(os error 4551).
- `cargo check --locked`: Rust compiler/linker가 의존성을 컴파일하기 시작했으나 proc-macro2/serde_core 등의 build script 실행이 같은 정책에 차단돼 실패. 앱 코드 실행 전에 발생한 환경 제한이며 native 성공으로 보고하지 않는다.
- clippy/test/Tauri native 실행은 위 선행 차단 때문에 로컬에서 완료하지 못했다. 보안 정책을 해제하거나 파일을 바꿔 차단을 우회하지 않았다.
- Node 24.22.3에서 frontend check/build와 Chromium 스모크 2건 재검증 성공. 기본 테스트를 Chromium으로 통일하고 기존 Edge 명령을 보존했다. 이는 기존 기기 설정 PR에서 검증된 동일 설정을 네이티브 CI에 재사용한 것이다.
- 의존성 위험은 [별도 검토](M0_A_DEPENDENCY_REVIEW.md)에 정리했다. 검토는 완료했으나 수정판 미확인으로 취약점 해소는 미완료다.

CI workflow의 실제 최신 결과·head commit·run URL은 PR #4와 Issue #3에 기록한다. CI의 native build와 실제 Windows/macOS 기기에서의 창 실행은 분리한다.

## Windows 실기기 창 실행 — 확인 완료

검증 코드 commit: `b85edc57d75358a999a6edcdf755414fd0c31e93`. 앱 기능 소스를 변경하지 않고 실행했다. 위 정책 차단은 이전 시도의 이력이며, 아래는 후속 실행이 허용되는 환경에서의 결과다.

| 항목 | 행동·증거 | 결과 |
|---|---|---|
| 로컬 native build / 첫 실행 | Windows x64에서 `npm run tauri dev`; Cargo dev build 완료 후 `target/debug/job-application-agent.exe` 실행 | 성공 |
| 종료 | 첫 창을 사용자가 직접 닫았다고 확인; CLI exit 0, 프로세스 종료 확인 | 정상 종료 |
| 재실행 | 같은 명령으로 재실행; native executable 소유의 창을 Computer Use 앱 목록에서 식별 | 성공 |
| 창 제목 | `Job Application Agent · M0-A` | 일치 |
| 합성 화면 | 실제 native 창을 활성화한 스크린샷과 접근성 트리 확인 | 가상 스튜디오 A / 게임 클라이언트 개발자 / 합성 데이터 / `synthetic-m0-a-001` / 분석하지 않음 표시 |
| 미구현 안내 | native WebView 접근성 문서·화면 확인 | 저장·AI 등 후속 기능 미연결 안내 정상 표시 |
| 소스·lockfile | 실행 전후 npm/Cargo lockfile과 앱 기능 소스 변경 없음 | 실행 검증에 새 기능 코드 추가 없음 |

보이는 창은 브라우저 탭이 아닌 Windows native Tauri 창이며 개발 모드 WebView2에서 loopback Vite 콘텐츠를 표시한다. 설치본/production bundle 실행, IPC·SQLite·Provider 동작을 검증한 것은 아니다. 실기기 Mac 실행도 이 결과로 대체하지 않는다. 환경에 실제 사용자 자료나 모델 키를 입력하지 않았다.

Windows/macOS CI도 [run #44284271888](https://github.com/pinegreen83/job-application-agent/actions/runs/44284271888)에서 Node 24.22.3/Rust 1.100.0의 fmt/check/clippy/test 명령·Chromium 각 2건·Tauri debug 비번들 build·lockfile 무변경 검사를 통과했다. Rust 최소 실행부의 별도 Rust 테스트 사례는 0개이며 해당 명령 성공을 기능 AC assertion으로 보고하지 않는다.

## 남은 작업과 AC 판정

**Windows 기본 창 실행 확인 완료 / macOS 실기기 확인 대기 / M0 Gate 미통과.** npm·Cargo lockfile과 양쪽 OS의 CI 검증, Windows native 기본 창·종료/재실행을 확인했다. [Mac 실행 절차](M0_A_MACOS_SMOKE.md)에 따른 실기기 결과와 사용자 리뷰까지 남겨 두고 PR의 Draft를 유지한다. 최초 통합 릴리스나 M0 전체 완료를 의미하지 않는다.

이전 Windows 정책 차단 이후 후속 환경에서 실기기 실행에 성공했다. 현재 남은 OS 실행 항목은 Mac 실기기 창 확인이다. 개발 의존성 취약점의 수정판 확인·갱신 또는 잔여 위험에 대한 사용자 판단도 남아 있다.

최초 PR 제출 시 CI는 미포함이었다. 후속 명시적 승인으로 네이티브 검사 workflow를 추가했으며, M0-E 전체·Release/설치본 게시와 사용자 merge는 별도 절차를 따른다.
