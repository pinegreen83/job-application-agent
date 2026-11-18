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

## 미검증과 기존 제한

실제 두 번째 PC, macOS의 setup/native 실행, MSVC/Xcode·Rust compiler·Cargo.lock 생성은 미검증이다. native 진단 성공도 SDK·CLI 보안 정책·앱 실행 성공의 증거가 아니다. 기존 개발 의존성 high 5건과 M0-A native 차단은 계속 남아 있다. [M0-A 결과](M0_A_RESULTS.md)의 AC-M0-01 전체 미충족 및 M0 Gate 미통과 판정을 유지한다.

이 변경은 `feat/3-m0-a-foundation` 위의 별도 PR이다. main에 아직 없는 기반 코드를 전제로 하므로 새 기기는 문서의 `feat/5-cross-device-setup` 브랜치를 받아야 한다. 사용자 merge 순서와 후속 base 조정은 [WORK_STATUS.md](../WORK_STATUS.md)를 따른다.
