# Job Application Agent — Spec-Driven Development

**요구사항 버전:** 0.2.1 · **진행:** M0 구현·Windows 통합 완료 / Mac 실기기 통합 보류 / M1 설계 전 · **2026-11-19**

개인 취업 지원자를 위한 **로컬 우선 채용공고 분석 및 지원 관리 데스크톱 앱**. 하루에도 여러 통씩 쌓이는 추천 메일에서 개별 공고를 추출하고 중복을 정리한 뒤, 상세 JD와 실제 경험을 비교해 검토 우선순위를 제시한다. 검토한 공고에 대해 간편 지원용 이력서 수정 또는 기업 자체 지원서 작성 보조를 제공하고, **사용자가 외부 사이트에서 직접 제출**한 결과를 관리한다.

## 요구사항부터 시작하기

**다른 기기에서 이어가기:** [새 기기 설정](docs/NEW_MACHINE.md)과 [현재 작업 상태](docs/WORK_STATUS.md)를 확인한다. main 또는 현재 Issue의 작업 브랜치를 받아 루트에서 `npm run setup`을 실행한다.

**새 대화에서 M1 시작:** [M1 인계·복사용 시작 문구](docs/M1_HANDOFF.md)와 [M1 계획 제안](plans/M1_PLAN.md)을 먼저 읽는다. 로컬/원격 상태 확인 후 현재 작업에 필요한 결정부터 검토한다. M1 계획·제품 schema·첫 Provider는 아직 승인 전이다.
1. `docs/URS.md` — 사용자가 직접 제시한 필요와 미확정 요구사항 (제품 명세의 상위 기준)
2. `docs/PRD.md` — 최초 통합 프로토타입 범위와 제품 흐름
3. `specs/**/spec.md` — 기능별 FR·AC 및 테스트 가능한 완료 기준
4. `docs/REQUIREMENTS_TRACEABILITY.md` — URS ↔ Spec ↔ 개발 단계
5. `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` — 기술 선택 근거와 아키텍처
6. `AGENTS.md`, `CODEX_START.md` — Codex 개발/협업 규칙

## 현재 기술 방향
- Desktop: **Tauri 2**, Rust (로컬/네이티브 로직)
- Frontend: React + TypeScript (OS WebView UI)
- Database: SQLite (사용자 PC 로컬 RDBMS)
- LLM: 사용자가 직접 구성하는 공급자(OpenAI API, Gemini API, 로컬 Ollama 등)를 교체 가능한 구조로 지원
- OS: **Windows + macOS 모두 필수**
- GitHub: **Public** 소스 저장소, 기능별 Issue/브랜치/PR, 사용자 직접 코드 리뷰·Merge
- CI/CD: PR 자동 검사, 마일스톤마다 OS별 설치 파일을 GitHub Releases에 배포

Tauri 선택은 OS WebView 재사용과 Rust 학습이라는 결정이다. 더 빠르고 메모리를 적게 쓴다는 주장은 **측정 전 가정**이다.

## 폴더 구조

```text
frontend/       React·TypeScript 화면, Vite/TS 설정, Playwright 테스트
backend/        Tauri 2·Rust 네이티브 실행부, Cargo 설정·lock, 권한·앱 설정
scripts/        공통 환경 진단·설치·설정 검사
docs/ specs/ plans/   요구사항·설계·작업 계획·검증 기록
.github/        Issue/PR 템플릿과 Windows/macOS CI
package.json    루트 공통 npm 명령과 단일 package-lock.json
```

`backend/`는 앱 내부 네이티브 계층이다. 화면과는 제한된 Tauri IPC로 연결하며 별도 HTTP 서버를 추가하지 않는다. 명령은 모두 저장소 루트에서 실행하고, 프론트 빌드 결과는 `frontend/dist/`에 생성한다.

