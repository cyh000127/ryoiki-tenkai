# v2 Release Readiness Review

This document records the current v2 readiness decision. The current branch is ready for v2 documentation/QA checkpoint handoff, but it is not ready for a full v2 feature release.

## Decision

- Decision date: `2026-04-28`
- Baseline branch: `main`
- v2 checkpoint decision: documentation/QA checkpoint is handoff-ready
- Full v2 feature release decision: not ready
- Decision basis:
  - Completed v2 hardening items are linked to implementation records and the smoke checklist.
  - Planned and blocked items are separated in v2 stories and the smoke checklist.
  - Skill implementation is explicitly blocked until a separate domain source is approved.

## Completed v2 Checkpoint

| Item | Status | Evidence |
| --- | --- | --- |
| Live recognizer adapter boundary | PASS | `docs/implementation-artifacts/v2-1-live-recognizer-adapter.en.md` |
| Camera permission smoke automation | PASS | `docs/implementation-artifacts/v2-2-camera-permission-smoke.en.md` |
| Recognition UI state separation | PASS | `docs/implementation-artifacts/v2-4-recognition-ui-state.en.md` |
| Recognizer lifecycle hardening | PASS | `docs/implementation-artifacts/v2-9-recognizer-lifecycle-hardening.en.md` |
| Recognizer runtime port boundary | PASS | `docs/implementation-artifacts/v2-10-recognizer-runtime-port.en.md` |
| Recognizer runtime port smoke | PASS | `docs/implementation-artifacts/v2-11-recognizer-runtime-port-smoke.en.md` |
| Two-player queue pairing | PASS | `docs/implementation-artifacts/v2-5-two-player-queue-pairing.en.md` |
| Socket reconnect latest snapshot resync | PASS | `docs/implementation-artifacts/v2-6-socket-reconnect-resync.en.md` |
| Delayed/duplicate event reconciliation | PASS | `docs/implementation-artifacts/v2-7-delayed-duplicate-event-reconciliation.en.md` |
| Timeout/surrender fanout hardening | PASS | `docs/implementation-artifacts/v2-8-timeout-surrender-fanout.en.md` |
| Storage adapter persistence | PASS | `docs/implementation-artifacts/v2-3-storage-adapter-persistence.en.md` |
| SQL migration smoke procedure | PASS | `docs/implementation-artifacts/v2-sql-migration-smoke.en.md` |
| Storage failure/fallback policy | PASS | `docs/implementation-artifacts/v2-storage-failure-policy.en.md` |
| Compact audit retention boundary | PASS | `docs/implementation-artifacts/v2-audit-retention-boundary.en.md` |
| v2 planning baseline | PASS | `docs/implementation-artifacts/v2-planning-baseline.en.md` |
| v2 smoke checklist | PASS | `docs/implementation-artifacts/v2-smoke-checklist.en.md` |
| v2 release readiness review | PASS | this document |
| Provider-neutral scan record | PASS | verification section in this document |

## v3 Follow-Up Checkpoint

The blocked v2 items were not implemented without approval and were carried into the v3 handoff stabilization scope.

| Item | Status | Evidence |
| --- | --- | --- |
| v3 planning baseline | PASS | `docs/implementation-artifacts/v3-planning-baseline.en.md` |
| v3 handoff verification automation | PASS | `docs/implementation-artifacts/v3-1-handoff-check.en.md` |
| v3 runtime health summary | PASS | `docs/implementation-artifacts/v3-2-health-runtime-summary.en.md` |
| v3 smoke checklist | PASS | `docs/implementation-artifacts/v3-smoke-checklist.en.md` |
| v3 release readiness | PASS | `docs/implementation-artifacts/v3-release-readiness.en.md` |

## v2 Story Status Summary

| Epic | Current Status | Notes |
| --- | --- | --- |
| V2-E1 Live Recognition Runtime Hardening | partial | Adapter boundary, camera smoke, no-hand/unstable/recognized UI separation, restart/cleanup hardening, runtime port boundary, and fake runtime port smoke are complete; concrete runtime selection remains. |
| V2-E2 Persistence and Runtime Operation Readiness | done | Storage adapter transition, migration smoke, failure policy, and audit retention boundary are complete. |
| V2-E3 Real Match Flow and Session Robustness | done | Two-player queue pairing, reconnect latest snapshot recovery, delayed/duplicate reconciliation, and timeout/surrender fanout hardening are complete. |
| V2-E4 Skill and Resource Domain Intake | blocked | An approved skill domain source is required. |
| V2-E5 QA, Release, and Handoff | done | Planning baseline, smoke checklist, readiness review, and scan record are complete. |

## Full v2 Release Blockers

The full v2 feature release should not be considered ready until the following items are complete.

- `V2-E1-ST02`: concrete frame recognizer runtime selection and adapter binding.
- `V2-E4-ST01` through `V2-E4-ST04`: skill/resource intake after an approved skill domain source exists.

## Deferral Rule

Skill names, skill effects, gesture sequence changes, hand-motion resources, visual assets, and resource keys are not implemented without a separate domain source. For this v2 release decision, that area is awaiting approval rather than treated as an implementation blocker that can be solved by engineering alone.

## Verification

This readiness review reflects recognizer runtime port smoke and documentation updates.

| Check | Status | Notes |
| --- | --- | --- |
| `pnpm --dir FE/app typecheck` | PASS | frontend type check |
| `pnpm --dir FE/app test` | PASS | 44 tests |
| `pnpm --dir FE/app smoke:camera` | PASS | 2 tests |
| `pnpm --dir FE/app build` | PASS | production build |
| `uv run ruff check BE` | PASS | backend lint |
| `uv run pytest BE` | PASS | 38 tests |
| `uv run pytest BE/api/tests/unit/test_battle_websocket_events.py` | PASS | 12 tests |
| `pnpm --dir FE/app exec vitest run tests/unit/liveGestureRecognizer.test.ts` | PASS | 6 tests |
| `git diff --check` | PASS | whitespace/error check |
| Provider-neutral targeted text scan | PASS | no matches outside ignored files |
| README link review | PASS | Korean and English links include the v2 readiness document |
| Story status review | PASS | `V2-E1-ST02` remains blocked; only runtime port preparation and fake smoke are recorded |

## Next Implementation Order

Because the skill domain source and concrete runtime selection are not available yet, the next implementation units require approval first.

1. `V2-E1-ST02`: select and bind the concrete frame recognizer runtime after the runtime choice is approved.
2. `V2-E4-ST01`: define the skill domain source format after an approved source exists.
