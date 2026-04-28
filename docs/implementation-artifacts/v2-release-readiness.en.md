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
| Storage adapter persistence | PASS | `docs/implementation-artifacts/v2-3-storage-adapter-persistence.en.md` |
| SQL migration smoke procedure | PASS | `docs/implementation-artifacts/v2-sql-migration-smoke.en.md` |
| Storage failure/fallback policy | PASS | `docs/implementation-artifacts/v2-storage-failure-policy.en.md` |
| v2 planning baseline | PASS | `docs/implementation-artifacts/v2-planning-baseline.en.md` |
| v2 smoke checklist | PASS | `docs/implementation-artifacts/v2-smoke-checklist.en.md` |
| v2 release readiness review | PASS | this document |
| Provider-neutral scan record | PASS | verification section in this document |

## v2 Story Status Summary

| Epic | Current Status | Notes |
| --- | --- | --- |
| V2-E1 Live Recognition Runtime Hardening | partial | Adapter boundary and camera smoke are complete; concrete runtime selection and UX hardening remain. |
| V2-E2 Persistence and Runtime Operation Readiness | partial | Storage adapter transition, migration smoke, and failure policy are complete; audit retention docs remain. |
| V2-E3 Real Match Flow and Session Robustness | planned | Real two-player pairing, reconnect, event reconciliation, and fanout hardening remain. |
| V2-E4 Skill and Resource Domain Intake | blocked | An approved skill domain source is required. |
| V2-E5 QA, Release, and Handoff | done | Planning baseline, smoke checklist, readiness review, and scan record are complete. |

## Full v2 Release Blockers

The full v2 feature release should not be considered ready until the following items are complete.

- `V2-E1-ST02`: concrete frame recognizer runtime selection and adapter binding.
- `V2-E1-ST03`: visual separation for no-hand, unstable-hand, and recognized-token states.
- `V2-E1-ST04`: recognizer restart, cleanup, and permission recovery hardening.
- `V2-E2-ST04`: compact audit retention boundary.
- `V2-E3-ST01` through `V2-E3-ST04`: real two-player match flow and session robustness.
- `V2-E4-ST01` through `V2-E4-ST04`: skill/resource intake after an approved skill domain source exists.

## Deferral Rule

Skill names, skill effects, gesture sequence changes, hand-motion resources, visual assets, and resource keys are not implemented without a separate domain source. For this v2 release decision, that area is awaiting approval rather than treated as an implementation blocker that can be solved by engineering alone.

## Verification

This readiness review is a docs-only change.

| Check | Status | Notes |
| --- | --- | --- |
| `git diff --check` | PASS | whitespace/error check |
| Provider-neutral targeted text scan | PASS | no matches outside ignored files |
| README link review | PASS | Korean and English links include the v2 readiness document |
| Story status review | PASS | `V2-E5-ST03` and `V2-E5-ST04` are marked complete |

## Next Implementation Order

Because the skill domain source is not available yet, the next safe implementation unit is storage operation documentation.

1. `V2-E2-ST04`: document compact audit retention boundaries.
2. `V2-E1-ST03`: separate no-hand, unstable-hand, and recognized-token states.
3. `V2-E1-ST04`: harden recognizer restart, cleanup, and permission recovery.
