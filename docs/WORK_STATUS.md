# 개발 이어가기 상태

- 갱신: 2026-11-19 / 문서 정리·인계: [Issue #21](https://github.com/pinegreen83/job-application-agent/issues/21)
- 저장소: [pinegreen83/job-application-agent](https://github.com/pinegreen83/job-application-agent)
- 인계 기준: `main`의 `6458192a27b3234b7a0b0efac690fde96e16db56` (M0 PR #20까지 사용자 병합). 인계 문서 자체의 병합 여부는 Issue #21 연결 PR을 확인한다.
- **M0 구현·Windows 통합·양쪽 OS CI 완료. Mac 실기기 통합은 미검증으로 M0 전체 Gate는 미통과.**
- **M1은 새 대화에서 설계·테스트 계획 검토부터 시작한다.** [M1 인계](M1_HANDOFF.md) → [계획 제안](../plans/M1_PLAN.md). 이번 문서 정리는 M1 구현·설계·실제 AI 호출 승인이 아니다.
- 설치/동기화 절차: [NEW_MACHINE.md](NEW_MACHINE.md)
- 새 checkout 검증: [CROSS_DEVICE_RESULTS.md](verification/CROSS_DEVICE_RESULTS.md) — Windows Node 24.22.3 setup/build, Chromium 2건·Edge 2건 통과. 공통 setup의 Mac 검증과 M0-A Mac native 검증은 구분한다.

## 확정·완료된 준비

- PR #2는 사용자가 계획·M0 AC 승인 체크 후 직접 merge했다. main의 준비 완료 기준 commit은 `1a1b0c9`다.
- [M0-A Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3) / [PR #4](https://github.com/pinegreen83/job-application-agent/pull/4): 사용자가 2026-11-19 main에 직접 병합했다(`de88088`). 양쪽 OS CI, Windows 직접 관찰과 Mac 사용자 확인으로 기본 창·종료/재실행을 검증했다. [M0-A 결과](verification/M0_A_RESULTS.md).
- [Issue #5](https://github.com/pinegreen83/job-application-agent/issues/5) / [PR #6](https://github.com/pinegreen83/job-application-agent/pull/6): 소스 개발환경의 checkout/setup/진단/작업 handoff 설정. Windows/macOS CI 통과 후 사용자가 main에 병합했다(`a99bdb6`). 병합된 브랜치는 정리했다. 기존 Codex 대화 원격 접속과는 다른 범위다.
- [Issue #8](https://github.com/pinegreen83/job-application-agent/issues/8) / [PR #9](https://github.com/pinegreen83/job-application-agent/pull/9): frontend/backend 폴더 분리, 두 OS CI 통과 후 사용자 병합 완료(`5c26c2d`). 이전 브랜치 정리 완료.

## M0 병합·검증과 남은 조건

1. 의존성 변경 시 전체/runtime audit을 재확인한다. [Issue #7](https://github.com/pinegreen83/job-application-agent/issues/7)의 기존 advisory는 GitHub에서 철회됐고 2026-11-19 같은 lockfile의 전체 audit은 0건이다. [철회·재검사 기록](verification/M0_A_DEPENDENCY_REVIEW.md).
2. M0-B [PR #11](https://github.com/pinegreen83/job-application-agent/pull/11)은 main 반영 완료. M0-C #13은 기능 브랜치로 병합됐으나 [PR #15](https://github.com/pinegreen83/job-application-agent/pull/15)가 main 통합을 완료했다(`5b05b88`). [IPC 결과](verification/M0_B_RESULTS.md), [SQLite 결과](verification/M0_C_RESULTS.md).
3. M0-D [PR #16](https://github.com/pinegreen83/job-application-agent/pull/16)은 main 반영 완료(`21ab8f6`). Rust 16건·renderer 48건, Windows 실제 Mock 10/10·수동 취소·저장본 보존 통과. [계약](PROVIDER_CONTRACT.md), [결과](verification/M0_D_RESULTS.md).
4. M0-E [PR #18](https://github.com/pinegreen83/job-application-agent/pull/18)은 main 반영 완료(`d338f3e`). 고정 scanner·합성 탐지·공개 경계 검사 추가. [범위](SECURITY_CHECKS.md), [결과](verification/M0_E_RESULTS.md).
5. M0-F [PR #20](https://github.com/pinegreen83/job-application-agent/pull/20)은 main 반영 완료(`6458192`). e27a0d5로 Windows 실제 창·IPC 12/12·SQLite 저장/강제 실패/완전 종료 후 복원·Mock 10/10/수동 취소를 통과했다. [결과·Mac 체크리스트](verification/M0_RESULTS.md). Mac은 현재 사용할 수 없어 실기기 통합 보류이며 [Issue #19](https://github.com/pinegreen83/job-application-agent/issues/19)를 열어 둔다. 매 PR마다 반복 요청하지 않고 접근 가능할 때 일괄 검증한다.

문서 head `5c06d15`의 [CI 44469567393](https://github.com/pinegreen83/job-application-agent/actions/runs/44469567393)은 Windows/macOS 전체 success다. Rust16·Chromium48·정적/기밀 검사·native debug no-bundle build·lock 무변경을 확인했다. 당시 tracked 98건, history/index/작업 snapshot credential 각0건이며 새 변경은 다시 검사한다. e27a0d5와 main 6458192 사이 backend/frontend/scripts/manifest/lock/workflow diff 없음을 인계 때 확인했다. 이를 새 main에서 실기기를 재실행한 증거로 표현하지 않는다.

병합된 로컬 작업 브랜치 4개·원격 5개를 코드 보존 확인 후 정리했다. 이전 feat/10 원격도 SQLite tree 및 source commit의 main 포함을 확인해 삭제했다. 정리 직후 main/origin/main만 남았고 Issue #21 문서 브랜치는 이후 생성됐다. 새 대화는 실제 Git/PR 상태를 다시 확인하며 삭제된 과거 브랜치로 전환하지 않는다.

Windows 기준 다음 단계 준비·개발은 가능하다. M1 구현 Issue·첫 Provider/모델·제품 schema는 아직 없거나 미확정이며 [계획 제안](../plans/M1_PLAN.md)의 현재 작업에 필요한 항목만 사용자 검토 후 확정한다. 최초 릴리스의 전체 범위는 [URS](URS.md)/[PRD](PRD.md)를 따른다. 사용자는 PR을 직접 리뷰·merge하며 Rust 주요 설계 이유를 설명받고자 한다.

## 이관 원칙

commit/push된 코드·문서와 GitHub Issue/PR이 기기 간 기준이다. 수정 후 이 문서의 브랜치/상태·검증 제한을 갱신하고 공개 가능한 파일만 push한다. 개인 자료·실제 메일·PDF·앱 DB·API 키·로그/대화 파일은 GitHub로 옮기지 않는다. LLM 실제 호출·공개 Release·전체 Spec 승인·사용자 merge 권한은 이번 환경 설정으로 확대되지 않는다.
