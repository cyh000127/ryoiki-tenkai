# MVP v1 Stories

This document expands the MVP epics into story-sized implementation units. Story status values are:

- `done`: implemented in the current scaffold.
- `partial`: baseline exists, but the MVP story is not complete.
- `planned`: not implemented yet.

## E1: Player Entry and Loadout

### E1-ST01: Create or Restore Lightweight Player Identity

- Status: done
- User story: As a player, I can create or restore a lightweight local identity so I can enter the battle loop without a full account system.
- Scope:
  - Create player identifier and display name.
  - Issue a session token suitable for REST and socket setup flows.
  - Restore profile from stored local state.
- Acceptance criteria:
  - Profile lookup returns player id, nickname, rating, record, and current loadout.
  - Missing or expired local state leads to a new start flow instead of a broken screen.
  - No external identity provider is required.
- Dependencies:
  - Storage model for player profile.
  - Standard error response shape.
- Verification:
  - Backend unit tests for create and lookup paths.
  - Frontend test for restored player rendering.

### E1-ST02: Expose Approved Skillset and Animset Catalogs

- Status: done
- User story: As a player, I can view approved skillset and animset presets so I know what can be selected for battle.
- Scope:
  - Return skill identifiers, names, costs, cooldowns, and gesture sequences.
  - Return animset metadata required by the UI.
  - Keep catalogs server-approved and deterministic for the MVP.
- Acceptance criteria:
  - Catalog endpoints return stable `skillset_id` and `animset_id` values.
  - Skill sequence metadata uses normalized gesture tokens.
  - Invalid `skillset_id` or `animset_id` values are never accepted by loadout update.
- Dependencies:
  - MVP gesture token set.
  - Skill rule model.
- Verification:
  - Contract tests for catalog payload shape.
  - Frontend rendering test for selectable skillset and animset options.

### E1-ST03: Save and Validate Player Loadout

- Status: done
- User story: As a player, I can save a valid loadout so matchmaking starts with a battle-ready configuration.
- Scope:
  - Validate skillset and animset selections.
  - Persist current loadout.
  - Expose loadout in profile and battle setup views.
- Acceptance criteria:
  - Valid loadout saves and is returned by profile lookup.
  - Invalid loadout returns standard validation error.
  - Matchmaking entry is blocked without a valid loadout.
- Dependencies:
  - E1-ST02 approved catalogs.
- Verification:
  - Backend validation tests.
  - Frontend battle-entry guard test.

## E2: Matchmaking and Session Handoff

### E2-ST01: Enter, Cancel, and Query Matchmaking Queue

- Status: done
- User story: As a loaded player, I can enter and cancel ranked 1v1 queue so I control when a match starts.
- Scope:
  - Queue entry command.
  - Queue cancel command.
  - Queue status lookup.
  - Repeated command idempotency.
- Acceptance criteria:
  - Repeated enter commands do not create duplicate queue entries.
  - Repeated cancel commands leave the player out of queue.
  - Queue status returns a clear waiting, matched, or idle state.
- Dependencies:
  - E1-ST03 valid loadout.
- Verification:
  - Backend service tests for repeated commands.
  - Frontend queue-state rendering test.

### E2-ST02: Authenticate Socket Connection

- Status: done
- User story: As the system, I can verify a player's socket connection before sending battle events.
- Scope:
  - Issue or validate a socket token for a player.
  - Reject invalid tokens during connection setup.
  - Bind connection to a player id.
- Acceptance criteria:
  - Valid token opens a socket session.
  - Invalid token is closed before event processing.
  - Socket messages are associated with the authenticated player.
- Dependencies:
  - E1-ST01 player session.
- Verification:
  - Backend socket tests for valid and invalid token paths.

### E2-ST03: Emit Match-Found and Battle-Started Events

- Status: done
- User story: As a player in queue, I receive server events that move me into a battle without relying on polling-only behavior.
- Scope:
  - Emit match-found event.
  - Create battle session.
  - Emit battle-started event with full initial state.
- Acceptance criteria:
  - Event payload includes battle session id, player seats, initial stats, turn owner, deadline, and visible status.
  - Client transitions to battle workspace from event data.
  - Duplicate events do not create duplicate active sessions.
- Dependencies:
  - E2-ST01 queue membership.
  - E3 battle state model.
