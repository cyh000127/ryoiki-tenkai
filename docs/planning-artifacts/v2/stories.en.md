# v2 Stories

This document breaks the v2 epics into implementable stories.

Status values:

- `done`: implemented on the current branch.
- `planned`: implementable but not started.
- `blocked`: must not start until a prerequisite source or decision exists.
- `deferred`: can move outside the v2 release.

## V2-E1: Live Recognition Runtime Hardening

### V2-E1-ST01: Connect the live recognizer adapter boundary

- Status: done
- User story: the player can see live camera input enter the normalized gesture input boundary.
- Scope: camera start/stop/status, observation-only feedback, recognized token dispatch, separation from debug fallback.
- Acceptance criteria: ready/blocked/unsupported/error states appear in the UI. Recognized tokens only flow through the existing sequence reducer.
- Dependencies: v1 gesture sequence state machine.
- Verification: frontend unit test, camera smoke fixture.

### V2-E1-ST02: Select and bind the concrete frame recognizer adapter

- Status: blocked
- User story: the system can connect the selected browser-compatible recognizer runtime behind the adapter.
- Scope: package/runtime selection, adapter implementation, confidence/stability normalization, resource cleanup.
- Acceptance criteria: the selection rationale is reflected in the technology-stack docs. The adapter does not send raw frames to the backend. A local unit or smoke test covers the recognizer lifecycle.
- Dependencies: runtime selection, browser support criteria.
- Verification: adapter unit test, smoke test.

### V2-E1-ST03: Separate no-hand, unstable-hand, and recognized-token UI states

- Status: planned
- User story: the player can distinguish missing hand, stabilizing hand, and recognized token states.
- Scope: visual state, status copy, progress interaction, failed/reset feedback.
- Acceptance criteria: the three states are not collapsed under the same label. Sequence progress and server rejection feedback remain separate.
- Dependencies: V2-E1-ST01.
- Verification: frontend component test.

### V2-E1-ST04: Harden recognizer restart, cleanup, and permission recovery

- Status: planned
- User story: the player can recover from camera permission or runtime errors without refreshing the app.
- Scope: stop/start idempotency, stream cleanup, blocked/error recovery UI, unmount cleanup.
- Acceptance criteria: repeated start/stop does not create duplicate streams. Permission denied does not enter action submission.
- Dependencies: V2-E1-ST02.
- Verification: frontend unit test, smoke test.

## V2-E2: Persistence and Runtime Operation Readiness

### V2-E2-ST01: Move persistence behind the storage adapter

- Status: done
- User story: the backend repository can preserve profile/history/rating/audit state without owning storage media details.
- Scope: storage protocol, JSON adapter, SQL adapter, null adapter, repository wiring.
- Acceptance criteria: profile/history/audit survive reload. The null adapter provides ephemeral behavior for tests.
- Dependencies: v1 result/history/rating model.
- Verification: backend unit tests.

### V2-E2-ST02: Document SQL migration apply/rollback smoke steps

- Status: planned
- User story: a developer can verify migration steps when using the SQL storage adapter.
- Scope: migration command, local database setup note, rollback or reset guidance.
- Acceptance criteria: commands are documented and recovery steps are visible when failures happen.
- Dependencies: V2-E2-ST01.
- Verification: manual smoke or script check.

### V2-E2-ST03: Define storage adapter failure modes and fallback policy

- Status: planned
- User story: the system owner understands allowed behavior when storage load/save fails.
- Scope: startup failure, save failure, partial write, read recovery, local fallback policy.
- Acceptance criteria: silent data loss is not allowed. Local development fallback and production behavior are separated.
- Dependencies: V2-E2-ST01.
- Verification: docs review, backend failure test when behavior is implemented.

### V2-E2-ST04: Document compact audit retention boundaries

- Status: planned
- User story: the system is clear about which battle audit metadata is retained and for how long.
- Scope: retained fields, excluded recognition data, retention horizon, export/debug note.
- Acceptance criteria: raw frames, raw landmarks, and tracking streams are explicitly excluded.
- Dependencies: V2-E2-ST01.
- Verification: docs review.

## V2-E3: Real Match Flow and Session Robustness

### V2-E3-ST01: Harden two-player queue pairing rules

- Status: planned
- User story: two players can be matched into the same battle session without the practice rival path.
- Scope: queue pairing, seat assignment, duplicate queue guard, loadout guard.
- Acceptance criteria: both players receive the same battle id and opposite seats. Practice-rival and real-pairing paths are separated in tests.
- Dependencies: v1 matchmaking queue, socket handoff.
- Verification: backend API/socket test.

