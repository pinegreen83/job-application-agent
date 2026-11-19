# M0-A 개발 의존성 검토 — 2026-11-18

관련: [Issue #3](https://github.com/pinegreen83/job-application-agent/issues/3), [PR #4](https://github.com/pinegreen83/job-application-agent/pull/4), NFR-011 및 AC-006-01 / AC-M0-01의 개발 환경 검증.

## 2026-11-19 재확인 — advisory 철회

GitHub 공식 advisory API의 `withdrawn_at`은 `2026-11-18T15:38:56Z`이며 제목도 `Withdrawn Advisory`로 바뀌었다. [공식 advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)를 참조한다. 이는 한국 시간 2026-11-19 00:38:56이다.

같은 package-lock.json과 picomatch 4.0.7에서 fresh clone의 npm ci 및 저장소의 `npm audit --json`을 재확인했고 알려진 취약점은 0건이다. 패키지 버전·lockfile을 바꾸거나 예외/suppression을 추가하지 않았다. 따라서 아래 5건은 당시 검출 이력이며 현재 미해결 항목으로 취급하지 않는다. [Issue #7](https://github.com/pinegreen83/job-application-agent/issues/7)에 철회 근거와 재검사 결과를 기록한다. audit 0건은 모든 보안 문제 부재를 보증하지 않는다.

## 최초 확인 결과 (2026-11-18)

현재 lockfile에서 `npm audit --json`은 high 5개 **영향 패키지**를 보고한다. 근본 advisory는 picomatch의 ReDoS [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)이며 Vite / tinyglobby / fdir / plugin-react 의존 경로에 전파된다. 서로 다른 고위험 결함 5개라는 의미는 아니다. `npm audit --omit=dev --json`에서는 앱 runtime 의존성의 알려진 취약점이 0개다.

registry에서 다시 확인한 최신 picomatch는 4.0.7이며 advisory 영향 범위(`<=4.0.7`)에 포함된다. 현재 의존성에 적용할 수 있는 수정판을 확인하지 못했다.

## 자동 수정 권장안 검증

실제 소스/lockfile을 바꾸기 전에 Git 제외 임시 디렉터리에서 Vite 6.2.7 + plugin-react 5.2.0을 설치하고 audit했다. 이 조합은 picomatch 경로를 없애지만 Vite 자체의 파일 접근·명령 실행 관련 advisory가 추가로 검출돼 high 1개 영향 패키지가 남는다. 따라서 audit의 과거 major 변경 제안을 그대로 적용하지 않았다.

그 결과가 제안한 Vite 6.4.6의 의존성도 확인했다. 해당 버전은 picomatch `^4.0.2`, fdir, tinyglobby를 다시 포함한다. 단순 버전 변경만으로 현재 검출 경로와 구버전 Vite 위험을 함께 해결한다는 근거가 없어 프로젝트에는 적용하지 않았다.

## 당시 노출 범위와 검토 결정

현재 앱은 고정 합성 화면이며 사용자 파일 경로/글로브를 입력받거나 평가하지 않는다. 해당 패키지는 개발·빌드 도구에서 사용된다. 개발 서버는 loopback에만 바인딩하고 외부 입력·공개 네트워크 서비스로 사용하지 않는다. 이는 노출 범위 설명이며 취약점 수정이나 위험 부재를 뜻하지 않는다.

기밀 스캐너 예외·audit suppression·취약 패키지의 임의 vendor 패치를 추가하지 않았다. **취약점 해소는 미완료**이고, 적용 가능한 수정판 확인과 갱신·재검증이 필요하다. 그 전에 merge할지는 이 자료를 근거로 사용자가 판단해야 한다. 검토 완료와 취약점 수정 완료를 구분해 PR에 기록한다.