- Verification:
  - Socket contract test.
  - Frontend event reducer test.

### E2-ST04: Restore Battle Snapshot After Reconnect

- Status: done
- User story: As a player, I can reconnect and see the latest battle state.
- Scope:
  - Lookup active battle snapshot.
  - Reattach socket session to battle events.
  - Resolve delayed or missed events against latest snapshot.
- Acceptance criteria:
  - Reconnected client renders latest HP, mana, cooldowns, turn number, and turn owner.
  - Submitted action ids remain idempotent after reconnect.
  - Ended battle reconnects to result state.
- Dependencies:
  - E3-ST02 idempotent action application.
  - E6-ST01 result persistence.
- Verification:
  - Backend snapshot test.
  - Frontend reconnect-state test.

## E3: Server-Authoritative Battle Engine

### E3-ST01: Validate Submitted Battle Action

- Status: done
- User story: As the backend, I validate action submissions before mutating battle state.
- Scope:
  - Validate battle session id, player id, turn number, action id, skill id, and gesture sequence.
  - Return accepted or rejected event.
- Acceptance criteria:
  - Wrong turn, wrong sequence, missing battle, and ended battle are rejected.
  - Valid action receives an accepted event before state update.
  - Rejection reason is specific enough for UI feedback.
- Dependencies:
  - E1-ST02 skill sequence metadata.
  - E2-ST02 authenticated socket.
- Verification:
  - Backend unit tests for accepted and rejected submissions.

### E3-ST02: Apply Accepted Action Exactly Once

- Status: done
- User story: As the backend, I apply a valid battle action once so state remains consistent.
- Scope:
  - Deduplicate by action id.
  - Apply damage, resource cost, cooldown, battle log entry, and turn progression.
  - Emit state update after mutation.
- Acceptance criteria:
  - Duplicate action id returns stable result without duplicate mutation.
  - State update includes changed HP, mana, cooldowns, log entry, turn owner, and next deadline.
  - Replayed accepted action does not duplicate rating or history writes.
- Dependencies:
  - E3-ST01 validation.
  - Battle state storage.
- Verification:
  - Backend idempotency tests.

### E3-ST03: Reject Invalid Battle Action Paths

- Status: done
- User story: As the backend, I reject actions that violate battle rules without changing state.
- Scope:
  - Out-of-turn action.
  - Invalid gesture sequence.
  - Insufficient mana.
  - Active cooldown.
  - Ended battle action.
- Acceptance criteria:
  - Rejected action emits reason code and leaves snapshot unchanged.
  - Client can map reason code to localized copy.
  - Rejections are covered by focused tests.
- Dependencies:
  - E3-ST01 validation.
  - Skill cost and cooldown model.
- Verification:
  - Backend rejection-path tests.
  - Frontend rejection rendering test.

### E3-ST04: Resolve Timeout and Surrender Paths

- Status: done
- User story: As the system, I can resolve stalled or conceded turns so battles do not hang.
- Scope:
  - Turn timeout rule.
  - Surrender command.
  - Event emission for timeout, surrender, and resulting state.
- Acceptance criteria:
  - The MVP timeout rule is that the turn owner immediately loses after `action_deadline_at` expires.
  - A timeout event is followed by an ended event and the result is recorded once.
  - Surrender ends battle immediately with correct winner.
- Dependencies:
  - Battle clock model.
  - E6-ST01 result persistence.
- Verification:
  - Backend timeout and surrender tests.

### E3-ST05: End Battle and Record Outcome

- Status: done
- User story: As the backend, I end a battle when win/loss conditions are met and record the outcome.
- Scope:
  - HP depletion end condition.
  - Final event emission.
  - Result write.
- Acceptance criteria:
  - Battle end emits winner, loser, reason, final stats, and rating delta placeholder or value.
  - Ended battle rejects further actions.
  - Result can be retrieved by history and result views.
- Dependencies:
  - E6-ST01 result persistence.
- Verification:
  - Backend end-condition tests.

## E4: Client Gesture Input Runtime

### E4-ST01: Define MVP Gesture Token Set and Skill Sequences

- Status: done
- User story: As a designer of the battle loop, I can define a small set of gesture tokens and skill sequences that are easy to explain and test.
- Scope:
  - Token model.
  - Skill-to-sequence mapping.
  - Frontend and backend shared expectations.
