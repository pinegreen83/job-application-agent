# M0-A Mac 실기기 확인

관련: [Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3), [PR #4](https://github.com/pinegreen83/job-application-agent/pull/4), [Windows와 CI 결과](M0_A_RESULTS.md). FR-006-01 / AC-006-01 / AC-M0-01의 실제 기본 창 실행 증거를 보완한다. Mac CI build 통과와 실기기 실행은 구분한다.

## 준비

Git, Node.js/npm, Xcode Command Line Tools와 Rust를 준비한다. Node 24.22.3/Rust 1.100.0은 CI에서 검증한 조합이다. Xcode 도구가 없을 때 `xcode-select --install`로 설치하고 요청되는 사용자 동의는 직접 완료한다. Rust는 [공식 설치 안내](https://www.rust-lang.org/tools/install)를 따른다. API 키·메일·개인 자료는 필요하지 않다.

## 코드 받기

현재 PR이 main에 merge되기 전에는 M0-A 브랜치를 받는다.

```sh
git clone --branch feat/3-m0-a-foundation https://github.com/pinegreen83/job-application-agent.git
cd job-application-agent
```

이미 checkout했다면 미커밋 변경 여부부터 확인하고 같은 브랜치에서 최신 변경을 받는다. 로컬 변경을 reset/force로 덮어쓰지 않는다.

```sh
git status --short --branch
git fetch origin
git switch feat/3-m0-a-foundation
git pull --ff-only
```

## 실행과 확인

```sh
node --version
npm --version
rustc --version
cargo --version
git rev-parse HEAD
npm ci
npm run check
npm run tauri dev
```

마지막 명령은 Vite와 Cargo를 실행하고 Mac의 Tauri 기본 창을 연다. 첫 Rust 의존성 다운로드·빌드에는 네트워크와 시간이 필요하다. `http://127.0.0.1:1420` 브라우저 탭만 보는 것은 native 창 실행 확인으로 처리하지 않는다.

다음을 직접 확인한다.

- 창 제목 `Job Application Agent · M0-A`.
- `합성 공고 예시`, `가상 스튜디오 A`, `게임 클라이언트 개발자` 표시.
- 식별자 `synthetic-m0-a-001`, `합성 데이터`, `분석하지 않음` 표시.
- 후속 기능이 연결되지 않았다는 안내 표시, 렌더링 오류/빈 화면 없음.
- 창을 닫아 종료한 뒤 같은 `npm run tauri dev`로 다시 정상 실행. 이전 명령이 계속 남아 있다면 Ctrl+C로 종료하고 재실행한다.

## 전달할 결과

Mac 모델의 CPU 계열(Apple Silicon/Intel), macOS 버전, 위 도구 버전과 commit, 실행/종료/재실행 성공 여부를 기록한다. 오류가 있으면 오류 부분만 전달하고 개인 경로·키·원본 문서는 제외한다. 사용자 확인 또는 앱 창의 직접 관찰 근거 없이 완료로 표시하지 않는다.

실기기 결과와 개발 의존성 잔여 위험을 사용자와 검토한 뒤 PR #4의 준비 상태를 갱신한다. merge는 사용자가 직접 한다. M0-B~F의 IPC·저장·Mock·전체 Gate 검증은 별도다.
