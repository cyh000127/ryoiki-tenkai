# v3 release readiness

이 문서는 v3 handoff 안정화 범위의 release 판단을 기록합니다. v3는 검증 자동화, safe health summary, smoke/readiness 근거 정리를 완료 범위로 삼습니다.

## 판정

- 판정일: `2026-04-28`
- 기준 브랜치: `main`
- v3 checkpoint 판정: handoff 가능
- full feature release 판정: 준비 미완료
- 이유:
  - v3 범위의 handoff 검증 자동화와 runtime health summary는 구현과 테스트가 완료되었습니다.
  - v3 smoke checklist와 readiness 문서가 blocked carryover를 분리합니다.
  - recognizer runtime binding은 이후 v2-12에서 완료되었습니다.
  - skill/resource domain source는 아직 승인되지 않았으므로 full feature release blocker로 남습니다.

## 완료된 v3 checkpoint

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| v3 planning baseline | PASS | `docs/implementation-artifacts/v3-planning-baseline.ko.md` |
| Handoff verification script | PASS | `docs/implementation-artifacts/v3-1-handoff-check.ko.md` |
| Health runtime summary | PASS | `docs/implementation-artifacts/v3-2-health-runtime-summary.ko.md` |
| v3 smoke checklist | PASS | `docs/implementation-artifacts/v3-smoke-checklist.ko.md` |
| v3 release readiness | PASS | 이 문서 |
| Blocker carryover guard | PASS | 이 문서의 blocked carryover 섹션 |

## v3 story 상태 요약

| Epic | 현재 상태 | 비고 |
| --- | --- | --- |
| V3-E1 Handoff Verification Automation | done | unified handoff script와 사용 경로가 준비됨 |
| V3-E2 Runtime Health and Diagnostics | done | safe health summary와 contract/test가 준비됨 |
| V3-E3 Release Evidence and Handoff | done | smoke checklist, readiness, README link가 준비됨 |
| V3-E4 Blocker Carryover Guard | done | v2 blocked 항목을 v3 완료 범위와 분리함 |

## full feature release blockers

- `V2-E4-ST01`부터 `V2-E4-ST04`: approved skill domain source 이후의 skill/resource intake.

## 검증

| 검증 항목 | 상태 | 비고 |
| --- | --- | --- |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -PlanOnly` | PASS | command plan 출력 |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode fast` | PASS | FE 44 tests, BE 40 tests 포함 |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode full` | PASS | fast + camera smoke 2 tests + production build |
| Health contract test | PASS | `BE/api/tests/unit/test_health_api.py`, `BE/api/tests/unit/test_contract_files.py` |
| Provider-neutral scan | PASS | `scripts\v3-handoff-check.ps1`에 포함 |

## 다음 작업 기준

V3 범위는 완료되었습니다. 다음 작업은 아래 승인 조건이 충족된 뒤 별도 버전 또는 follow-up으로 진행합니다.

1. approved skill domain source 확정.
2. approved source를 fixture, contract, frontend rendering에 반영.
