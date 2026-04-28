# v3 스모크 체크리스트

이 문서는 v3 handoff 안정화 범위의 로컬 검증 checklist입니다. skill/resource 구현은 승인 전까지 blocked로 유지합니다. recognizer runtime binding은 이후 v2-12에서 완료되었습니다.

## 스냅샷

- 작성일: `2026-04-28`
- 기준 브랜치: `main`
- 기준 문서:
  - `docs/planning-artifacts/v3/epics.ko.md`
  - `docs/planning-artifacts/v3/stories.ko.md`
  - `docs/planning-artifacts/v3/implementation-order.ko.md`
  - `docs/planning-artifacts/v3/prerequisites.ko.md`
  - `docs/planning-artifacts/v3/technology-stack.ko.md`

## 기본 검증

- [x] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -PlanOnly`
  - 근거: `docs/implementation-artifacts/v3-1-handoff-check.ko.md`
- [x] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode fast`
  - 근거: `docs/implementation-artifacts/v3-1-handoff-check.ko.md`, `docs/implementation-artifacts/v3-2-health-runtime-summary.ko.md`
- [x] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode full`
  - 근거: `docs/implementation-artifacts/v3-release-readiness.ko.md`

## 실패 대응 순서

1. `-PlanOnly`로 실행 순서와 command를 먼저 확인합니다.
2. `-Mode fast`가 실패하면 출력된 failed command를 단독 실행해 frontend, backend, boundary, compose, text scan 중 어느 경계인지 분리합니다.
3. `-Mode full`만 실패하면 camera smoke 또는 production build 실패로 좁히고, runtime port smoke와 build output을 우선 확인합니다.
4. provider-neutral scan 실패는 lock/generated output을 제외한 새 문서/제품 문구에 외부 제공자 세부사항이 들어갔는지 확인합니다.

## Frontend

- [x] typecheck가 통과한다.
- [x] unit/component test가 통과한다.
- [x] camera smoke가 fake runtime port lifecycle을 검증한다.
- [x] production build가 통과한다.

## Backend

- [x] lint가 통과한다.
- [x] unit test가 통과한다.
- [x] `/healthz`가 safe runtime summary를 반환한다.
- [x] health response가 database URL, credential, raw recognition data를 노출하지 않는다.
- [x] OpenAPI health contract가 runtime summary를 포함한다.

## Runtime and Handoff

- [x] boundary check가 통과한다.
- [x] compose config가 유효하다.
- [x] provider-neutral targeted text scan이 통과한다.
- [x] v3 readiness가 blocked domain 범위를 분리한다.

## Blocked Carryover

- Blocked: skill/resource domain intake.
  - blocker: approved skill domain source 필요.
  - 관련 story: `V2-E4-ST01`부터 `V2-E4-ST04`.
