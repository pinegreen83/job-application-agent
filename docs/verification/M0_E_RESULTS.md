# M0-E 기밀 검사 검증 기록

관련: [Issue #17](https://github.com/pinegreen83/job-application-agent/issues/17), AC-M0-05, [검사 범위·명령·한계](../SECURITY_CHECKS.md). 2026-11-19 기록.

## Windows

- Node 24.22.3/npm 11.10.1, Windows NT10.0.26200 x64, 기존 Windows `tar.exe` 사용.
- Gitleaks 8.30.1 Windows x64 archive의 공식 SHA256·일반 파일 추출·실행 버전 확인 통과. 도구는 ignored private 경로에만 준비했다.
- `node --check scripts/check-privacy.mjs`, `npm run check:privacy -- --self-test` 통과.
- 미발급 고정 합성 GitHub 형식 토큰을 runtime에 만들어 실제 탐지 실패 exit를 확인했다. clean fixture는 통과했다. staged 비밀이 남고 작업 파일은 깨끗한 경우도 index에서 검출했다.
- report에 합성 토큰 원문이 없음을 확인했다. scanner 출력/문맥/검출값은 CI나 대화로 전달하지 않았다.
- 변조 archive bytes 거부, 현재 private 파일 경로 및 commit 후 삭제된 과거 DB 경로 거부를 확인했다. 임시 저장소의 합성 DB 경로 fixture는 실제 DB가 아니며 정리했다.
- 전체 reachable Git 이력, index, tracked 작업 snapshot에서 각각 credential 검출 0건. 공개 파일 경계 통과. 검사한 entry 수와 최종 head/run은 PR을 따른다.
- 기본 detector rules만 사용했다. 발견을 숨기는 allowlist/디렉터리 예외를 추가하지 않았다.

새 npm/Rust runtime 의존성·앱 기능·권한 변경은 없다. `package.json`에는 검사 명령만 추가했고 lockfile은 바꾸지 않았다. CI는 전체 이력 checkout 및 각 OS의 검사 self-test를 기존 Rust/TS/브라우저/native build 앞에 추가했다. 기존 source 실제 실행 검증은 [M0-D 기록](M0_D_RESULTS.md)을 따른다.

## macOS와 남은 Gate

macOS scanner·기존 전체 CI는 연결 PR에서 최종 결과를 확인한다. Mac 실제 앱의 WKWebView 통합 검증은 사용자의 지시대로 일괄 진행할 미검증 항목이다. 기밀 스캐너 성공을 모든 개인정보 부재나 설치본 검증 완료로 주장하지 않는다. M0-F Gate와 사용자 PR 리뷰·main 병합이 남아 있다.
