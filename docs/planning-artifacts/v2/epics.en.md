# v2 Epics

This document groups the post-v1 work into v2 epics. Skill names, skill effects, hand-motion resources, and visual assets must not be implemented until a separate domain source is approved.

## Epic V2-E1: Live Recognition Runtime Hardening

### Goal

Bind the browser input adapter to a concrete frame-based recognizer and move recognition state into battle input safely.

### Product Outcome

- Camera start, stop, permission-blocked, unsupported, and error states are visible.
- No-hand, unstable-hand, and recognized-gesture states remain separate from battle submission state.
- Local recognition success is not shown as a skill effect until the server confirms it.

### Engineering Boundary

- Frontend owns the camera/runtime adapter, token normalization, sequence state machine, and smoke fixture.
- Backend receives only normalized gesture sequences and action metadata.
- Raw frames, raw landmarks, and tracking streams are not sent to the backend.

### Stories

- V2-E1-ST01: Connect the live recognizer adapter boundary.
- V2-E1-ST02: Select and bind the concrete frame recognizer adapter.
- V2-E1-ST03: Separate no-hand, unstable-hand, and recognized-token UI states.
- V2-E1-ST04: Harden recognizer restart, cleanup, and permission recovery.

### Acceptance Signals

- Camera permission allowed/denied smoke scenarios are automated.
- The recognizer cleans up stream resources on stop or component unmount.
- Recognized token dispatch does not bypass server-authoritative submission rules.

## Epic V2-E2: Persistence and Runtime Operation Readiness

### Goal

Keep v1 runtime persistence behind the adapter boundary and document the storage, migration, and recovery steps needed for an operational environment.

### Product Outcome

- Results, history, ratings, and compact action audit persist behind a storage adapter.
- JSON development storage and SQL-compatible storage share the same repository contract.
- Reset, reload, and migration failure paths have verifiable procedures.

### Engineering Boundary

- The backend repository owns runtime state and battle rules without knowing storage media details.
- The storage adapter owns persistence snapshot load/save and SQL transaction boundaries.
- Docs own migration, local recovery, and rollback notes.

### Stories

- V2-E2-ST01: Move persistence behind the storage adapter.
- V2-E2-ST02: Document SQL migration apply/rollback smoke steps.
- V2-E2-ST03: Define storage adapter failure modes and fallback policy.
- V2-E2-ST04: Document compact audit retention boundaries.

### Acceptance Signals

- Profile, history, and audit snapshots survive repository reload.
- Storage adapter tests cover JSON, SQL, and null adapters.
- Raw recognition data is not stored in history or audit records.

## Epic V2-E3: Real Match Flow and Session Robustness

### Goal

Raise the v1 practice-rival loop closer to real player matching operations.

### Product Outcome

- Two queued players are reliably joined into one battle session.
- Reconnect, duplicate event, delayed event, and ended battle replay behavior is consistent.
- Timeout and surrender leave a final state regardless of socket connection state.

### Engineering Boundary

- Backend owns queue matching, battle session ownership, socket fanout, and timeout resolution.
- Frontend owns socket reconnect UX, latest snapshot reconciliation, and result routing.
- Worker code only supports jobs that do not bypass API write ownership.

### Stories

- V2-E3-ST01: Harden two-player queue pairing rules.
- V2-E3-ST02: Harden socket reconnect and latest snapshot resync.
- V2-E3-ST03: Expand delayed/duplicate event reconciliation regression tests.
- V2-E3-ST04: Stabilize timeout watcher and surrender event fanout.

### Acceptance Signals

- Both players receive the same battle id, opposite seats, and the same turn state.
- Reconnect does not roll the UI back to stale snapshots.
- Battle end events do not duplicate rating or history writes.

## Epic V2-E4: Skill and Resource Domain Intake

### Goal

Do not invent skills. Prepare an intake path so an approved domain source can be moved into contracts and implementation later.

### Product Outcome

- The input format for skill name, effect, cost, cooldown, gesture sequence, and resource key is agreed.
- Placeholders are not mistaken for final skills before approval.
- After approval, the shared catalog fixture, API response, and frontend rendering use the same source.

### Engineering Boundary

- Product/domain owner provides the skill design source.
- Backend implements approved skill catalog validation and server-authoritative battle rules.
- Frontend renders the approved catalog and does not invent unapproved resources.

### Stories

- V2-E4-ST01: Define the skill domain source format.
- V2-E4-ST02: Migrate the approved skill catalog fixture.
- V2-E4-ST03: Extend the skill/resource metadata API contract.
- V2-E4-ST04: Connect frontend loadout/resource rendering.

### Acceptance Signals

- Skill changes are tracked through a separate source and contract diff.
- Gesture tokens and skill effects are validated independently.
- Unapproved skill names, effects, images, and hand-motion resources are not implemented.

## Epic V2-E5: QA, Release, and Handoff

### Goal

Package v2 changes into repeatable verification units and document remaining release risk before handoff.

### Product Outcome

- Browser camera smoke, backend rule tests, frontend state tests, and boundary checks are part of the release gate.
- Docs provide the same content in Korean and English.
- Documentation and product copy avoid external provider names and unapproved service names.

### Engineering Boundary

- Tests automatically verify implemented behavior.
- Docs own plans, prerequisites, implementation records, and known gaps.
- Release notes separate completed items from deferred items.

### Stories

- V2-E5-ST01: Write the v2 planning baseline.
- V2-E5-ST02: Refresh the v2 smoke checklist.
- V2-E5-ST03: Re-check release readiness.
- V2-E5-ST04: Maintain provider-neutral text scan.

### Acceptance Signals

- README links to v2 planning docs and implementation records.
- The reason for deferring skill implementation is explicit.
- Verification commands and scan results are recorded before handoff.
