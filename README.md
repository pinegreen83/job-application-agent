# Job Application Agent — Spec-Driven Development

**버전:** 0.2.1 · **상태:** 최초 통합 프로토타입 범위 확정 / 상세 명세 검증 단계 · **2026-11-18**

개인 취업 지원자를 위한 **로컬 우선 채용공고 분석 및 지원 관리 데스크톱 앱**. 하루에도 여러 통씩 쌓이는 추천 메일에서 개별 공고를 추출하고 중복을 정리한 뒤, 상세 JD와 실제 경험을 비교해 검토 우선순위를 제시한다. 검토한 공고에 대해 간편 지원용 이력서 수정 또는 기업 자체 지원서 작성 보조를 제공하고, **사용자가 외부 사이트에서 직접 제출**한 결과를 관리한다.

## 요구사항부터 시작하기
1. `docs/URS.md` — 사용자가 직접 제시한 필요와 미확정 요구사항 (제품 명세의 상위 기준)
2. `docs/PRD.md` — 최초 통합 프로토타입 범위와 제품 흐름
3. `specs/**/spec.md` — 기능별 FR·AC 및 테스트 가능한 완료 기준
4. `docs/REQUIREMENTS_TRACEABILITY.md` — URS ↔ Spec ↔ 개발 단계
5. `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` — 기술 선택 근거와 아키텍처
6. `AGENTS.md`, `CODEX_START.md` — Codex 개발/협업 규칙

## 현재 기술 방향
- Desktop: **Tauri 2**, Rust (로컬/네이티브 로직)
- Frontend: React + TypeScript (OS WebView UI)
- Database: SQLite (사용자 PC 로컬 RDBMS)
- LLM: 사용자가 직접 구성하는 공급자(OpenAI API, Gemini API, 로컬 Ollama 등)를 교체 가능한 구조로 지원
- OS: **Windows + macOS 모두 필수**
- GitHub: **Public** 소스 저장소, 기능별 Issue/브랜치/PR, 사용자 직접 코드 리뷰·Merge
- CI/CD: PR 자동 검사, 마일스톤마다 OS별 설치 파일을 GitHub Releases에 배포

Tauri 선택은 OS WebView 재사용과 Rust 학습이라는 결정이다. 더 빠르고 메모리를 적게 쓴다는 주장은 **측정 전 가정**이다.

## 최초 릴리스 범위
메일 첨부·다중 공고/중복 처리·JD 분석부터 이력서 맞춤 수정·자체 문항 작성·AI 검토·사용자 승인·직접 제출 자료 제공·PDF/전형/아침 알림 관리까지 포함하는 통합 프로토타입이다. 기본 정렬은 **선택 분야와 JD의 연관성**을 우선하며 별도 개인 선호 입력·평가는 제외한다. Provider는 초기 공통 기반으로 도입한다. 세부 범위는 `docs/PRD.md`, 내부 개발 순서와 승인할 기준은 `docs/MILESTONES.md`를 따른다.

## SDD와 GitHub 개발 흐름
`요구사항(URS) 확인 → 기능 Spec 승인 → Issue 생성 → feature 브랜치 → 구현·AC 테스트 → PR → 사용자 리뷰 → Merge → 마일스톤 릴리스`

- `main` 브랜치에서 직접 구현하거나 자동 Merge하지 않는다.
- Codex는 **이슈/명세 기반 변경만** 제안하고, PR을 제출하면 사용자 검토를 기다린다.
- 공개 저장소, 테스트 Fixture, Actions 로그, Release 설치 파일에 **실제 이력서/자소서/메일/연락처/API 키를 포함하지 않는다**.
- 이전 버전의 '외부 채용 사이트 자동 제출' 요구사항은 **폐기**되었다.

## 현 상태와 개발 시작
이 디렉터리는 **명세 문서 세트**다. 완성된 앱이나 CI 파이프라인이 아니다. Codex에서 저장소를 열고 `CODEX_START.md`의 지침으로 **명세 검토부터** 시작한다.

프로필과 메일 샘플은 퍼블릭 저장소에 넣지 말고 개인정보가 제거된 합성 Fixtures만 사용한다. 초기 대상 OS/배포 조건은 `docs/MILESTONES.md` 및 `specs/006-ci-release/spec.md`를 따른다.
