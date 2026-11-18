# 다른 기기에서 개발 이어가기

관련: [Issue #5](https://github.com/pinegreen83/job-application-agent/issues/5), NFR-004/011, FR-006-01 / AC-006-01 / AC-M0-01, DEV-002~005/008.

GitHub의 코드·명세·작업 문서로 개발을 이어간다. 실제 메일/이력서/PDF/앱 DB/API 키는 GitHub로 동기화하지 않는다. 이 설정은 다른 PC를 원격으로 설치하거나 사용자 자료를 이전하는 기능이 아니다.

## 현재 코드 받기

현재 M0-A 구현은 [PR #4](https://github.com/pinegreen83/job-application-agent/pull/4)의 `feat/3-m0-a-foundation`에 있고, 다른 기기 설정은 그 위의 `feat/5-cross-device-setup`에 있다. 두 PR이 main에 통합되기 전에는 **아래 브랜치**를 checkout해야 실행 코드와 이 설정을 모두 받는다.

Windows PowerShell과 macOS 터미널에서 같은 명령을 사용한다. 원하는 작업 폴더에서 시작한다.

```sh
git clone --branch feat/5-cross-device-setup https://github.com/pinegreen83/job-application-agent.git
cd job-application-agent
git status --short --branch
```

PR들이 main에 merge된 후 새 checkout은 `git clone https://github.com/pinegreen83/job-application-agent.git`으로 받는다. 이미 main을 clone했다면 로컬 수정이 없는 상태에서 `git fetch origin` 후 `git switch --track origin/feat/5-cross-device-setup`을 사용한다. 브랜치가 이미 로컬에 있으면 `git switch feat/5-cross-device-setup` 후 `git pull --ff-only`한다. 미커밋 변경을 reset하거나 덮어쓰지 않는다.

## 도구 준비와 공통 실행

1. Git과 Node.js/npm을 설치한다. 저장소의 `.node-version`/`.nvmrc`는 공통 권장 버전 **24.22.3**을 기록한다. fnm 또는 macOS/Linux nvm을 이미 사용하면 프로젝트 폴더에서 `fnm use` 또는 `nvm install` → `nvm use`로 선택한다. Windows nvm-windows는 `.nvmrc` 자동 적용을 가정하지 말고 `nvm install 24.22.3` → `nvm use 24.22.3`을 사용한다. 버전 관리 도구 자체는 이 저장소가 자동 설치하지 않는다.
2. `node --version`, `npm --version`, `git --version`을 확인한다. 최소 실행 범위는 Node 22.12 이상/npm 10 이상이다. 공통 권장 버전과 다르면 doctor가 안내한다.
3. 아래 명령으로 환경 진단·lockfile 설치·타입/설정 검사·frontend build를 실행한다.

```sh
npm run doctor
npm run setup
npm run dev
```

`http://127.0.0.1:1420`에서 합성 화면을 확인한다. 종료는 Ctrl+C다. API 키나 `.env`는 필요하지 않다. setup은 소스/브랜치를 변경하지 않으며 생성된 `node_modules`를 `npm ci`로 재설치한다. npm registry 접근이 필요하고 설치 오류 시 즉시 멈춘다.

테스트까지 준비하려면:

```sh
npm run setup -- --tests
```

같은 설치·build 후 **lockfile에 고정된 Playwright의 Chromium**을 사용자 브라우저 캐시에 다운로드하고 desktop/narrow 테스트를 실행한다. 이 다운로드에는 네트워크와 캐시 쓰기 권한이 필요하다. 별도 Edge 설치는 필요하지 않다. 이후에는 `npm test`로 다시 실행한다. 기존 Edge 설치를 이용하려면 `npm run test:edge`를 사용한다. 공통 setup은 전역 Node/Rust/OS SDK, 사용자 계정이나 보안 정책을 설치·변경하지 않는다.

## 실제 Tauri 창 개발

브라우저 확인과 별도로 [DEVELOPMENT.md](DEVELOPMENT.md)의 OS별 도구를 준비한다.

- Windows: Rust stable MSVC, Visual C++ Build Tools/Windows SDK, WebView2.
- macOS: Rust stable, Xcode Command Line Tools, OS 제공 WKWebView.

```sh
npm run doctor -- --native
npm run tauri dev
```

`--native`는 Rust/Cargo 명령 및 host OS를 추가 필수 검사한다. 성공해도 SDK/WebView/OS 정책이나 앱 실행 성공을 보증하지 않는다. M0-A는 Cargo.lock과 양쪽 OS CI, Windows native 창 및 Mac 사용자 확인을 마쳤다. 각 기기의 도구/권한 상태는 별도이므로 [실행 결과](verification/M0_A_RESULTS.md)를 참고해 해당 기기에서도 확인한다. 보안 정책을 우회하지 말고 허용되는 개발 환경에서 검증한다. 최초 지원 CPU/최소 OS/서명은 별도 결정한다.

## 기기를 바꿀 때의 작업 순서

먼저 사용하던 기기에서 작업한 파일을 확인하고, 공개 가능한 소스·문서만 명시적으로 선택해 commit/push한다.

```sh
git status --short --branch
git diff
git add <검토한-소스나-문서-경로>
git commit -m "작업 내용"
git push
```

위 경로 자리표시는 실제 경로로 바꾼다. `git add .`로 로컬 개인 자료까지 무심코 올리지 않는다. push하지 않은 commit/미커밋 변경은 다른 기기에 전달되지 않는다. unfinished 코드는 해당 Issue 브랜치에 기록하고 main 직접 수정·자동 merge를 하지 않는다.

다른 기기에서는 로컬 작업을 먼저 확인하고 같은 브랜치에서 최신 commit을 받는다.

```sh
git status --short --branch
git fetch origin
git switch feat/5-cross-device-setup
git pull --ff-only
npm run setup
```

로컬 수정이나 양쪽 기기에서 갈라진 commit 때문에 실패하면 멈추고 차이를 검토한다. force push/reset으로 덮어쓰지 않는다. 같은 브랜치를 두 기기에서 동시에 수정하기보다, 기기 전환 전에 push하고 다른 기기에서 pull한다.

GitHub Public clone은 로그인 없이 가능하지만 push/Issue/PR 작업은 **각 기기에서 본인 계정으로 로그인**해야 한다. GitHub CLI를 사용하면 `gh auth login` → `gh auth status`로 확인한다. 토큰·Git credential/SSH 개인키·Codex 로컬 설정을 저장소에 복사하지 않는다. commit 작성자는 각 기기의 Git 설정에서 직접 확인하고, 필요하면 본인의 GitHub noreply 주소를 사용한다. 이 설정은 global Git identity를 변경하지 않는다.

## 다음 작업자가 읽을 문서

[WORK_STATUS.md](WORK_STATUS.md) → [AGENTS.md](../AGENTS.md) → [M0 계획](../plans/M0_PLAN.md)과 관련 Spec/Issue를 읽는다. 저장소에 있는 작업 문서가 이관 기준이다. 현재 기기의 Codex 대화/로컬 설정 파일을 저장소에 업로드하지 않는다. 다른 기기에서 작업을 시작할 때 다음과 같이 지시할 수 있다.

> 이 저장소의 AGENTS.md, docs/WORK_STATUS.md, docs/NEW_MACHINE.md와 연결된 Issue/PR을 읽고 현재 브랜치·변경 상태를 먼저 확인해 주세요. 승인된 범위에서 남은 검증부터 이어가고, 사용자 자료·키는 업로드하지 않으며 main 직접 수정이나 자동 merge를 하지 마세요.

## 검증 범위

Windows의 공백 경로에 격리된 fresh checkout과 공통 Node로 setup/build 및 Chromium·Edge 각 2건을 검증했다. [검증 결과](verification/CROSS_DEVICE_RESULTS.md)를 참조한다. 공통 setup 자체의 Mac 검증은 별도이며 M0-A Mac native 실행은 사용자 확인을 기록했다. 개발 의존성 high 영향 패키지 5건과 M0 전체 Gate 미통과는 [M0-A 결과](verification/M0_A_RESULTS.md)의 제한을 유지한다.
