# M0-C 합성 SQLite 저장·복원

관련: [Issue #12](https://github.com/pinegreen83/job-application-agent/issues/12), AC-M0-03, NFR-001/011, ADR-002, [M0 계획](../plans/M0_PLAN.md).

2026-11-19 사용자가 라이브러리·schema·명령·테스트 제안을 승인했다. Mac 실기기 검증은 사용자 지시에 따라 M0 통합 단계에서 일괄 진행하며 확인 전까지 미검증이다. M0 Gate 통과나 제품 전체 데이터 모델 확정이 아니다.

## 저장 경계와 schema

Rust가 결정하는 `app_local_data_dir()/m0/synthetic.sqlite3`에 저장한다. UI는 경로·SQL을 전달할 수 없다. 앱 전용 일반 SQLite 파일에 **합성 데이터만** 저장하며 실제 개인 자료의 암호화·삭제·동기화 정책은 아직 확정하지 않았다. 외부 DB 서버·Tauri SQL/file plugin은 없다.

`rusqlite = 0.43.0`은 기본 기능을 끄고 `bundled`만 사용한다. SQLite 별도 설치 없이 Cargo.lock에 고정한 C 라이브러리로 빌드한다. Windows C++/macOS Command Line Tools가 필요하다. 임시 DB 테스트에 dev 의존성 `tempfile = 3.27.0`을 사용한다.

```sql
CREATE TABLE m0_records (
  id TEXT PRIMARY KEY CHECK(id='synthetic-m0-001'),
  text TEXT NOT NULL
);
PRAGMA user_version=1;
```

새 DB/버전0은 DDL과 버전 변경을 하나의 transaction에서 적용한다. v1은 유지하고 다른 버전·migration 실패·손상은 고정 오류로 중단한다. 기존 파일을 삭제·초기화하거나 자동 복구하지 않는다. 제품 공고·프로필·지원서 테이블은 없다.

## 명령과 처리

M0-B 입력 검증을 재사용한다. 합성 ID, text 1~256 Unicode scalar, 공백-only·제어 문자·타입/누락/추가 필드 거부는 동일하다.

| 명령 | 인자 | 결과 |
|---|---|---|
| `m0_save_record` | `{ record: { id, text } }` | commit 후 `{ id, text, status: "saved" }` |
| `m0_load_record` | `{}` | 저장된 `{ id, text }`, 없으면 `null` |
| `m0_simulate_save_failure` | `{ record: { id, text } }` | UPSERT 후 commit 전 rollback. `SIMULATED_SAVE_FAILURE` 오류 |

이 3개만 local main capability에 추가했다. SQL은 parameter binding을 사용한다. 오류는 고정 코드·안내만 직렬화하며 경로·SQL·원문·내부 DB 오류를 반환/로그 출력하지 않는다. 로컬 파일의 저장본이 입력 계약을 어겨도 원문을 UI에 반환하지 않는다.

앱 상태에는 신뢰된 경로 또는 경로 확인 오류만 보관한다. async command는 검증한 문자열과 경로 상태를 소유한 worker에 전달한다. `Connection`은 `spawn_blocking` 내부에서 생성·사용·종료하며 await 경계로 빌리지 않는다. SQLite busy timeout은 2초, 쓰기는 immediate transaction이며 commit 성공 전에 saved를 반환하지 않는다. 강제 실패도 같은 UPSERT 경로를 거쳐 rollback 성공 후에만 의도된 실패 코드가 나온다.

화면은 현재 입력과 마지막 확인 저장본을 분리한다. 시작 시 읽고 저장 성공 후에만 확인 저장본을 갱신한다. 실패·잘못된 응답은 확인 저장본을 덮어쓰지 않는다. 단순 UI timeout으로 성공 가능한 commit을 rollback으로 오인하지 않으며 pending 중 중복 제출을 막는다. 제품의 동시 수정·충돌 정책은 이 합성 단일 레코드 검증 범위가 아니다.

## 테스트와 OS 통합 절차

Rust는 격리된 임시 파일 DB에서 migration 반복·상위 버전/실패 보존, 연결 종료 후 재연결, SQL 문자열/Unicode, 강제 실패 rollback, 읽기 전용/열기 실패, 손상/잘못된 저장본, 동시 transaction을 검사한다. IPC 테스트도 별도 임시 경로를 주입해 실제 사용자 DB에 접근하지 않고 다른 창·remote 거부를 확인한다. Playwright 저장·오류·중복 제출·page reload 검사는 renderer 시뮬레이션이며 실제 SQLite/앱 재시작 증거가 아니다.

각 OS에서 다음을 기록한다. Mac은 M0 통합 때 수행할 미검증 항목이다.

1. 브랜치를 받아 `npm run setup -- --tests` → `npm run tauri dev`를 실행한다. commit/OS·CPU/도구 버전을 기록한다.
2. **합성 로컬 저장**의 **저장할 합성 텍스트**에 `합성 M0-C 저장 복원 🦀`를 입력하고 **로컬에 저장**을 누른다. 마지막 확인 저장본과 저장 완료를 확인한다.
3. 입력만 `실패할 합성 변경`으로 바꾼다. **개발용 저장 실패 검증** → **저장 실패·보존 검사**에서 `SIMULATED_SAVE_FAILURE`, 보존 확인 문구와 원래 저장본을 확인한다.
4. 창/프로세스를 종료하고 재실행한다. 마지막 확인 저장본이 원래 합성 값으로 자동 복원되는지 확인한다. **저장본 다시 읽기**도 확인한다.
5. M0-B 개발용 IPC 경계 검사도 12/12인지 확인한다. OS별 결과를 각각 기록하고 미실행 OS는 통과로 적지 않는다.
6. production CSP는 `npm run tauri build -- --debug --no-bundle --ci -- --locked` 후 실행 파일에서 같은 절차로 확인한다. DB·원문·로그·설치 파일을 GitHub에 올리지 않는다.

PR #11 위에 쌓인 PR도 검사하도록 CI 대상은 `main`과 `feat/**` 기준 PR이다. 권한은 읽기 전용이고 배포하지 않는다. PR #11 병합 뒤 M0-C base를 main으로 전환하고, 의존 PR이 참조하지 않게 된 병합 브랜치를 정리한다. Codex는 자동 merge하지 않는다.
