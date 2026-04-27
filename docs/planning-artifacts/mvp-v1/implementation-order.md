# MVP v1 Implementation Order

This document defines the recommended build order. The order favors stable contracts, server-authoritative battle rules, and repeatable local verification before presentation polish.

## Phase 0: Repository Baseline

### Objective

Keep the workspace runnable before feature work expands.

### Work

1. Confirm bootstrap, backend checks, frontend checks, and boundary checks.
2. Keep README entrypoints current.
3. Keep provider-neutral naming in docs and user-facing copy.

### Exit Criteria

- Repository setup commands are documented.
- Automated checks run from the repository root.
- New work has a clear owning directory.

## Phase 1: Contracts and Domain Fixtures

### Objective

Define the payloads and domain fixtures shared by FE, BE, and input runtime before wiring screens to behavior.

### Work

1. Define player, loadout, catalog, queue, battle snapshot, battle event, action submission, result, history, and rating contracts.
2. Define MVP gesture tokens and skill sequences.
3. Add contract tests for required payload fields and rejection shapes.

### Exit Criteria

- Contracts cover REST and socket event payloads needed by MVP stories.
- Skill sequences are deterministic and testable.
- Contract changes are reviewed before feature consumers depend on them.

## Phase 2: Player Entry and Loadout

### Objective

Let a player reach a battle-ready state.

### Work

1. Implement or harden lightweight player create and restore flow.
2. Implement approved skillset and presentation-set catalogs.
3. Implement loadout save and validation.
4. Render start and loadout screens.

### Exit Criteria

- A player can create or restore a profile.
- A valid loadout is required before queue entry.
- Invalid catalog selections are rejected by the backend.

## Phase 3: Socket Session and Matchmaking

### Objective

Move a battle-ready player into queue and then into a battle session through server events.

### Work

1. Implement socket token validation and connection lifecycle.
2. Implement queue enter, cancel, and status behavior.
3. Implement match creation and battle session creation.
4. Emit match-found and battle-started events.
5. Render queue state and transition to battle workspace.

### Exit Criteria

- Valid socket sessions receive events.
- Invalid socket sessions are rejected.
- Queue state is idempotent.
- Battle-started event initializes the client battle workspace.

## Phase 4: Battle Engine Core

### Objective

Make the backend the single authority for battle state changes.

### Work

1. Validate battle action payloads.
2. Apply accepted actions exactly once.
3. Reject invalid, duplicate, out-of-turn, insufficient-resource, and cooldown-blocked actions.
4. Emit accepted, rejected, and state-updated events.
5. Add unit tests for each rule path.

### Exit Criteria

- Client submissions never mutate state without backend confirmation.
- Duplicate action ids do not duplicate state changes.
- Rejection reason codes are stable and mapped by the client.

## Phase 5: Client Gesture Runtime

### Objective

Turn local hand recognition output into stable gesture sequences and submit only completed sequences.

### Work

1. Implement or finalize gesture sequence state machine.
2. Add recognition adapter boundary for live hand input.
3. Add deterministic fallback input for local smoke tests.
4. Connect completed sequences to battle action submission.
5. Keep raw camera and raw tracking data local.

### Exit Criteria

- Sequence state covers progress, complete, failure, timeout, and reset paths.
- Fallback input can submit a known valid sequence.
- Completed local sequence creates one pending server action.

## Phase 6: Battle Workspace UX

### Objective

Make the playable loop understandable and resilient during normal and failure paths.

### Work

1. Render HP, mana, cooldowns, turn owner, timer, and battle log.
2. Render sequence progress and local failure reasons.
3. Render pending, accepted, rejected, opponent turn, timeout, surrender, and ended states.
4. Ensure compact and desktop layouts do not overlap or resize unexpectedly.

### Exit Criteria

- Inputs are disabled outside the player's actionable state.
- Server rejection does not visually apply skill effects.
- Battle end leads to result view.

## Phase 7: Persistence, Rating, and History

### Objective

Record completed battles and expose competitive progress.

### Work

1. Persist battle result and compact action audit.
2. Apply rating update once after battle end.
3. Expose history and rating lookup endpoints.
4. Render result, history, and rating views.

### Exit Criteria

- Completed battle can be retrieved after result resolution.
- Rating delta is deterministic and idempotent.
- History excludes raw camera and raw tracking data.

## Phase 8: Reconnect, Timeout, and Surrender Hardening

### Objective

Remove the highest-risk battle-loop gaps before end-to-end handoff.

### Work

1. Implement active battle snapshot restore.
2. Reattach socket session after reconnect.
3. Resolve turn timeout.
4. Resolve surrender.
5. Verify delayed events against latest server snapshot.

### Exit Criteria

- Reconnect restores latest battle state.
- Timeout and surrender cannot leave a battle stuck.
- Ended battles reject further actions.

## Phase 9: End-to-End Smoke and Handoff

### Objective

Verify the MVP loop from clean start to recorded match outcome.

### Work

1. Run automated backend and frontend checks.
2. Run local runtime smoke checks.
3. Complete one valid battle action path.
4. Complete one invalid action path.
5. Finish a battle and confirm result, rating, and history.
6. Document blockers as follow-up work.

### Exit Criteria

- Smoke checklist is complete or blockers are documented.
- README and planning links are current.
- Deferred features remain out of MVP acceptance criteria.

## Recommended Commit Order

1. Contracts and fixtures.
2. Player and loadout API.
3. Matchmaking and socket session.
4. Battle engine validation and mutation.
5. Client gesture sequence runtime.
6. Battle workspace event handling and feedback.
7. Result, rating, and history persistence.
8. Reconnect, timeout, and surrender hardening.
9. Smoke checklist and documentation refresh.
