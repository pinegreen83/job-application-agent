# 요구사항 추적표 — v0.2

**상태:** 전체 제품 연결은 제안. M0 구현·검증 추적은 아래 실제 기록으로 갱신했다(2026-11-19). M1 이후는 해당 범위 승인·구현 시 연결한다.

| 사용자 요구사항 | 기능 명세 | 마일스톤 |
|---|---|---|
| UR-001, UR-002, UR-003 | SPEC-001 | M1 |
| UR-004 | SPEC-002 | M1 |
| UR-005 | SPEC-003 | M2 |
| UR-006 | SPEC-003, SPEC-007 | M2 |
| UR-007 | SPEC-007, SPEC-008 (선택 분야 중심 정렬) | M2/M3 |
| UR-008 | SPEC-008 | M3 |
| UR-009 | SPEC-004, SPEC-009 | M4/M5 |
| UR-010 | SPEC-004 | M4 |
| UR-011 | SPEC-009 | M5 |
| UR-012 | SPEC-004, SPEC-005, SPEC-009 | M4/M5 |
| UR-013 | SPEC-005 | M5 |
| UR-014 | SPEC-005, SPEC-010 | M5/M6 |
| UR-015, UR-016 | SPEC-010 | M6 |
| NFR-001 | SPEC-001, SPEC-003, SPEC-010 | M1/M2/M6 |
| NFR-002 | SPEC-002, SPEC-004 | M1 기반, M2/M4/M5 재사용 |
| NFR-003, NFR-006 | SPEC-004 | M0 Mock, M1 실제 연결, 이후 재사용 |
| NFR-004, NFR-007, NFR-011 | SPEC-006 | M0/M7 |
| NFR-005 | SPEC-010 | M6 |
| NFR-008 | 후속 범위 | 추후 |
| NFR-009 | SPEC-003, SPEC-004, SPEC-005, SPEC-007 | M2/M4/M5 |
| NFR-010 | SPEC-001, SPEC-002 | M1 |
| DEV-001~DEV-008 | SPEC-011, SPEC-006 | 전 단계 |

## 실제 개발 시 입력할 추적 열
각 요구사항별 `Issue URL`, `PR URL`, `수용 테스트 ID`, `테스트 결과`, `릴리스 태그`를 추가한다. 아직 생성되지 않은 Issue/PR/릴리스의 링크를 만들어 넣지 않는다.

## 수용 기준 보완 및 승인 경계
- UR-006/007: 개인 선호 평가 제외. FR-007-01~06 및 AC-007-02/04/06은 자격·경험 평가와 선택 분야 정렬을 구분한다.
- UR-004: FR-002-05/06 → AC-002-06/07 (수동 수정 보존, 직무 불명확).
- NFR-006/010: FR-004-01/07 → AC-004-06/07 (공통 Provider 계약, 오류·취소).
- UR-010/012: FR-004-04/05 → AC-004-08 (원본 보존, 독립 리뷰 대상 revision).
- UR-012/013: FR-005-03 → AC-005-02/07 (본문·첨부 교체 시 재승인).
- UR-011: FR-009-04 → AC-009-05~07 (제약·금지 정보·질문 불일치 검사).
- M0: `MILESTONES.md`의 AC-M0-01~06은 PR #2에서 계획과 함께 승인됐다. M0 전체 Gate는 Mac 실기기 통합 미검증으로 미통과다.

이 표는 전체 FR/AC 매핑 완료를 의미하지 않는다. 각 Issue 착수 시 그 범위의 FR마다 검증 AC/테스트를 연결하고, 미정 기대 결과는 먼저 확정한다. 전체 프로토타입 범위는 확정됐지만 상세 Spec과 새 AC는 검토 상태를 유지한다.

## M0 실제 구현·검증 추적

