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
  `done 26`
  `partial 2`
  `planned 0`
- The repository now covers the core items from Phase 0 through Phase 8.
- Remaining work is mostly focused on `input runtime hardening`, `battle UX polish`, and `smoke coverage`, rather than missing product pillars.

## Specification Areas Marked Done

- `E1` Player Entry and Loadout
  guest create/restore, profile lookup, `skillset` / `animset` catalog, `loadout` save, and queue guards are implemented.
- `E2` Matchmaking and Session Handoff
  queue enter/cancel/status, socket token auth, `battle.match_ready`, `battle.match_found`, `battle.started`, and reconnect snapshot restore are implemented.
- `E3` Server-Authoritative Battle Engine
  action validation, exact-once apply, rejection paths, timeout, surrender, and battle end recording are implemented.
- `E5-ST01` Battle Workspace State View
  HP, mana, cooldown, turn owner, deadline, selected skill status, and battle log are rendered from the latest server snapshot.
- `E5-ST02` Sequence Progress and Submission Readiness
  current step, remaining step, progress indicator, submission readiness, local progress state, and server rejection feedback are rendered separately.
- `E6` Rating, History, and Leaderboard
  result persistence, compact action audit, rating update, history/leaderboard endpoints, and client history/rating screens are implemented.
- `E7` Local Verification and Handoff
  README commands, smoke checklist, and MVP exclusion tracking are maintained.

## Specification Areas Still Partial

### E4-ST01: Define MVP Gesture Token Set and Skill Sequences

- Current state
  The default `skillset` already includes three skill sequences shared by the UI and backend.
- Why it remains partial
  The gesture token set itself is not yet fully formalized as a dedicated contract or shared fixture.

### E5-ST04: Render Battle Result and Next Action

- Current state
  Result screen, end reason, rating change, rematch, and history entry are implemented.
- Why it remains partial
  Next-action UX and result presentation polish are still not fully complete.

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

- `E4-ST01`, `E5-ST04`
  Formalize the gesture token contract/shared fixture and improve result presentation polish.
- `E7-ST02`
  Expand practical local smoke coverage.
