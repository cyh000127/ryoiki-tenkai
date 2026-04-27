# MVP v1 Epics

This document breaks the MVP into implementation epics. Each epic describes the product outcome, engineering boundary, included stories, and acceptance signals. Use `stories.md` for story-level execution details.

## Epic E1: Player Entry and Loadout

### Goal

Let a player enter the app with a lightweight identity, inspect approved skill and presentation presets, and save a valid battle loadout.

### Product Outcome

- A player can start without a full account system.
- The client can restore the player profile across local sessions.
- The selected skillset and presentation set are server-approved before matchmaking.

### Engineering Boundary

- Backend owns player profile, token issuance, preset catalogs, and loadout validation.
- Frontend owns the start, restore, preset selection, and loadout confirmation screens.
- Storage keeps only the minimum profile and loadout state needed for the MVP loop.

### Stories

- E1-ST01: Create or restore lightweight player identity.
- E1-ST02: Expose approved skillset and presentation-set catalogs.
- E1-ST03: Save and validate player loadout.

### Acceptance Signals

- Player profile lookup returns identifier, nickname, rating, record, and current loadout.
- Invalid preset identifiers are rejected with the standard error shape.
- The battle entry UI blocks matchmaking until a valid loadout exists.

## Epic E2: Matchmaking and Session Handoff

### Goal

Move a loaded player into ranked 1v1 matchmaking, create a battle session, and hand the client into the battle screen through server events.

### Product Outcome

- The player can enter, cancel, and observe queue state.
- A matched pair receives a battle session with initial state.
- The client treats server events as the source of truth for match handoff.

### Engineering Boundary

- Backend owns queue membership, match creation, battle session creation, and socket event emission.
- Frontend owns queue status rendering and transition into the battle workspace.

### Stories

- E2-ST01: Enter, cancel, and query matchmaking queue.
- E2-ST02: Authenticate socket connection for a player session.
- E2-ST03: Emit match-found and battle-started events.
- E2-ST04: Restore battle snapshot after reconnect.

### Acceptance Signals

- Queue commands are idempotent across repeated calls.
- Invalid socket tokens are rejected before a battle event stream is opened.
- Match handoff includes battle session id, player seats, turn owner, deadline, HP, mana, cooldowns, and visible status.

## Epic E3: Server-Authoritative Battle Engine

### Goal

Resolve all battle actions on the backend so client gesture recognition never mutates battle state directly.

### Product Outcome

- Valid gesture actions affect HP, mana, cooldowns, battle log, and turn owner.
- Invalid, duplicate, out-of-turn, timeout, and surrender paths produce predictable results.
- The final battle result is available for result and history views.

### Engineering Boundary

- Backend owns battle rule validation, action idempotency, state mutation, turn progression, timeout, surrender, end conditions, and result recording.
- Frontend owns local input feedback and waits for server confirmation before presenting skill effects as applied.

### Stories

- E3-ST01: Validate submitted battle action.
- E3-ST02: Apply accepted action exactly once.
- E3-ST03: Reject invalid, duplicate, out-of-turn, insufficient-resource, and cooldown-blocked actions.
- E3-ST04: Resolve timeout and surrender paths.
- E3-ST05: End battle and record outcome.

### Acceptance Signals

- Duplicate action identifiers do not duplicate damage, cost, cooldown, rating, or history writes.
- Server rejection includes an actionable reason code for client feedback.
- Battle end emits final state and stores the result.

## Epic E4: Client Gesture Input Runtime

### Goal

Convert local hand recognition output into stable gesture token sequences that can be submitted as battle actions.

### Product Outcome

- The player sees camera readiness, hand detection, current gesture, sequence progress, and failure reason.
- Skill submission is repeatable in local test mode without requiring live camera conditions.
- Raw camera frames and raw tracking data stay on the client.

### Engineering Boundary

- Frontend owns recognition adapters, gesture token normalization, sequence state machine, debug state, and fallback input.
- Backend receives only normalized action metadata and gesture sequences.

### Stories

- E4-ST01: Define MVP gesture token set and skill sequences.
- E4-ST02: Implement sequence state machine with stability, debounce, timeout, reset, and failure reasons.
- E4-ST03: Add test or fallback input mode for deterministic smoke checks.
- E4-ST04: Connect recognized sequence to battle action submission.

### Acceptance Signals

- No-hand, unstable-hand, recognized-gesture, sequence-complete, and sequence-failed states are distinguishable.
- Local sequence success does not apply skill effects until the backend confirms the action.
- Unit tests cover success, wrong token, timeout, reset, and duplicate stability paths.

## Epic E5: Battle Workspace UI

### Goal

Provide a playable battle workspace that makes turn ownership, input progress, server confirmation, and battle outcome understandable.

### Product Outcome

- The player knows when it is their turn and what input is expected.
- Pending, accepted, rejected, opponent turn, timeout, surrender, and end states are visible.
- The UI keeps normal play separate from debug information.

### Engineering Boundary

- Frontend owns route composition, battle state projection, action form, recognition feedback, event handling, result screen, and local copy.
- Backend contracts define the event and snapshot payloads rendered by the UI.

### Stories

- E5-ST01: Render battle state, player stats, turn state, and action log.
- E5-ST02: Show local sequence progress and submission readiness.
- E5-ST03: Show pending server confirmation and rejected action reasons.
- E5-ST04: Render battle result and next actions.

### Acceptance Signals

- Inputs are disabled when it is not the player's turn or when a submission is pending.
- Rejected actions leave the visible battle state unchanged and show the rejection reason.
- Result view shows winner, rating delta, end reason, and a clear way to continue.

## Epic E6: Rating, History, and Leaderboard

### Goal

Persist minimal competitive progress so finished battles are visible after the match.

### Product Outcome

- Rating changes after a completed battle.
- Match history reflects completed battles.
- A simple leaderboard or rating view can rank active players.

### Engineering Boundary

- Backend owns result persistence, rating updates, history lookup, and leaderboard lookup.
- Frontend owns result, history, and rating views.

### Stories

- E6-ST01: Persist battle result and compact action audit.
- E6-ST02: Apply rating update after battle end.
- E6-ST03: Expose match history and rating views.
- E6-ST04: Render history and rating in the client.

### Acceptance Signals

- Completed match appears in history after result resolution.
- Rating delta is stable across repeated result reads.
- History does not store raw camera frames or raw tracking streams.

## Epic E7: Local Verification and Handoff

### Goal

Keep local setup, checks, smoke tests, and MVP exclusions explicit so implementation can continue safely across parallel workers.

### Product Outcome

- A developer can bootstrap, run checks, and verify the MVP loop from repository docs.
- Deferred work is visible and does not leak into current implementation scope.
- Feature handoff includes enough checks to catch broken FE, BE, socket, battle, and input-runtime paths.

### Engineering Boundary

- Repository docs own setup, planning artifacts, smoke checklist, and exclusion tracking.
- FE and BE tests own automated verification for implemented behavior.

### Stories

- E7-ST01: Maintain setup and verification commands.
- E7-ST02: Maintain smoke checklist for local handoff.
- E7-ST03: Track MVP exclusions and follow-up candidates.
- E7-ST04: Keep provider-neutral documentation and copy.

### Acceptance Signals

- README links to the active MVP plan, epics, stories, implementation order, prerequisites, and smoke checklist.
- Smoke checklist identifies blockers without requiring source changes by itself.
- Documentation avoids external provider or product-specific naming.
