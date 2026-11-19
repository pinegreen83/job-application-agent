# 개발 이어가기 상태

- 갱신: 2026-11-19
- 저장소: [pinegreen83/job-application-agent](https://github.com/pinegreen83/job-application-agent)
- 현재 이어갈 브랜치: `feat/12-synthetic-sqlite-storage` ([Issue #12](https://github.com/pinegreen83/job-application-agent/issues/12)). 선행 [PR #11](https://github.com/pinegreen83/job-application-agent/pull/11) 위에 쌓인 M0-C 작업이다.
- 설치/동기화 절차: [NEW_MACHINE.md](NEW_MACHINE.md)
- 새 checkout 검증: [CROSS_DEVICE_RESULTS.md](verification/CROSS_DEVICE_RESULTS.md) — Windows Node 24.22.3 setup/build, Chromium 2건·Edge 2건 통과. 공통 setup의 Mac 검증과 M0-A Mac native 검증은 구분한다.

## 확정·완료된 준비

- PR #2는 사용자가 계획·M0 AC 승인 체크 후 직접 merge했다. main의 준비 완료 기준 commit은 `1a1b0c9`다.
- [M0-A Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3) / [PR #4](https://github.com/pinegreen83/job-application-agent/pull/4): 사용자가 2026-11-19 main에 직접 병합했다(`de88088`). 양쪽 OS CI, Windows 직접 관찰과 Mac 사용자 확인으로 기본 창·종료/재실행을 검증했다. [M0-A 결과](verification/M0_A_RESULTS.md).
- [Issue #5](https://github.com/pinegreen83/job-application-agent/issues/5) / [PR #6](https://github.com/pinegreen83/job-application-agent/pull/6): 소스 개발환경의 checkout/setup/진단/작업 handoff 설정. Windows/macOS CI 통과 후 사용자가 main에 병합했다(`a99bdb6`). 병합된 브랜치는 정리했다. 기존 Codex 대화 원격 접속과는 다른 범위다.
- [Issue #8](https://github.com/pinegreen83/job-application-agent/issues/8) / [PR #9](https://github.com/pinegreen83/job-application-agent/pull/9): frontend/backend 폴더 분리, 두 OS CI 통과 후 사용자 병합 완료(`5c26c2d`). 이전 브랜치 정리 완료.

## 우선 남은 검증

1. 의존성 변경 시 전체/runtime audit을 재확인한다. [Issue #7](https://github.com/pinegreen83/job-application-agent/issues/7)의 기존 advisory는 GitHub에서 철회됐고 2026-11-19 같은 lockfile의 전체 audit은 0건이다. [철회·재검사 기록](verification/M0_A_DEPENDENCY_REVIEW.md).
2. M0-B [PR #11](https://github.com/pinegreen83/job-application-agent/pull/11)은 양쪽 OS CI와 Windows 실제 IPC 검증 후 사용자 리뷰 대기다. 사용자가 2026-11-19 Mac 실기기 절차를 M0 통합 때 일괄 진행하도록 지시해 미검증 한계를 남긴 채 리뷰 가능 상태로 전환했다. [계약](M0_B_IPC.md), [실행 기록](verification/M0_B_RESULTS.md)을 참조한다.
3. Issue #12의 SQLite 설계는 같은 날 사용자가 승인했다. [저장 계약](M0_C_SQLITE.md)과 [검증 기록](verification/M0_C_RESULTS.md)을 참조한다. 선행 PR 병합 뒤 M0-C base를 main으로 바꾸고 병합 브랜치를 정리한다. 자동 merge하지 않는다.
4. 다음 M0-D Provider Mock 계약을 구현 전에 확인한다. M0-E의 기밀 스캔 보완과 M0-F의 Windows/Mac 통합 검증이 남아 있다. Mac 검증 이연은 Gate 통과를 뜻하지 않는다.

M0-A의 양쪽 OS 기본 창 확인과 사용자 merge를 마쳤다. M0 전체 Gate는 미통과다. 빠른 M0 완료를 우선하되 M0-B~F의 IPC·SQLite·Mock·전체 CI/보안·OS Gate는 작은 PR로 진행하고 관련 설계 유보 사항을 착수 전에 확인한다. 최초 릴리스의 전체 통합 범위는 [URS](URS.md)/[PRD](PRD.md)를 따른다.

## 이관 원칙

commit/push된 코드·문서와 GitHub Issue/PR이 기기 간 기준이다. 수정 후 이 문서의 브랜치/상태·검증 제한을 갱신하고 공개 가능한 파일만 push한다. 개인 자료·실제 메일·PDF·앱 DB·API 키·로그/대화 파일은 GitHub로 옮기지 않는다. LLM 실제 호출·공개 Release·전체 Spec 승인·사용자 merge 권한은 이번 환경 설정으로 확대되지 않는다.
