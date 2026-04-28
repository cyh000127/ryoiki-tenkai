# v3 Release Readiness

This document records the release decision for the v3 handoff stabilization scope. v3 completion means verification automation, safe health summary, and smoke/readiness evidence are complete.

## Decision

- Decision date: `2026-04-28`
- Baseline branch: `main`
- v3 checkpoint decision: ready for handoff
- Full feature release decision: not ready
- Rationale:
  - v3 handoff verification automation and runtime health summary are implemented and tested.
  - v3 smoke checklist and readiness documents separate blocked carryover.
  - Concrete recognizer runtime selection and skill/resource domain source are still not approved, so they remain full feature release blockers.

## Completed v3 Checkpoints

| Item | Status | Evidence |
| --- | --- | --- |
| v3 planning baseline | PASS | `docs/implementation-artifacts/v3-planning-baseline.en.md` |
| Handoff verification script | PASS | `docs/implementation-artifacts/v3-1-handoff-check.en.md` |
| Health runtime summary | PASS | `docs/implementation-artifacts/v3-2-health-runtime-summary.en.md` |
| v3 smoke checklist | PASS | `docs/implementation-artifacts/v3-smoke-checklist.en.md` |
| v3 release readiness | PASS | this document |
| Blocker carryover guard | PASS | blocked carryover section in this document |

## v3 Story Status Summary

| Epic | Current Status | Notes |
| --- | --- | --- |
| V3-E1 Handoff Verification Automation | done | unified handoff script and usage path are ready |
| V3-E2 Runtime Health and Diagnostics | done | safe health summary and contract/tests are ready |
| V3-E3 Release Evidence and Handoff | done | smoke checklist, readiness, and README links are ready |
| V3-E4 Blocker Carryover Guard | done | v2 blocked items are separated from v3 completion scope |

## Full Feature Release Blockers

- `V2-E1-ST02`: concrete frame recognizer runtime selection and adapter binding.
- `V2-E4-ST01` through `V2-E4-ST04`: skill/resource intake after an approved skill domain source exists.

## Verification

| Check | Status | Notes |
| --- | --- | --- |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -PlanOnly` | PASS | command plan output |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode fast` | PASS | includes FE 44 tests and BE 40 tests |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode full` | PASS | fast + camera smoke 2 tests + production build |
| Health contract test | PASS | `BE/api/tests/unit/test_health_api.py`, `BE/api/tests/unit/test_contract_files.py` |
| Provider-neutral scan | PASS | included in `scripts\v3-handoff-check.ps1` |

## Next Work Criteria

The v3 scope is complete. Continue in a separate version or follow-up only after these approval conditions are met.

1. Concrete recognizer runtime selection approval.
2. Approved skill domain source.