### V2-E3-ST02: Harden socket reconnect and latest snapshot resync

- Status: planned
- User story: the player does not lose latest battle state after socket reconnect.
- Scope: reconnect replay, ended battle result recovery, stale event suppression.
- Acceptance criteria: reconnect restores latest turn/hp/mana/cooldown. Ended battle restores into the result screen.
- Dependencies: V2-E3-ST01.
- Verification: frontend reducer/component test, backend socket test.

### V2-E3-ST03: Expand delayed/duplicate event reconciliation regression tests

- Status: planned
- User story: delayed socket events do not roll the UI back into older state.
- Scope: stale turn check, duplicate action event handling, ended event idempotency.
- Acceptance criteria: stale snapshots are ignored. Repeated ended events do not duplicate rating/history UI changes.
- Dependencies: v1 event reducer.
- Verification: frontend unit test.

### V2-E3-ST04: Stabilize timeout watcher and surrender event fanout

- Status: planned
- User story: battle timeout or surrender sends the same final state to all participants.
- Scope: timeout watcher lifecycle, event ordering, disconnected player handling.
- Acceptance criteria: timeout/surrender/ended event order is stable. Disconnected players receive ended state on the next lookup.
- Dependencies: v1 timeout and surrender rules.
- Verification: backend socket test.

## V2-E4: Skill and Resource Domain Intake

### V2-E4-ST01: Define the skill domain source format

- Status: blocked
- User story: the domain owner can agree on the source format delivered to implementation.
- Scope: skill id, display name, effect, cost, cooldown, gesture sequence, resource keys, versioning.
- Acceptance criteria: skill implementation does not start before the source format is documented.
- Dependencies: product/domain decision.
- Verification: docs review.

### V2-E4-ST02: Migrate the approved skill catalog fixture

- Status: blocked
- User story: the approved skill source is reflected in the shared fixture and backend catalog.
- Scope: fixture update, backend catalog update, FE default catalog update, cross-stack test.
- Acceptance criteria: fixture, API, and frontend default content match.
- Dependencies: V2-E4-ST01.
- Verification: contract test, frontend fixture test.

### V2-E4-ST03: Extend the skill/resource metadata API contract

- Status: blocked
- User story: the frontend can receive approved resource metadata from the API.
- Scope: OpenAPI schema, skill resource fields, animset resource fields, backward compatibility policy.
- Acceptance criteria: contract diff is reviewed and frontend types are updated.
- Dependencies: V2-E4-ST01.
- Verification: backend contract test, frontend typecheck.

### V2-E4-ST04: Connect frontend loadout/resource rendering

- Status: blocked
- User story: the player can see approved skill/resource metadata in the loadout screen.
- Scope: skill/resource labels, visual asset loading, missing resource fallback, layout test.
- Acceptance criteria: unapproved names or images are not invented.
- Dependencies: V2-E4-ST02, V2-E4-ST03.
- Verification: frontend component test.

## V2-E5: QA, Release, and Handoff

### V2-E5-ST01: Write the v2 planning baseline

- Status: done
- User story: the team can share one view of v2 implementation order, prerequisites, and deferred reasons.
- Scope: epics, stories, implementation order, prerequisites, and technology stack docs in Korean and English.
- Acceptance criteria: README and readiness docs link to the v2 planning docs.
- Dependencies: v1 release readiness.
- Verification: docs review, text scan.

### V2-E5-ST02: Refresh the v2 smoke checklist

- Status: done
- User story: the team can verify v2 camera/runtime/storage/matching risks through a smoke checklist.
- Scope: runtime smoke, camera states, storage reload, two-player queue, reconnect, result/history.
- Acceptance criteria: implemented items and blocked items are separated.
- Dependencies: V2-E5-ST01.
- Verification: `docs/implementation-artifacts/v2-smoke-checklist.en.md`, docs review, text scan.

### V2-E5-ST03: Re-check release readiness

- Status: planned
- User story: the release owner can judge v2 readiness from completed and deferred scope.
- Scope: gate table, verification evidence, known gap, blocker list.
- Acceptance criteria: blocking items and follow-up items are separated.
- Dependencies: current v2 implementation set.
- Verification: check commands and docs review.

### V2-E5-ST04: Maintain provider-neutral text scan

- Status: planned
- User story: the team can check that no unapproved external provider or service names entered the repository before handoff.
- Scope: docs, source copy, comments, contracts.
- Acceptance criteria: targeted scan returns no matches outside lock/generated output.
- Dependencies: repository scan command.
- Verification: text scan.
