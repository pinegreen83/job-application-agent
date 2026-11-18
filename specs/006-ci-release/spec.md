# SPEC-006 — Windows/macOS CI, 마일스톤 설치 파일과 업데이트 안내

- 상태: Draft / M0~M7 / P0 운영 요구
- URS: DEV-001, DEV-006, DEV-007; NFR-004, NFR-007, NFR-011

## 기능 요구사항
- **FR-006-01** 공개 소스코드에서 샘플 데이터만으로 개발/빌드/테스트가 재현 가능해야 한다.
- **FR-006-02** PR 생성·수정 시 GitHub Actions에서 Rust/TypeScript 정적 검사, 테스트, 기밀정보 검출, Windows/macOS 빌드를 수행한다.
- **FR-006-03** 지정한 마일스톤의 승인된 릴리스 태그에서 OS별 설치 파일을 생성해 GitHub Releases에 제공한다.
- **FR-006-04** Windows와 macOS 양쪽에서 실행·로컬 저장소·알림·문서 가져오기 등 핵심 동작을 시험한다. 패키징과 실기기 테스트는 구분한다.
- **FR-006-05** 새 릴리스가 있으면 앱이 알리고, 실제 다운로드/설치는 사용자가 직접 선택한다.
- **FR-006-06** 사용자 데이터, API 키, 원본 메일, 제출 PDF가 앱 번들이나 Actions 로그/아티팩트에 포함되지 않아야 한다.
- **FR-006-07** macOS 서명·공증/아키텍처 및 Windows 서명·SmartScreen 관련 제한을 릴리스 문서에 안내한다.

## 수용 기준
- **AC-006-01** Given 새 개발 환경, When 설치 및 테스트 절차를 실행하면 Then 가상 데이터로 실행을 재현할 수 있다.
- **AC-006-02** Given PR, When CI가 완료되면 Then 각 OS 및 검사 결과가 PR에 확인된다.
- **AC-006-03** Given 승인된 마일스톤 태그, When Release Workflow를 실행하면 Then 다운로드 가능한 Windows/macOS 설치 파일이 생성된다.
- **AC-006-04** Given 산출물 검사, When 설치 파일·로그를 확인하면 Then 실사용 개인정보와 키가 포함되어 있지 않다.
- **AC-006-05** Given 새 버전이 있을 때, When 앱이 확인하면 Then 업데이트 알림만 띄우고 사용자 동의 없이 설치하지 않는다.
- **AC-006-06** Given 두 OS에 설치, When 핵심 스모크 테스트를 실행하면 Then 각 OS 결과가 별도로 기록된다.

## 설계 유보
Windows 아키텍처, macOS Apple Silicon/Intel 대상, 코드 서명/공증, 라이선스와 GitHub Actions 러너 비용은 릴리스 전 확정한다.
