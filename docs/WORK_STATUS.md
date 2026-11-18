# 개발 이어가기 상태

- 갱신: 2026-11-18
- 저장소: [pinegreen83/job-application-agent](https://github.com/pinegreen83/job-application-agent)
- 현재 이어갈 브랜치: `feat/5-cross-device-setup`
- 설치/동기화 절차: [NEW_MACHINE.md](NEW_MACHINE.md)
- 새 checkout 검증: [CROSS_DEVICE_RESULTS.md](verification/CROSS_DEVICE_RESULTS.md) — Node 24.22.3 setup/build, Chromium 2건·Edge 2건 통과. 실제 다른 기기/macOS는 미검증.

## 확정·완료된 준비

- PR #2는 사용자가 계획·M0 AC 승인 체크 후 직접 merge했다. main의 준비 완료 기준 commit은 `1a1b0c9`다.
- [M0-A Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3) / [Draft PR #4](https://github.com/pinegreen83/job-application-agent/pull/4): 합성 화면·Tauri 실행부·npm lockfile·개발 문서. frontend check/build, Edge 스모크 2건 통과. 구현 commit `b7fa17c`.
- [Issue #5](https://github.com/pinegreen83/job-application-agent/issues/5): 사용자 추가 요청에 따라 다른 기기의 checkout/setup/진단/작업 handoff를 구성. PR은 #4 브랜치를 base로 하는 별도 stacked PR이다. PR #4와 이 작업 모두 사용자 merge 대기다.

## 우선 남은 검증

1. 허용되는 Windows 개발 환경에서 Rust/MSVC/SDK를 준비하고 Cargo.lock 생성·commit, Rust fmt/check/clippy/test와 Tauri native compile/기본 창을 검증한다. 현재 PC는 CLI native module의 Windows 앱 제어 차단도 있다.
2. macOS 개발 환경에서 native compile/창 실행 결과를 별도로 기록한다. Node/browser smoke와 native 검증을 혼동하지 않는다.
3. 개발 의존성 high 5건의 수정판을 확인하고 검증 후 갱신한다. 현재 runtime npm audit은 0건이나 전체 audit은 미해결이다.
4. PR 리뷰와 사용자 merge를 기다린다. #4가 main에 merge되면 후속 stacked PR의 base/변경 diff를 확인해 main 대상으로 조정한다. 자동 merge하지 않는다.

AC-M0-01 전체 및 M0 Gate는 아직 미통과다. M0-B~F의 IPC·SQLite·Mock·CI·OS Gate는 미구현이며 관련 설계 유보 사항을 착수 전에 확인한다. 최초 릴리스의 전체 통합 범위는 [URS](URS.md)/[PRD](PRD.md)를 따른다.

## 이관 원칙

commit/push된 코드·문서와 GitHub Issue/PR이 기기 간 기준이다. 수정 후 이 문서의 브랜치/상태·검증 제한을 갱신하고 공개 가능한 파일만 push한다. 개인 자료·실제 메일·PDF·앱 DB·API 키·로그/대화 파일은 GitHub로 옮기지 않는다. LLM 실제 호출·공개 Release·전체 Spec 승인·사용자 merge 권한은 이번 환경 설정으로 확대되지 않는다.
