# 개발 이어가기 상태

- 갱신: 2026-11-19
- 저장소: [pinegreen83/job-application-agent](https://github.com/pinegreen83/job-application-agent)
- 현재 이어갈 브랜치: `feat/5-cross-device-setup`
- 설치/동기화 절차: [NEW_MACHINE.md](NEW_MACHINE.md)
- 새 checkout 검증: [CROSS_DEVICE_RESULTS.md](verification/CROSS_DEVICE_RESULTS.md) — Windows Node 24.22.3 setup/build, Chromium 2건·Edge 2건 통과. 공통 setup의 Mac 검증과 M0-A Mac native 검증은 구분한다.

## 확정·완료된 준비

- PR #2는 사용자가 계획·M0 AC 승인 체크 후 직접 merge했다. main의 준비 완료 기준 commit은 `1a1b0c9`다.
- [M0-A Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3) / [PR #4](https://github.com/pinegreen83/job-application-agent/pull/4): 사용자가 2026-11-19 main에 직접 병합했다(`de88088`). 양쪽 OS CI, Windows 직접 관찰과 Mac 사용자 확인으로 기본 창·종료/재실행을 검증했다. [M0-A 결과](verification/M0_A_RESULTS.md).
- [Issue #5](https://github.com/pinegreen83/job-application-agent/issues/5) / [PR #6](https://github.com/pinegreen83/job-application-agent/pull/6): 소스 개발환경의 checkout/setup/진단/작업 handoff 설정. main을 기반으로 변경했고 M0-A와의 충돌을 해소했다. 최신 승인·CI·merge 상태는 PR을 확인한다. 기존 Codex 대화 원격 접속과는 다른 범위다.

## 우선 남은 검증

1. [Issue #7](https://github.com/pinegreen83/job-application-agent/issues/7)에서 개발 의존성 high 영향 패키지 5건의 수정판을 확인하고 검증 후 갱신한다. 하나의 picomatch advisory가 의존 경로에 전파된 결과이며 runtime npm audit은 0건이다.
2. PR #6의 공통 setup을 Windows/macOS CI에서 직접 검증하고 사용자 리뷰·merge를 기다린다. #4 병합 완료 브랜치는 정리했다. #6도 사용자 merge 후 브랜치를 정리한다. Codex는 자동 merge하지 않는다.
3. 승인된 다음 작은 작업 M0-B의 IPC/권한 설계·테스트 범위를 확인한다. 현재 기본 창 검증은 M0-B~F 완료 증거가 아니다.

M0-A의 양쪽 OS 기본 창 확인을 마쳤으며 수용·merge는 사용자 리뷰로 남긴다. M0 전체 Gate는 미통과다. M0-B~F의 IPC·SQLite·Mock·전체 CI/보안·OS Gate는 별도 범위이며 관련 설계 유보 사항을 착수 전에 확인한다. 최초 릴리스의 전체 통합 범위는 [URS](URS.md)/[PRD](PRD.md)를 따른다.

## 이관 원칙

commit/push된 코드·문서와 GitHub Issue/PR이 기기 간 기준이다. 수정 후 이 문서의 브랜치/상태·검증 제한을 갱신하고 공개 가능한 파일만 push한다. 개인 자료·실제 메일·PDF·앱 DB·API 키·로그/대화 파일은 GitHub로 옮기지 않는다. LLM 실제 호출·공개 Release·전체 Spec 승인·사용자 merge 권한은 이번 환경 설정으로 확대되지 않는다.
