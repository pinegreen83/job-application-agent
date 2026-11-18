# 아키텍처 초안 v0.2 — Tauri/Rust 로컬 우선

상위 기준: `URS.md` / 기술 결정: `DECISIONS.md`. 구현 상세는 Spec 승인 후 확정한다.

## 구성
```
Windows / macOS (단일 사용자 로컬 앱)
┌─────────────────────────────────────────────────────────┐
│ Tauri 2                                                  │
│  WebView: React + TypeScript (목록/상세/검토/상태/설정)   │
│     │ Tauri commands/events: 제한된 IPC                 │
│  Rust Application Services                               │
│    ├─ Mail Intake/Parser, Job Link Normalizer           │
│    ├─ JD Fetch/Extractor + Eligibility Parser          │
│    ├─ Profile Ingest/Versioning + Local Retrieval       │
│    ├─ Suitability Analyzer/Ranking                      │
│    ├─ Draft Generation + Independent AI Reviewer        │
│    ├─ Form Screenshot/Text Intake + Answer Assist       │
│    ├─ Human Review + Submission Materials Export        │
│    ├─ Application Tracker + Reminder + Update Notice    │
│    ├─ LLM Provider Adapters                              │
│    └─ SQLite + local document/PDF storage + key store   │
└─────────┬─────────────────────┬─────────────────────────┘
          │ HTTPS JD lookup      │ optional outbound LLM API
     job platforms          OpenAI/Gemini etc.
     (user submits           or local Ollama
      manually in browser)
```

## 책임/경계
- **Renderer:** 사용자 입력 및 표시만 담당. 저장소·API 키·임의 OS 명령에 직접 접근하지 않는다.
- **Tauri Rust commands:** 명시된 기능 단위로 입력 검증, 경로 및 권한 통제. OS 기능/DB/외부 HTTP는 네이티브 계층에서 처리한다.
- **Mail intake:** 사용자가 선택한 `.eml` 또는 복사 텍스트에서 다수 공고 추출; 발신 인증을 절대적인 신뢰 근거로 사용하지 않는다.
- **JD Fetch:** HTTPS 원문을 읽되 원격 문서를 지시로 실행하지 않고, 요청 허용 도메인·리다이렉트·내부망 차단 등을 검증한다. 접근이 안 되면 추출 실패로 보존한다.
- **Profile:** 마스터 문서의 사실 상태(확정/회상/불확실/사용 금지)와 프로젝트 역할·검증 증거를 유지하며 버전별로 관리한다.
- **Retrieval:** SQLite FTS5 기반 로컬 검색을 첫 후보로 검증한다. 임베딩 기반 검색은 검색 품질 측정 후 별도 결정하며, 검색엔진이 곧 사실 검증기는 아니다.
- **Suitability:** 지원 자격 요건과 JD-경험 연관성을 구분하고 근거/모름 상태를 보관한다. 기본 정렬은 선택 분야-JD 연관성을 사용하며 경험 평가와 구분한다. 별도 개인 선호 입력·평가는 최초 릴리스에서 제외한다. 동점·실패 등 세부 정렬 규칙은 SPEC-007 착수 전에 확정한다.
- **Provider Adapter:** 분석·평가·생성·리뷰의 공통 기반이다. M0 Mock 계약 → M1 최초 실제 연결 → 후속 기능 재사용 순서로 호출/연결 테스트/모델 선택/오류 처리를 추상화한다. 개인 키·계정은 사용자가 준비한다. 클라우드 호출 전 전송할 텍스트 범위를 안내한다.
- **Generation/Reviewer:** JD+근거를 바탕으로 작성하고 **별도의 검토 호출·프롬프트/역할**로 주장의 적합성·사실관계를 점검한다. 동일 공급자/모델이라도 두 단계의 입력·출력·검토 근거를 분리한다. '다른 모델 필수' 여부는 미정.
- **Submission Pack:** 최종 승인본, 첨부 후보, 문항별 복사 텍스트, 제출 URL을 제공한다. **외부 웹사이트에 제출하는 코드/어댑터는 만들지 않는다.**
- **Tracker/Reminder:** 사용자가 제출 완료 표시 및 실제 최종본 PDF 첨부. 전형 단계 기록 및 아침 확인 알림. 앱이 종료된 경우 보장 방법은 별도 기술 검증 대상이다.

## 저장과 보안
- 영구 사용자 데이터는 앱 전용 로컬 디렉터리 및 로컬 SQLite에 저장한다. OS별 경로는 Tauri에서 제공하는 경로 API 사용을 검토한다.
- PDF/이력서/스크린샷/메일 원본은 로컬 파일이며, DB에는 해시·버전·연결 메타데이터를 기록할 수 있다. 삭제·복사/내보내기 정책은 명세 승인 시 확정한다.
- API 키는 OS 자격증명 저장소 등의 보호 메커니즘을 사용한다. 평문으로 DB·로그·설정 파일·프런트엔드 번들에 넣지 않는다.
- 클라우드 LLM은 영구 보관 장소가 아니라 사용자가 설정한 **외부 처리 서비스**다. 전송한 정보는 공급자 정책의 영향을 받으므로 로컬 저장과 구별해 안내한다.
- 링크는 신뢰하지 않는 입력이다. `file:`, `javascript:`, loopback/사설 주소, 리다이렉트를 통한 내부 네트워크 접근 차단, 시간/크기 제한, 외부 링크를 시스템 브라우저로 안전하게 열기 등의 보호를 요구한다.
- HTML 메일의 추적 이미지/iframe/스크립트 자동 로딩 금지. 이미지 캡처도 유효성/크기·형식을 검증한다.
- GitHub Public, CI, 설치 파일에 개인 데이터·인증정보 포함 금지. 테스트는 가상 데이터만 사용한다.

## 크로스 플랫폼/운영
- Windows: WebView2. macOS: WKWebView. 각 OS에서 렌더링/파일 대화상자/알림/SQLite/설치 동작 검증.
- 배포 아키텍처 구분: Windows/macOS 설치 패키지를 Actions로 생성하고 GitHub Releases에 올린다. GitHub Pages는 앱 런타임이 아니다.
- 앱 업데이트는 신규 릴리스 통지만 하고, 업데이트/설치는 사용자 선택.
- 창 닫기→트레이/메뉴 막대 실행, 로그인 자동 시작, 지정 시각 알림 등은 OS별 동작을 검증해 선택 옵션으로 설계. 알림을 놓친 경우 다음 앱 실행에서 확인할 수 있어야 한다는 방안을 검토한다.

## 기술 선택에서 확인할 트레이드오프
Tauri는 OS WebView를 재사용해 Chromium을 앱별로 패키징하지 않지만, 웹 렌더링의 CPU/메모리 비용이 사라지는 것은 아니다. 실제 유휴 메모리·첫 실행 시간·배포 파일 크기를 측정해 기대와 결과를 구분한다. Rust 학습 비용과 WebView별 UI 차이도 기록한다.
