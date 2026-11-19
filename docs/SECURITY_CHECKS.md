# M0-E 공개 소스·기밀 검사

관련: [Issue #17](https://github.com/pinegreen83/job-application-agent/issues/17), NFR-001/004/011, DEV-006/008, FR-006-02/06, AC-M0-05. 기존 승인된 M0 검사 계획의 구현이며 제품 요구사항·Provider 계약을 바꾸지 않는다.

## 실행

Git 전체 이력을 받은 checkout과 권장 Node 24.22.3, 시스템 `tar`가 필요하다. Windows x64, macOS ARM64/x64를 지원한다. 새 기기의 Node/빌드 준비는 [NEW_MACHINE.md](NEW_MACHINE.md)를 따른다.

```sh
npm run check:privacy -- --self-test
```

검사 대상에 추가할 공개 소스는 먼저 명시적으로 `git add <검토한 경로>`한다. 새 untracked/ignored 개인 자료를 검사하려고 `git add .` 하지 않는다. 기본 `npm run check:privacy`도 이력·index·tracked 작업 파일을 검사하고, `--self-test`는 합성 탐지/실패/보존 경계의 양성·음성 대조를 추가한다. shallow clone은 전체 이력을 받은 뒤 실행한다. CI는 `fetch-depth: 0`으로 checkout한다.

처음에는 [공식 Gitleaks 8.30.1 release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)에서 OS/CPU별 archive를 다운로드한다. 버전·SHA256은 `scripts/security-tools.json`에 고정했다. 공식 GitHub asset digest와 tool MIT 라이선스를 확인했다. 이는 프로젝트 전체 소스 라이선스 선택이 아니다. archive hash·단일 일반 파일 추출·실행 버전을 확인한 뒤 사용하며 불일치면 실행하지 않는다. 전역 도구·계정·OS 보안 설정은 변경하지 않는다.

도구와 redacted 보고서는 ignored `private/security-check/`에 둔다. 캐시 archive도 매번 hash를 확인하고 검증된 archive에서 실행 파일을 추출한다. 배포 파일·프로젝트 의존성에 scanner binary를 포함하지 않는다. 실제 스캔은 로컬/offline이며 소스·파일·검출값을 외부 서비스로 보내지 않는다. 네트워크는 최초 공식 도구 다운로드에만 필요하다.

## 범위와 self-test

- Gitleaks 기본 rules를 확장 없이 사용한다. 현재 별도 allowlist·baseline·fixtures 디렉터리 제외는 없다.
- 모든 reachable Git refs의 이력을 스캔한다. 현재 index blob과 tracked 작업 파일은 각각 별도의 공개 snapshot으로 스캔한다. staged 비밀을 작업 파일에서 지워도 index에서 검출한다.
- 현재 파일뿐 아니라 과거 tree의 삭제된 DB/원본 문서·메일/키·환경 파일/로그/설치 파일·압축/빌드/private 경로와 symlink/submodule을 거부한다. ignored 개인 폴더·앱 DB·node_modules를 재귀 탐색하지 않는다.
- 필요한 private/generated 제외 규칙도 `git check-ignore --no-index`로 확인한다. 현재 `.env.example`은 내용 스캔 대상인 소스 예외이며 실제 `.env` 허용이 아니다.
- self-test는 독립 임시 Git repo에 **미발급 합성 토큰 형식**을 runtime에만 만들고 실제 detector 실패 exit를 확인한다. 실제 계정/키나 유효성 검증 API 호출은 없다. 토큰을 공개 fixture/로그에 넣지 않는다.
- clean fixture 통과, staged 비밀/clean 작업 파일 구분, Git 이력 탐지, report redaction, 변조 archive 거부, 현재/삭제된 과거 private 파일 경로 거부를 검사한다.

wrapper는 scanner stdout/stderr를 전달하지 않고 집계·고정 오류만 출력한다. 보고서에는 `--redact=100`을 적용하고 self-test에서 합성 토큰 원문 부재를 확인한다. CI artifact 업로드·보고서 cache·Release 게시 단계는 없다. 임시 snapshot/fixture는 canonical workspace 안의 전용 mkdtemp 경로인지 확인한 뒤만 정리한다.

## 실패와 한계

검출 또는 검사/다운로드/이력 오류는 실패 exit다. 실패를 성공으로 바꾸거나 폴더 전체를 allowlist에 넣지 않는다. 실제 비밀이 이미 commit된 경우 원문을 대화/CI에 복사하지 말고 redacted 로컬 보고서로 범위를 검토한다. 키 폐기·교체나 Git 이력 재작성은 사용자와 별도로 결정하며 이 검사가 자동으로 수행하지 않는다.

기밀 스캐너는 모든 개인정보·원본 파일 내용을 이해하는 도구가 아니다. 공개 diff·이미지·파일 출처·실제 번들/로그/아티팩트를 사람이 검토해야 한다. 현재 CI의 debug 비번들 빌드 통과는 향후 설치본/서명/공증/배포 검증이 아니다. M0-F의 Windows/macOS 실제 통합 검증과 사용자 merge가 끝나기 전 M0 전체 Gate는 미통과다.
