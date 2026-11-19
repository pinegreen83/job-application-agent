# 변경 기록

## 공통 setup 통합 검증 — 2026-11-19 (리뷰 전)
- M0-A 사용자 병합 후 PR #6을 main 기준으로 조정하고 병합 완료 브랜치를 정리.
- 새 기기와 같은 setup 명령을 Windows/macOS CI에 연결하고 Windows fresh clone에서 재검증.
- GitHub의 picomatch advisory 철회를 확인하고 같은 lockfile의 전체 npm audit 0건을 기록. 패키지 버전 변경 없음.

## 다른 기기 개발 설정 — 2026-11-18 (리뷰 전)
- Issue #5: Node 버전 파일, 공통 doctor/setup, 기본 Chromium 스모크와 별도 Edge 명령, checkout·기기 전환·진행 상태 문서 추가.
- Windows fresh clone의 공통 Node 24.22.3에서 setup/build 및 Chromium·Edge 각 2건 통과. 실제 다른 PC/macOS와 기존 native 제한은 미검증 유지.

## M0-A 개발 기반 — 2026-11-18 (리뷰 전)
- Issue #3: Tauri 2/Rust 최소 실행부, React/TypeScript/Vite 합성 화면, npm lockfile·설정 검사·브라우저 통합 스모크 추가.
- 개발 실행 절차와 OS별 검증 기록 추가. frontend 빌드와 스모크 2건 통과.
- Rust/MSVC 미설치·CLI 앱 제어 차단으로 native/Cargo.lock 미검증, macOS 미검증, 개발 의존성 high 5건 유지. AC-M0-01 전체와 M0 Gate는 미충족.

## 저장소 착수 준비 — 2026-11-18 (v0.2.1 이후, 문서 변경)
- Public 저장소에 기존 명세를 초기 등록하고 [M0 준비 Issue #1](https://github.com/pinegreen83/job-application-agent/issues/1)을 생성.
- [M0 계획](plans/M0_PLAN.md), Issue/PR 템플릿 및 `.gitignore` 마련. 상세 Spec·M0 AC는 사용자 검토 대기.
- 생산 코드·의존성 설치·실제 LLM 호출·앱 빌드·설치본 배포·merge는 수행하지 않음. 아래 v0.2.x 기록의 미수행 목록은 해당 문서 작성 시점의 이력이다.

## v0.2.1 — 2026-11-18 (릴리스 범위 확정 및 SDD 검토 반영)
- 최초 릴리스를 메일/JD 분석, 간편·자체 지원 준비, 직접 제출 보조, PDF·전형·아침 알림 관리까지 포함하는 통합 프로토타입으로 확정.
- 선택 분야-JD 연관성 중심의 기본 정렬을 명시하고 별도 개인 선호 입력·평가와 관련 활성 데이터 필드를 최초 릴리스에서 제외.
- 기존 FR/AC ID를 유지하면서 AC-007-02/04와 대시보드 기준을 변경하고, Provider 기반을 M0 Mock/M1 실제 연결로 앞당기는 내부 실행 계획 반영.
- 수동 수정 보존, Provider 오류·취소, 독립 리뷰 revision, 첨부 교체 후 재승인, 문항 제약 검사 AC 보완. M0 수용 기준 초안과 Mock/실제 AI 품질 검증 구분 추가.
- 정렬 예외·공급자 선정·AI 품질 기준 등 미정 사항과 상세 Spec 승인 상태는 유지. 코드·Issue·커밋·빌드·배포는 수행하지 않음.

## v0.2.0 — 2026-11-18 (요구사항 인터뷰 반영)
- 실제 문제 정의를 채용공고가 메일에 누적되고 JD 검토/적합성 판단에 시간이 드는 상황으로 재정리.
- `docs/URS.md` 신설: 클라이언트가 확정한 사용자·비기능·개발 프로세스 요구사항, 미확정 OQ 분리.
- `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md`를 새 제품 흐름에 맞게 수정.
- Electron/Windows 우선 설계를 Tauri 2/Rust/React+TS/SQLite와 Windows·macOS 동시 지원으로 변경.
- 자동 지원 제출을 범위에서 삭제하고, 사용자 직접 제출을 위한 링크·자료 패키지/제출 PDF 관리로 변경.
- 기능별 상세 Spec을 재작성·확장(총 11종), `docs/REQUIREMENTS_TRACEABILITY.md` 신설.
- GitHub Public, Issue→기능 브랜치→PR→사용자 리뷰→Merge, GitHub Actions의 마일스톤별 OS별 Release 요구를 반영.
- `AGENTS.md`, `CODEX_START.md`, 마일스톤·테스트 계획을 실제 SDD 개발 프로세스에 맞게 변경.

### 아직 수행하지 않은 작업
- URS/Spec 사용자 최종 승인
- GitHub Issue/저장소 생성 및 실제 커밋/PR/머지
- 코드 생성, Windows/macOS 실제 빌드 및 배포
- Open Questions에 대한 결정
