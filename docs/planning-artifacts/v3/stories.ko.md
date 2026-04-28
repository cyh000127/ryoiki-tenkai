# v3 스토리

상태 값:

- `done`: 현재 브랜치에 구현됨.
- `planned`: 구현 가능하지만 아직 시작하지 않음.
- `blocked`: 선행 명세 또는 선택이 없어 구현하면 안 됨.
- `deferred`: v3 밖으로 미룰 수 있음.

## V3-E1: Handoff Verification Automation

### V3-E1-ST01: 통합 handoff 검증 스크립트 작성

- Status: done
- Scope: frontend typecheck/test/smoke/build, backend lint/test, boundary check, compose config, provider-neutral scan을 실행하는 PowerShell entrypoint.
- Acceptance criteria: fast/full mode를 제공하고 실패 command를 명확히 출력한다.
- Dependencies: 기존 npm, uv, compose, check-boundaries command.
- Verification: `docs/implementation-artifacts/v3-1-handoff-check.ko.md`, script fast mode, script plan mode.

### V3-E1-ST02: 검증 스크립트 사용법과 실패 대응 문서화

- Status: planned
- Scope: README, smoke checklist, readiness 문서에 command와 실패 시 확인 순서를 기록.
- Acceptance criteria: 개발자가 V3 검증을 한 명령으로 찾을 수 있다.
- Dependencies: V3-E1-ST01.
- Verification: docs review, text scan.

## V3-E2: Runtime Health and Diagnostics

### V3-E2-ST01: backend health response에 safe runtime summary 추가

- Status: done
- Scope: health response에 application status, storage mode summary, persistence policy, runtime blocker summary를 추가.
- Acceptance criteria: database URL, credential, raw recognition data는 응답에 포함하지 않는다.
- Dependencies: 기존 health route와 settings.
- Verification: `docs/implementation-artifacts/v3-2-health-runtime-summary.ko.md`, backend unit test.

### V3-E2-ST02: health response contract와 테스트 갱신

- Status: done
- Scope: schema, test, docs를 갱신해 health contract를 고정.
- Acceptance criteria: API response shape가 테스트로 고정된다.
- Dependencies: V3-E2-ST01.
- Verification: `docs/implementation-artifacts/v3-2-health-runtime-summary.ko.md`, backend test, contract review.

## V3-E3: Release Evidence and Handoff

### V3-E3-ST01: v3 smoke checklist 작성

- Status: planned
- Scope: v3 검증 command, runtime health, compose, provider-neutral scan, blocked 항목.
- Acceptance criteria: implemented/blocked 항목이 분리된다.
- Dependencies: V3-E1, V3-E2.
- Verification: docs review.

### V3-E3-ST02: v3 release readiness 작성

- Status: planned
- Scope: v3 checkpoint 판정, full feature blocker, verification evidence.
- Acceptance criteria: handoff 가능 여부와 full feature release blocker가 분리된다.
- Dependencies: V3-E3-ST01.
- Verification: v3 handoff check.

### V3-E3-ST03: README와 handoff 문서에 v3 링크 추가

- Status: planned
- Scope: README 한국어/영어, v1/v2 readiness 문서에 v3 결과 링크 추가.
- Acceptance criteria: 새 작업자가 v3 문서를 README에서 찾을 수 있다.
- Dependencies: V3-E3-ST01, V3-E3-ST02.
- Verification: README link review.

## V3-E4: Blocker Carryover Guard

### V3-E4-ST01: v2 blocker carryover를 v3 readiness에 명시

- Status: planned
- Scope: concrete runtime 선택과 skill/resource domain source 부재를 v3 blocker carryover로 기록.
- Acceptance criteria: blocked 항목이 구현 완료로 표시되지 않는다.
- Dependencies: v2 readiness.
- Verification: docs review.

### V3-E4-ST02: provider-neutral scan을 v3 release gate에 포함

- Status: planned
- Scope: scan command를 script와 readiness에 포함.
- Acceptance criteria: lock/generated output을 제외한 scan 결과가 PASS로 기록된다.
- Dependencies: V3-E1-ST01.
- Verification: provider-neutral targeted text scan.
