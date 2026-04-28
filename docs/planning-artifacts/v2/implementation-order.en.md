# v2 Implementation Order

This document defines the recommended v2 implementation order. Skill implementation must not start until a separate domain source is approved.

## Phase 0: Scope Guard

### Purpose

Separate completed v2 hardening from future work and prevent invented skill implementation.

### Tasks

1. Review v1 readiness and v2 implementation records.
2. Do not implement skill names, skill effects, hand-motion resources, or visual assets without a domain source.
3. Record new runtime or storage choices in the technology-stack docs first.
4. Avoid unapproved external provider and service names in docs and product copy.

### Exit Criteria

- README links to the v2 planning baseline.
- Skill implementation deferral conditions are recorded in stories and prerequisites.
- The change scope is clearly owned by docs, FE, BE, or storage.

## Phase 1: Planning Baseline

### Purpose

Lock v2 epics, stories, implementation order, prerequisites, and technology stack in Korean and English docs.

### Tasks

1. Write `epics.ko.md` and `epics.en.md`.
2. Record status and blockers in `stories.ko.md` and `stories.en.md`.
3. Write `implementation-order.ko.md` and `implementation-order.en.md`.
4. Write `prerequisites.ko.md` and `prerequisites.en.md`.
5. Record v2 selected/deferred choices in `technology-stack.ko.md` and `technology-stack.en.md`.

### Exit Criteria

- v2 planning docs are discoverable from README.
- Skill/resource implementation remains blocked.
- Documents describe the same scope and status.

## Phase 2: Recognition Runtime Binding

### Purpose

Bind the live recognizer adapter to a concrete frame recognizer runtime.

### Tasks

1. Select the runtime using browser support, bundle size, lifecycle, and testing strategy.
2. Make the adapter return token, confidence, stability, and reason in the normalized shape.
3. Implement stop/start/unmount cleanup.
4. Verify that raw frames and raw tracking data are not sent to the backend.

### Exit Criteria

- The selected runtime and rationale are in the technology-stack docs.
- Adapter lifecycle tests exist.
- Camera permission smoke continues to pass.

## Phase 3: Recognition UX Hardening

### Purpose

Make recognition state understandable without confusing it with battle submission.

### Tasks

1. Render no-hand, unstable-hand, and recognized-token states separately.
2. Review sequence reset/timeout/failure feedback.
3. Separate local success copy from server confirmation copy.
4. Check text overflow on compact and desktop layouts.

### Exit Criteria

- Camera state, hand state, and server decision state appear in separate UI areas.
- Recognized sequence is not shown as a skill effect before server confirmation.
- Frontend component tests cover the major states.

## Phase 4: Persistence and Runtime Operations

### Purpose

Strengthen the storage adapter with operational procedures.

### Tasks

1. Document SQL migration apply/rollback smoke steps.
2. Define storage load/save failure policy.
3. Document compact audit retention boundaries.
4. Keep result/history/rating reload tests.

### Exit Criteria

- Migration and recovery commands are documented.
- There is a policy that avoids silent data loss.
- Raw recognition data exclusion is explicit.

## Phase 5: Real Match Flow Hardening

### Purpose

Expand from the practice-rival centered loop into a real two-player match loop.

### Tasks

1. Implement two-player queue pairing.
2. Test seat assignment and battle session ownership.
3. Harden socket reconnect and stale event suppression.
4. Regression-test timeout/surrender fanout.

### Exit Criteria

- Two players share the same battle session.
- Latest snapshot survives reconnect.
- Battle end writes are not duplicated.

## Phase 6: Skill and Resource Implementation

### Purpose

Start skill/resource implementation only after the domain source is approved.

### Tasks

1. Approve the skill domain source format.
2. Update the approved catalog fixture.
3. Extend the API contract and frontend types.
4. Connect loadout/resource rendering.

### Exit Criteria

- The domain source is documented.
- Fixture, backend catalog, and frontend default content match.
- No unapproved skill names, effects, or resource keys were invented.

## Phase 7: v2 Release Readiness

### Purpose

Prepare the release decision by separating completed v2 scope from deferred scope.

### Tasks

1. Run backend, frontend, and boundary checks.
2. Run camera smoke and storage reload smoke.
3. Record the two-player match result or blocker.
4. Run provider-neutral text scan.
5. Write the v2 readiness document.

### Exit Criteria

- Release blockers and follow-ups are separated.
- README and implementation records are current.
- Verification results are captured in the handoff note.

## Recommended Commit Units

1. v2 planning baseline.
2. recognizer runtime binding.
3. recognition UX hardening.
4. persistence operation docs or checks.
5. real match flow hardening.
6. approved skill/resource migration after domain source.
7. v2 release readiness refresh.
