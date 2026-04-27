# MVP v1 Spec Review

This document is a quick snapshot of how far the current implementation satisfies the MVP v1 specification.

## Review Baseline

- Review date: `2026-04-28`
- Source documents
  `docs/implementation-artifacts/mvp-v1-implementation-plan.en.md`
  `docs/planning-artifacts/mvp-v1/stories.en.md`
  `docs/planning-artifacts/mvp-v1/implementation-order.en.md`

## Overall Assessment

- The core playable loop is implemented end to end.
  player entry -> loadout -> queue -> WebSocket handoff -> battle -> result -> history/rating -> runtime persistence
- Story status summary
  `done 28`
  `partial 0`
  `planned 0`
- The repository now covers every currently tracked core item from Phase 0 through Phase 8.
- All currently tracked MVP stories are marked `done`.

## Specification Areas Marked Done

- `E1` Player Entry and Loadout
  guest create/restore, profile lookup, `skillset` / `animset` catalog, `loadout` save, and queue guards are implemented.
- `E2` Matchmaking and Session Handoff
  queue enter/cancel/status, socket token auth, `battle.match_ready`, `battle.match_found`, `battle.started`, and reconnect snapshot restore are implemented.
- `E3` Server-Authoritative Battle Engine
  action validation, exact-once apply, rejection paths, timeout, surrender, and battle end recording are implemented.
- `E4-ST01` Gesture Token Contract
  the normalized gesture token set and default skill-to-sequence mapping are fixed through a shared fixture and cross-stack tests.
- `E5-ST01` Battle Workspace State View
  HP, mana, cooldown, turn owner, deadline, selected skill status, and battle log are rendered from the latest server snapshot.
- `E5-ST02` Sequence Progress and Submission Readiness
  current step, remaining step, progress indicator, submission readiness, local progress state, and server rejection feedback are rendered separately.
- `E5-ST04` Battle Result and Next Action
  winner/loser, end reason, rating delta, result summary, and rematch/history/home actions are rendered on the result screen.
- `E6` Rating, History, and Leaderboard
  result persistence, compact action audit, rating update, history/leaderboard endpoints, and client history/rating screens are implemented.
- `E7` Local Verification and Handoff
  README commands, smoke checklist, and MVP exclusion tracking are maintained.

## Specification Areas Still Partial

- There are no MVP story items currently marked partial.

## Implemented User Scenarios

- A stored player can be restored and continue from the latest loadout or queue state.
- Matchmaking entry is blocked until a valid `loadout` exists.
- Queue entry initializes the battle workspace through WebSocket handoff.
- Valid actions update battle state only after server confirmation.
- Invalid, duplicate, out-of-turn, timeout, and surrender paths are handled by server-authoritative rules.
- Reconnect restores the latest battle snapshot or ended result state.
- Completed battles update history, rating, and leaderboard data and persist to the runtime store.

## Where the Current Implementation Is Documented

- Primary usage guide
  `README.md`
- Implementation baseline
  `docs/implementation-artifacts/mvp-v1-implementation-plan.en.md`
- Story status source
  `docs/planning-artifacts/mvp-v1/stories.en.md`
- Smoke checklist
  `docs/implementation-artifacts/smoke-test-checklist.en.md`

## Recommended Next Priorities

- `E7-ST02` follow-up hardening
  Expand practical local smoke coverage.
