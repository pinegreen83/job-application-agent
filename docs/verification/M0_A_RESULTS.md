# M0-A 검증 기록 — 2026-11-18

관련: [Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3), [개발 절차](../DEVELOPMENT.md), [계획](../../plans/M0_PLAN.md). 기준: NFR-004/011, FR-006-01, AC-006-01, AC-M0-01. 준비 계획·M0 AC는 사용자가 PR #2에서 승인·merge했고 후속 진행을 지시했다. 이번 변경은 해당 범위만 구현한다.

## 환경과 결과

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

## 남은 작업과 AC 판정

**AC-M0-01 전체 미충족 / M0 Gate 미통과.** 브라우저 실행·frontend build는 검증했지만 네이티브 창과 양쪽 OS의 재현 증거가 없다. Rust lockfile과 compiler 검증 없이 native 재현성을 주장하지 않는다. PR은 이 제한을 명시한 Draft로 제출한다.

네이티브 검증을 위해 Rust stable/MSVC/Windows SDK 개발 도구와 해당 네이티브 모듈 실행을 허용하는 개발 환경이 필요하다. OS 보안 정책을 우회하지 않는다. 허용되는 개발 환경에서 Cargo.lock을 생성·commit하고 Rust 및 Tauri compile/창 실행을 검증해야 한다. macOS는 별도 환경에서 같은 절차를 실행한다. 개발 의존성 취약점도 수정판 확인·갱신 및 사용자 리뷰가 남아 있다.

CI 자동화는 승인된 M0-E 범위이며 이번 PR에 workflow를 추가하거나 Actions/Release를 실행하지 않았다. 후속 구현·설계 결정과 사용자 merge는 별도 절차를 따른다.
