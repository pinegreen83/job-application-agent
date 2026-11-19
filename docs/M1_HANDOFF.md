# 새 대화에서 M1 시작하기

2026-11-19 / [문서 인계 Issue #21](https://github.com/pinegreen83/job-application-agent/issues/21). 요구사항을 대체하지 않는 작업 인계다. **이번 대화는 M0 문서 정리와 M1 준비 문서로 마무리하며, M1 설계 승인·구현은 새 대화에서 진행한다.**

## 현재 도착점

- main `6458192a27b3234b7a0b0efac690fde96e16db56`: M0-A~E와 Windows 통합 보고 PR #20까지 사용자 병합 완료. 과거 작업 브랜치 정리 완료. 인계 문서 자체는 Issue #21 연결 PR의 병합 여부를 확인한다.
- Windows 실제 IPC 12/12, SQLite 저장/실패 보존/완전 종료 후 복원, Mock 10/10·수동 취소 완료. 양쪽 OS CI Rust 16건·Chromium 48건·scanner·정적 검사·native no-bundle build 성공. 정확한 head/run은 [현재 상태](WORK_STATUS.md)와 [M0 결과](verification/M0_RESULTS.md)를 따른다.
- Mac은 현재 사용할 수 없어 통합 실기기 검증 보류. [Issue #19](https://github.com/pinegreen83/job-application-agent/issues/19)는 열린 상태다. **M0 전체 Gate 미통과 상태로 Windows 기준 M1 준비/후속 개발 가능.** 매 PR마다 Mac 실행을 다시 요구하지 않고, 접근 가능해지면 일괄 검증한다.
- M1은 미구현. [M1 계획](../plans/M1_PLAN.md)과 SPEC-001/002/004의 M1 부분은 **제안/Draft**, 포괄 승인 아님. 첫 Provider/모델·실제 전송·제품 DB schema도 미확정이다.

## 읽는 순서

1. [AGENTS](../AGENTS.md), [현재 상태](WORK_STATUS.md), 이 인계 문서.
2. [URS](URS.md), [PRD](PRD.md), [마일스톤](MILESTONES.md): 제품 경계와 OQ-01 등 미정 사항.
3. [M1 계획 제안](../plans/M1_PLAN.md), [메일 SPEC-001](../specs/001-mail-intake/spec.md), [JD SPEC-002](../specs/002-job-analysis/spec.md), [Provider SPEC-004](../specs/004-provider-draft/spec.md)의 M1 부분.
4. [아키텍처](ARCHITECTURE.md), [결정](DECISIONS.md), [논리 모델](DATA_MODEL.md), [테스트](TEST_PLAN.md), [추적표](REQUIREMENTS_TRACEABILITY.md).
5. 필요한 범위의 [IPC](M0_B_IPC.md), [SQLite](M0_C_SQLITE.md), [Mock](PROVIDER_CONTRACT.md), [개발 명령](DEVELOPMENT.md), [기밀 검사](SECURITY_CHECKS.md).

`CODEX_START.md`의 원래 첫 메시지는 완료된 초기 bootstrap 기록이다. 초기 읽기 전용 작업이나 M0-A부터 다시 시작하지 않는다. 기능 승인 경계와 AGENTS 규칙은 그대로 따른다.

## 새 대화의 첫 작업

로컬 변경·현재 브랜치·원격 PR/Issue·인계 문서 병합 여부를 확인한다. 미커밋 변경을 덮어쓰지 않는다. 인계가 main에 반영됐다면 깨끗한 checkout에서 main을 fast-forward한다. 미반영이면 Issue #21 연결 PR의 문서와 실제 상태를 먼저 확인하며 자동 merge하지 않는다.

```sh
git status --short --branch
git fetch origin --prune
git branch -a
git log -1 --oneline
```

이후 **M1 계획을 검토하고 지금 필요한 결정만 질문**한다. 입력 범위, 첫 Provider/모델·키 보호·전송 고지, 제품 schema·중복·안전한 JD 접근 정책을 범위별로 확정한다. 실제 모델 비용 발생 호출은 별도 승인 없이 실행하지 않는다. 상세 대안·테스트는 [계획](../plans/M1_PLAN.md)에 있다.

## 현재 코드의 재사용 경계

| 위치 | 역할 / M1 주의점 |
|---|---|
| `frontend/` | React/TS·Vite·브라우저 테스트. 실제 native IPC는 Tauri 창에서 확인 |
| `backend/src/main.rs`, `lib.rs` | 진입·공통 builder·state·command 등록. 별도 HTTP 서버 없음 |
| `record.rs`, `error.rs`, `commands.rs` | 고정 합성 ID/텍스트·오류·좁은 IPC. 실제 메일을 넣도록 제한만 제거하지 않음 |
| `storage.rs` | 합성 테이블 v1·transaction·spawn_blocking. 제품 테이블은 schema/migration 승인 필요. 기존 DB 임의 삭제 금지 |
| `provider.rs`, `provider_commands.rs` | 합성 Mock. 실제 payload/키/전송·제품 동시성/저장 정책이 아님 |
| `ipc_tests.rs`, `frontend/tests/` | handler/ACL 및 renderer 시뮬레이션. 실제 OS/모델 증거와 구분 |
| `.github/workflows/m0-a-native.yml` | main 대상 PR의 양쪽 OS 검사. 이름이 M0여도 현재 검사로 계속 사용 |

Node 권장 **24.22.3**, Rust **1.100.0**. 설치/OS 도구는 [NEW_MACHINE](NEW_MACHINE.md), [DEVELOPMENT](DEVELOPMENT.md)를 따른다. 주요 명령은 루트에서 `npm run doctor -- --native`, `npm run setup -- --tests`, `npm run check:privacy -- --self-test`, `cargo test --manifest-path backend/Cargo.toml --locked`, `npm run tauri dev`다. 읽기·계획 작업만 할 때 설치/전체 빌드부터 반복할 필요는 없다.

`.eml`·`.msg`·DB 파일은 Git/기밀 검사에서 거부한다. 합성 EML은 source 문자열/생성기로 테스트 중 임시 생성하는 안을 제안하며 파일 등록 예외를 자동 추가하지 않는다. 실제 메일/문서/DB/키·원본 로그·Git credential·Codex 로컬 설정·이전 대화 원문은 저장소에 넣지 않는다.

## 새 대화에 붙여 넣을 시작 문구

> 이 프로젝트의 M1을 이어가겠습니다. AGENTS.md, docs/WORK_STATUS.md, docs/M1_HANDOFF.md를 먼저 읽고, 로컬 Git 상태와 GitHub Issue/PR 및 인계 문서 병합 여부를 확인해 주세요. M0 구현·Windows 통합·양쪽 OS CI는 완료됐지만 Mac 실기기 통합은 기기를 사용할 수 없어 Issue #19로 보류 중입니다. M0 Gate를 통과로 바꾸거나 Mac 검증을 반복 요청하지 마세요. plans/M1_PLAN.md와 SPEC-001/002/004의 M1 부분을 검토하여 첫 PR의 범위·미정 결정·FR/AC·테스트 제안부터 제시해 주세요. M1 계획/Provider/제품 schema는 아직 승인되지 않았습니다. 필요한 부분만 사용자 확인 후 Issue·브랜치·구현·PR 순서로 진행하고 자동 merge, 실제 유료 AI 호출, 개인 자료/키 업로드, 외부 자동 제출은 하지 마세요. Rust 코드의 주요 설계 이유도 설명해 주세요.