- Acceptance criteria:
  - At least three MVP skill sequences exist.
  - Each sequence uses normalized tokens.
  - Sequence metadata is visible in the UI for guidance.
- Dependencies:
  - E1-ST02 catalog shape.
- Verification:
  - Contract test or shared fixture test.

### E4-ST02: Implement Gesture Sequence State Machine

- Status: done
- User story: As a player, I receive stable sequence progress instead of noisy single-frame recognition results.
- Scope:
  - Stability threshold.
  - Debounce.
  - Timeout.
  - Reset.
  - Failure reason state.
- Acceptance criteria:
  - Correct sequence reaches complete state.
  - Wrong token produces failure state.
  - Timeout resets or fails predictably.
  - Duplicate stable token does not incorrectly skip steps.
- Dependencies:
  - E4-ST01 token set.
- Verification:
  - Frontend unit tests for success, wrong token, timeout, reset, and stability.

### E4-ST03: Add Deterministic Test or Fallback Input

- Status: done
- User story: As a developer, I can test battle submission without relying on live camera conditions.
- Scope:
  - Manual gesture token input.
  - Test mode sequence submission.
  - Debug state that is separated from normal play.
- Acceptance criteria:
  - Known valid sequence can be submitted in local smoke tests.
  - Fallback input cannot bypass backend battle validation.
  - Debug controls are not confused with normal game controls.
- Dependencies:
  - E4-ST02 sequence state machine.
  - E5-ST02 sequence progress UI.
- Verification:
  - Frontend interaction test.

### E4-ST04: Connect Recognized Sequence to Battle Action Submission

- Status: done
- User story: As a player, completing a valid local sequence submits a battle action for backend confirmation.
- Scope:
  - Convert complete sequence into action payload.
  - Include battle session id, turn number, skill id, action id, and gesture sequence.
  - Wait for accepted or rejected server response.
- Acceptance criteria:
  - Completion creates one pending action submission.
  - UI waits for server confirmation.
  - Failed local sequence does not submit.
- Dependencies:
  - E2-ST02 authenticated socket.
  - E3-ST01 action validation.
  - E5-ST03 pending and rejection UI.
- Verification:
  - Frontend reducer or component test.
  - Socket integration test.

## E5: Battle Workspace UI

### E5-ST01: Render Battle State and Action Log

- Status: done
- User story: As a player, I can understand current battle state at a glance.
- Scope:
  - Player and opponent HP.
  - Mana and cooldowns.
  - Turn owner and deadline.
  - Recent battle log.
- Acceptance criteria:
  - State reflects latest server snapshot or event.
  - Opponent turn disables player action input.
  - Battle log shows accepted actions and major events.
- Dependencies:
  - E2-ST03 battle-started event.
  - E3-ST02 state update event.
- Verification:
  - Frontend component test.

### E5-ST02: Show Sequence Progress and Submission Readiness

- Status: done
- User story: As a player, I can see what gesture step is expected and whether I am ready to submit.
- Scope:
  - Current step.
  - Remaining steps.
  - Progress indicator.
  - Local failure reason.
- Acceptance criteria:
  - UI distinguishes waiting, progressing, complete, failed, and reset states.
  - Local feedback is separate from server rejection feedback.
  - Text fits in compact and desktop layouts.
- Dependencies:
  - E4-ST02 state machine.
- Verification:
  - Frontend component test.

### E5-ST03: Show Pending Confirmation and Rejected Action Reasons

- Status: done
- User story: As a player, I know when my submitted action is pending, accepted, or rejected by the server.
- Scope:
  - Pending state.
  - Accepted state.
  - Rejected state and reason.
  - Input lock while pending.
- Acceptance criteria:
  - Submit button or input is disabled while pending.
  - Accepted action advances visible battle state from server event.
  - Rejected action leaves battle state unchanged and shows reason.
- Dependencies:
  - E3-ST01 action validation.
- Verification:
  - Frontend battle flow tests.

### E5-ST04: Render Battle Result and Next Actions

- Status: done
- User story: As a player, I can see match outcome and choose the next action after battle ends.
- Scope:
  - Winner and loser.
  - End reason.
  - Rating delta.
  - Rematch or return action.
- Acceptance criteria:
  - Result screen is shown after final battle event.
  - Rating delta matches backend result.
  - Player can return to queue or history.
