# 다른 기기 개발 설정 검증 — 2026-11-18

관련: [Issue #5](https://github.com/pinegreen83/job-application-agent/issues/5), [새 기기 절차](../NEW_MACHINE.md), [이관 상태](../WORK_STATUS.md). NFR-004/011, FR-006-01 / AC-006-01 / AC-M0-01, DEV-002~005/008의 개발 재현 부분만 검증한다.

## 재현 환경

Windows NT 10.0.26200.0 / x64, 공통 Node 24.22.3, npm 11.10.1. Node는 기존 전역 설치를 변경하지 않고 Git 제외 private 경로에 검증용으로 설치했다. 기본 Chromium은 Playwright 1.65.1의 Chromium 159.0.8154.6이며 기존 Edge 157.0.4341.60도 확인했다.

구현 commit `88e66d5`를 로컬 Git 저장소에서 공백이 있는 별도 경로에 `git clone --no-hardlinks --branch feat/5-cross-device-setup`해 빈 node_modules 상태로 시작했다. npm/브라우저 다운로드는 사용자 캐시를 사용할 수 있으므로 완전한 빈 OS나 실제 두 번째 기기 검증을 뜻하지 않는다.

| 검사 | 실행 | 결과 |
|---|---|---|
| Node 문법 | `node --check scripts/doctor.mjs`, `node --check scripts/setup.mjs` | 성공 |
| 기본 환경 진단 | `npm run doctor`와 동일 스크립트 직접 실행 | 성공. Node/npm/Git 확인, Rust/Cargo 부족을 안내 |
| native 부족 감지 | `node scripts/doctor.mjs --native` | 예상대로 exit 1. native 사용 가능으로 오인하지 않음 |
| 잘못된 인자 | doctor/setup에 `--unexpected` | 예상대로 exit 2, 설치 실행 없음 |
| 공통 setup | fresh clone에서 `npm run setup -- --tests` | 성공. npm ci → TS·Tauri 설정 검사 → frontend build → 고정 Chromium 준비 → 테스트 |
| 기본 Chromium | setup의 `npm test` | desktop/narrow 2건 통과 |
| 기존 Edge 경로 | fresh clone의 `npm run test:edge` | desktop/narrow 2건 통과 |
| setup 후 소스 무변경 | fresh clone `git diff --exit-code`, `git status --short --branch` | 성공, 추적 파일 변경 없음 |
| 사용자/생성 파일 제외 | `.env`, `user-data`, `local-data`, `test-results`, native target에 `git check-ignore` | 모두 제외. 실제 사용자 파일은 생성하지 않음 |
| 문서·공개 파일 | 로컬 링크/ID/표·민감정보 후보/whitespace 및 공개 목록 점검 | PR 제출 전 수행, 결과는 PR에 기록 |

Windows npm.cmd 실행은 고정 문자열만 shell에 전달하며 사용자 텍스트를 명령에 삽입하지 않는다. 공통 스크립트는 global Git identity/credential·시스템 도구·보안 정책을 변경하지 않으며 source/branch reset이나 자동 push를 수행하지 않는다. setup은 lockfile의 의존성 설치, frontend build, 선택한 경우 브라우저 다운로드·테스트만 수행한다.

## 2026-11-19 main 병합 이후 보완

사용자가 M0-A PR #4를 병합하고 PR #6 소스 개발환경 설정 마무리를 요청했다. PR #6의 base를 main으로 조정하고 main을 반영했으며 병합 완료 M0-A 브랜치는 정리했다. 삭제된 M0-A 브랜치 checkout 안내와 진행 상태 문서를 갱신했다.

현재 CI는 Windows/macOS에서 새 기기와 **동일한 `npm run setup -- --tests`**를 실행한다. 이 명령의 npm ci·doctor·frontend check/build·Chromium 준비·스모크가 실패하면 작업도 실패한다. 이후 기존 Rust 검사·native 비번들 build·npm/Cargo lockfile 무변경 검사를 유지한다. 실제 실행 head·run URL·결과는 PR #6에 기록한다.

Windows의 새 공백 경로 clone(commit `017aedb`)에서 Node 24.22.3/npm 11.10.1로 같은 setup 명령을 다시 실행해 성공했다. Chromium desktop/narrow 2건, doctor --native, git diff 무변경·깨끗한 상태를 확인했다. 기존 Edge 테스트는 최초 검증 이력을 유지하며 이 문서/CI 통합 작업에서 반복 실행하지 않았다.

fresh 설치 및 전체 audit은 0건이었다. GitHub advisory API에서 기존 picomatch advisory의 철회를 확인했으며 버전/lockfile 변경 없이 검출 상태가 갱신됐다. [상세 의존성 기록](M0_A_DEPENDENCY_REVIEW.md)을 참조한다.

## 미검증과 기존 제한

원래 공통 setup 검증은 Windows fresh clone이며 macOS 공통 setup은 위 CI에서 별도로 확인한다. CI 성공은 모든 실제 두 번째 PC의 SDK·권한·native 창 실행을 보증하지 않는다. native 진단 성공도 SDK·CLI 보안 정책·앱 실행 성공의 증거가 아니다. M0-A는 후속 Windows 직접 관찰과 Mac 사용자 확인, Cargo.lock·CI 검증을 완료해 병합됐다. 기존 의존성 검출은 철회·재검사 이력으로 남기며 [M0-A 결과](M0_A_RESULTS.md)의 M0 전체 Gate 경계는 유지한다.

이 변경은 이제 main을 대상으로 한다. PR #6 리뷰 중에는 문서의 `feat/5-cross-device-setup` 브랜치를 받고, 사용자 merge 뒤에는 main을 받는다. 최신 상태는 [WORK_STATUS.md](../WORK_STATUS.md)와 PR #6을 확인한다.
