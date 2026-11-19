# 개발 이어가기 상태

- 갱신: 2026-11-19
- 저장소: [pinegreen83/job-application-agent](https://github.com/pinegreen83/job-application-agent)
- 현재 이어갈 브랜치: `docs/19-m0-integration-gate` ([Issue #19](https://github.com/pinegreen83/job-application-agent/issues/19)). M0-E까지 포함한 통합 검증 보고서다. main 대상 PR #15 → #16 → #18 → M0-F 순서로 검토한다.
- 설치/동기화 절차: [NEW_MACHINE.md](NEW_MACHINE.md)
- 새 checkout 검증: [CROSS_DEVICE_RESULTS.md](verification/CROSS_DEVICE_RESULTS.md) — Windows Node 24.22.3 setup/build, Chromium 2건·Edge 2건 통과. 공통 setup의 Mac 검증과 M0-A Mac native 검증은 구분한다.

## 확정·완료된 준비

- PR #2는 사용자가 계획·M0 AC 승인 체크 후 직접 merge했다. main의 준비 완료 기준 commit은 `1a1b0c9`다.
- [M0-A Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3) / [PR #4](https://github.com/pinegreen83/job-application-agent/pull/4): 사용자가 2026-11-19 main에 직접 병합했다(`de88088`). 양쪽 OS CI, Windows 직접 관찰과 Mac 사용자 확인으로 기본 창·종료/재실행을 검증했다. [M0-A 결과](verification/M0_A_RESULTS.md).
- [Issue #5](https://github.com/pinegreen83/job-application-agent/issues/5) / [PR #6](https://github.com/pinegreen83/job-application-agent/pull/6): 소스 개발환경의 checkout/setup/진단/작업 handoff 설정. Windows/macOS CI 통과 후 사용자가 main에 병합했다(`a99bdb6`). 병합된 브랜치는 정리했다. 기존 Codex 대화 원격 접속과는 다른 범위다.
- [Issue #8](https://github.com/pinegreen83/job-application-agent/issues/8) / [PR #9](https://github.com/pinegreen83/job-application-agent/pull/9): frontend/backend 폴더 분리, 두 OS CI 통과 후 사용자 병합 완료(`5c26c2d`). 이전 브랜치 정리 완료.

## 우선 남은 검증

1. 의존성 변경 시 전체/runtime audit을 재확인한다. [Issue #7](https://github.com/pinegreen83/job-application-agent/issues/7)의 기존 advisory는 GitHub에서 철회됐고 2026-11-19 같은 lockfile의 전체 audit은 0건이다. [철회·재검사 기록](verification/M0_A_DEPENDENCY_REVIEW.md).
2. 사용자가 M0-B PR #11과 M0-C PR #13을 병합했다. main은 #11의 `7d31a20`이며 #13은 기존 기능 브랜치로 병합돼 SQLite `d31e390`이 아직 main에 없다. 같은 변경의 main 통합 PR #15를 제출했고 두 OS CI를 통과했다. main 포함 ancestry 확인 전 이전 브랜치를 삭제하지 않는다.
3. M0-D [PR #16](https://github.com/pinegreen83/job-application-agent/pull/16)은 두 OS CI, Rust 16건·renderer 48건, Windows 실제 Mock 10/10·수동 취소·저장본 보존을 통과했다. [Provider 계약](PROVIDER_CONTRACT.md)과 [결과](verification/M0_D_RESULTS.md)를 참조한다. 이후 PR은 main 대상으로 두며 자동 merge하지 않는다.
4. M0-E [PR #18](https://github.com/pinegreen83/job-application-agent/pull/18): 고정 기밀 스캐너·합성 탐지 self-test·공개 경계 검사를 추가했다. e27a0d5의 [CI 44468357728](https://github.com/pinegreen83/job-application-agent/actions/runs/44468357728)은 양쪽 OS 전체 success다. 공개 tracked 97건, 이력/index/작업 snapshot 각 검출 0건. [검사 범위](SECURITY_CHECKS.md), [결과](verification/M0_E_RESULTS.md).
5. M0-F [통합 결과·Mac 일괄 체크리스트](verification/M0_RESULTS.md): e27a0d5로 Windows 실제 창·IPC 12/12·SQLite 저장/강제 실패/완전 종료 후 복원·Mock 10/10/수동 취소를 모두 통과했다. Mac의 같은 source 실제 통합은 미검증이다. 사용자에게 마지막 일괄 결과를 받은 뒤 최종 Gate를 판단한다. 사용자 PR 리뷰·main 통합도 남아 있다.

M0-A의 양쪽 OS 기본 창 확인과 사용자 merge를 마쳤다. M0 전체 Gate는 미통과다. 빠른 M0 완료를 우선하되 M0-B~F의 IPC·SQLite·Mock·전체 CI/보안·OS Gate는 작은 PR로 진행하고 관련 설계 유보 사항을 착수 전에 확인한다. 최초 릴리스의 전체 통합 범위는 [URS](URS.md)/[PRD](PRD.md)를 따른다.

## 이관 원칙

commit/push된 코드·문서와 GitHub Issue/PR이 기기 간 기준이다. 수정 후 이 문서의 브랜치/상태·검증 제한을 갱신하고 공개 가능한 파일만 push한다. 개인 자료·실제 메일·PDF·앱 DB·API 키·로그/대화 파일은 GitHub로 옮기지 않는다. LLM 실제 호출·공개 Release·전체 Spec 승인·사용자 merge 권한은 이번 환경 설정으로 확대되지 않는다.