- Dependencies:
  - E3-ST05 battle end.
  - E6-ST02 rating update.
- Verification:
  - Frontend result rendering test.

## E6: Rating, History, and Leaderboard

### E6-ST01: Persist Battle Result and Compact Action Audit

- Status: done
- User story: As the backend, I can store completed battle results and a compact action audit.
- Scope:
  - Battle result record.
  - Compact action log.
  - Retrieval by player.
- Acceptance criteria:
  - Result is written once.
  - Action audit omits raw camera and raw tracking data.
  - History lookup returns recent completed battles.
- Dependencies:
  - E3-ST05 battle end.
  - Storage migration or repository implementation.
- Verification:
  - Backend persistence tests.

### E6-ST02: Apply Rating Update After Battle End

- Status: done
- User story: As a player, my rating changes after a completed ranked battle.
- Scope:
  - Rating calculation.
  - Rating delta storage.
  - Profile and result exposure.
- Acceptance criteria:
  - Winner and loser receive deterministic deltas.
  - Re-reading result does not apply rating again.
  - Profile rating reflects latest completed battle.
- Dependencies:
  - E6-ST01 result persistence.
- Verification:
  - Backend rating tests.

### E6-ST03: Expose Match History and Rating Views

- Status: done
- User story: As a player, I can review recent matches and rating position.
- Scope:
  - History endpoint.
  - Rating or leaderboard endpoint.
  - Pagination or small fixed list for MVP.
- Acceptance criteria:
  - History returns recent match summaries.
  - Rating view returns rankable entries or current player rating context.
  - Empty state is explicit.
- Dependencies:
  - E6-ST01 and E6-ST02.
- Verification:
  - Backend API tests.

### E6-ST04: Render History and Rating in the Client

- Status: done
- User story: As a player, I can see recent match results and rating changes in the client.
- Scope:
  - Result list.
  - Rating summary.
  - Empty state.
- Acceptance criteria:
  - Completed match appears after battle end.
  - Rating delta is shown consistently with result view.
  - Loading, empty, and error states are visible.
- Dependencies:
  - E6-ST03 endpoints.
- Verification:
  - Frontend component tests.

## E7: Local Verification and Handoff

### E7-ST01: Maintain Setup and Verification Commands

- Status: done
- User story: As a developer, I can run repository checks from documented commands.
- Scope:
  - Bootstrap command.
  - Boundary check.
  - Backend check.
  - Frontend check.
- Acceptance criteria:
  - README lists current commands.
  - Commands run from repository root.
  - Failed checks are actionable.
- Dependencies:
  - Repository scripts.
- Verification:
  - Manual command execution during handoff.

### E7-ST02: Maintain Smoke Checklist

- Status: done
- User story: As a developer, I can use a smoke checklist to verify launch-critical paths.
- Scope:
  - Repository checks.
  - Runtime checks.
  - REST checks.
  - Socket checks.
  - Battle checks.
  - Client recognition checks.
  - End-to-end loop checks.
- Acceptance criteria:
  - Checklist covers implemented and planned MVP surfaces.
  - Blockers can be recorded without changing source code.
  - Checklist remains provider-neutral.
- Dependencies:
  - MVP plan.
- Verification:
  - Documentation review.

### E7-ST03: Track MVP Exclusions and Follow-Up Candidates

- Status: done
- User story: As the team, we know what is excluded from MVP so implementation stays focused.
- Scope:
  - Exclusion list.
  - Deferred feature list.
  - Follow-up candidate notes.
- Acceptance criteria:
  - Exclusions are visible from planning docs.
  - Deferred work is not treated as MVP acceptance criteria.
  - Product copy does not promise excluded behavior.
- Dependencies:
  - MVP baseline.
- Verification:
  - Documentation review.

### E7-ST04: Keep Provider-Neutral Documentation and Copy

- Status: done
- User story: As the team, we avoid specific provider or product names in code comments, docs, and user-facing copy unless approved.
- Scope:
  - Documentation wording.
  - Frontend copy.
  - Local naming.
  - Handoff checks.
- Acceptance criteria:
  - Planning docs use generic technology categories where possible.
  - User-facing copy avoids external provider names.
  - Repository scans can be run before handoff.
- Dependencies:
  - Documentation policy.
- Verification:
  - Targeted text scan.