[준비 Issue #1](https://github.com/pinegreen83/job-application-agent/issues/1) → [PR #2](https://github.com/pinegreen83/job-application-agent/pull/2)에서 [M0 계획](../plans/M0_PLAN.md)·AC를 사용자 승인했다. DEV-002~006/008의 Issue→브랜치→PR→사용자 병합·CI 기록은 다음과 같다. 공개 Release/DEV-007은 이번에 수행하지 않았다.

| AC / 요구 | Issue / 사용자 병합 PR | 수용 검사와 결과 |
|---|---|---|
| AC-M0-01; NFR-004/011, FR-006-01, AC-006-01 | [#3](https://github.com/pinegreen83/job-application-agent/issues/3) / [#4](https://github.com/pinegreen83/job-application-agent/pull/4) | [M0-A](verification/M0_A_RESULTS.md): 기본 합성 창 양쪽 OS 확인. 후속 통합 source의 Mac은 미검증 |
| AC-M0-02; NFR-011, 아키텍처 경계 | [#10](https://github.com/pinegreen83/job-application-agent/issues/10) / [#11](https://github.com/pinegreen83/job-application-agent/pull/11) | [M0-B](verification/M0_B_RESULTS.md), [통합](verification/M0_RESULTS.md): Windows 실제 경계12/12, 정상·빈 입력, handler/ACL 테스트 |
| AC-M0-03; NFR-001/011 | [#12](https://github.com/pinegreen83/job-application-agent/issues/12) / [#13](https://github.com/pinegreen83/job-application-agent/pull/13) → [#15](https://github.com/pinegreen83/job-application-agent/pull/15) | [M0-C](verification/M0_C_RESULTS.md), [통합](verification/M0_RESULTS.md): Windows 합성 저장/강제 실패·원본 보존/프로세스 종료 후 복원.#15로 main 반영 |
| AC-M0-04; NFR-003/006/011, FR-004-01/02/07, AC-004-04/06/07 Mock 부분 | [#14](https://github.com/pinegreen83/job-application-agent/issues/14) / [#16](https://github.com/pinegreen83/job-application-agent/pull/16) | [M0-D](verification/M0_D_RESULTS.md): Windows native10/10·수동 취소·저장본 보존. 실제 Provider/AI 품질/초안 저장 완료 아님 |
| AC-M0-05; NFR-004/011, FR-006-02/06, AC-006-02/04 | [#17](https://github.com/pinegreen83/job-application-agent/issues/17) / [#18](https://github.com/pinegreen83/job-application-agent/pull/18) | [M0-E](verification/M0_E_RESULTS.md): 고정 scanner 양성/음성·redaction·경계. [CI 44469567393](https://github.com/pinegreen83/job-application-agent/actions/runs/44469567393) Windows/macOS Rust16·Chromium48·정적·기밀·native build 통과 |
| AC-M0-06; NFR-004, FR-006-04, AC-006-06 | [#19](https://github.com/pinegreen83/job-application-agent/issues/19) / [#20](https://github.com/pinegreen83/job-application-agent/pull/20) | [M0 통합 결과](verification/M0_RESULTS.md): 보고서 main 반영, Windows 통합 완료, Mac 실기기 보류 → 전체 Gate 미통과 |

환경 재현·폴더 분리 추적: [#5](https://github.com/pinegreen83/job-application-agent/issues/5)/[#6](https://github.com/pinegreen83/job-application-agent/pull/6), [#8](https://github.com/pinegreen83/job-application-agent/issues/8)/[#9](https://github.com/pinegreen83/job-application-agent/pull/9).[기기 전환 결과](verification/CROSS_DEVICE_RESULTS.md), [현재 상태](WORK_STATUS.md)를 따른다. M0 결과의 head/run·실기기와 renderer 증거를 혼동하지 않는다.

## M1 준비 추적 — 승인 전

[문서 인계 Issue #21](https://github.com/pinegreen83/job-application-agent/issues/21) → [인계](M1_HANDOFF.md) → [계획 제안](../plans/M1_PLAN.md)에 UR-001~004, NFR-001/002/003/004/006/010/011, SPEC-001/002/004 M1 부분의 결정·PR 분할·AC 테스트를 제안했다. M1 구현 Issue/PR·수용 테스트 결과·릴리스 태그는 아직 없다. 이 준비 기록을 기능 승인이나 구현 완료로 취급하지 않는다.

## 이전 v0.1에서 의도적으로 변경한 내용
1. **핵심 우선순위:** RAG 작성 자동화 → 대량 공고의 중복 관리와 개인화 적합성 평가.
2. **기술:** Electron/TypeScript/Windows-first → Tauri 2/Rust/React+TS/SQLite, Windows+macOS 동등 지원.
3. **지원:** 자동 제출 어댑터/사이트 조작 → 최종 지원 링크·자료 제공, 사용자가 직접 제출.
4. **개발 방식:** 명세 설명 위주 → 사용자 URS 승인, Issue/기능 브랜치/PR 리뷰/사용자 Merge.
5. **배포:** Windows 우선 설치본 → Windows/macOS 설치본을 GitHub Releases로 배포. Pages는 앱 실행 환경이 아니다.