## 최초 릴리스 범위
메일 첨부·다중 공고/중복 처리·JD 분석부터 이력서 맞춤 수정·자체 문항 작성·AI 검토·사용자 승인·직접 제출 자료 제공·PDF/전형/아침 알림 관리까지 포함하는 통합 프로토타입이다. 기본 정렬은 **선택 분야와 JD의 연관성**을 우선하며 별도 개인 선호 입력·평가는 제외한다. Provider는 초기 공통 기반으로 도입한다. 세부 범위는 `docs/PRD.md`, 내부 개발 순서와 승인할 기준은 `docs/MILESTONES.md`를 따른다.

## SDD와 GitHub 개발 흐름
`요구사항(URS) 확인 → 기능 Spec 승인 → Issue 생성 → feature 브랜치 → 구현·AC 테스트 → PR → 사용자 리뷰 → Merge → 마일스톤 릴리스`

- `main` 브랜치에서 직접 구현하거나 자동 Merge하지 않는다.
- Codex는 **이슈/명세 기반 변경만** 제안하고, PR을 제출하면 사용자 검토를 기다린다.
- 공개 저장소, 테스트 Fixture, Actions 로그, Release 설치 파일에 **실제 이력서/자소서/메일/연락처/API 키를 포함하지 않는다**.
- 이전 버전의 '외부 채용 사이트 자동 제출' 요구사항은 **폐기**되었다.

## 현 상태와 개발 시작
M0-A~E 구현과 Windows 통합 보고 PR #20까지 main에 병합됐다(`6458192`). Tauri 2·React/TS, 최소 IPC, 합성 SQLite 저장/복원·실패 보존, Provider Mock·실제 취소와 양쪽 OS PR CI/기밀 검사가 있다. M1의 실제 메일/JD·Provider·제품 데이터 기능은 미구현이다.

개발 명령·OS별 도구는 [개발 실행 문서](docs/DEVELOPMENT.md)를 따른다. 빠른 브라우저 확인은 `npm ci` → `npm run dev`이며 실제 Tauri 실행에는 Rust·OS 도구가 필요하다. Windows 실제 IPC12/12·SQLite 저장/실패 보존/재실행 복원·Mock10/10/수동 취소와 양쪽 OS CI Rust16·Chromium48·native build는 통과했다. 정확한 head/run은 [통합 결과](docs/verification/M0_RESULTS.md)를 따른다. Mac 실기기 통합은 현재 기기 사용 불가로 Issue #19에 보류하며 **M0 전체 Gate는 미통과**다. Windows 기준 후속 준비·개발은 가능하다.

구현 범위는 [IPC 계약](docs/M0_B_IPC.md), [합성 SQLite](docs/M0_C_SQLITE.md), [Provider Mock 계약](docs/PROVIDER_CONTRACT.md)에 기록했다. 브라우저 테스트는 native 실행을 시뮬레이션하며 실제 OS 증거와 구분한다.

`CODEX_START.md`는 완료된 초기 준비의 원문 기록이다. 후속 작업은 [AGENTS](AGENTS.md)와 [작업 상태](docs/WORK_STATUS.md), 관련 Spec/Issue를 기준으로 시작한다. 과거 검증 문서는 당시 결과이며 최신 병합/잔여 조건은 작업 상태·통합 결과를 따른다.

공개 전에는 검토한 파일을 명시적으로 stage하고 `npm run check:privacy -- --self-test`로 [기밀 검사·공개 경계](docs/SECURITY_CHECKS.md)를 확인한다. 실제 비밀/문서를 검사 fixture로 쓰거나 검출 원문을 업로드하지 않는다.

프로필과 메일 샘플은 퍼블릭 저장소에 넣지 말고 개인정보가 제거된 합성 Fixtures만 사용한다. 초기 대상 OS/배포 조건은 `docs/MILESTONES.md` 및 `specs/006-ci-release/spec.md`를 따른다.

저장소 준비 [Issue #1](https://github.com/pinegreen83/job-application-agent/issues/1)의 [M0 실행 계획](plans/M0_PLAN.md)과 M0 AC는 PR #2에서 사용자 승인·merge됐다. [M0-A Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3)의 결과·제한은 [검증 기록](docs/verification/M0_A_RESULTS.md)에 남긴다. 후속 상세 Spec의 일괄 승인이나 M0 Gate 통과를 의미하지 않는다.
