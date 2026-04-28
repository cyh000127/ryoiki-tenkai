# MVP v1 Smoke Test Checklist

Use this checklist for local handoff verification after FE, BE, or input-runtime changes. Mark an item complete only when the observed behavior matches the server-authoritative MVP plan.

## Release Verification Snapshot

- Verification date: `2026-04-28`
- Release decision: v1 functional MVP is release-ready
- Release blockers: none
- Evidence:
  - `uv run ruff check BE`
  - `uv run pytest BE`
  - `pnpm --dir FE/app typecheck`
  - `pnpm --dir FE/app test`
  - `pnpm --dir FE/app build`
  - `scripts\check-boundaries.ps1`
  - `docker compose -f docker-compose.yml config --quiet`
  - `git diff --check`
- Detailed document: `docs/implementation-artifacts/v1-release-readiness.en.md`

## Repository and Documentation

- [ ] `scripts\check-boundaries.ps1` passes from the repository root.
- [ ] `scripts\backend-check.ps1` passes from the repository root.
- [ ] `scripts\frontend-check.ps1` passes from the repository root.
- [ ] README points to the MVP plan and this smoke checklist.
- [ ] MVP exclusion text is present and does not name any external provider or deferred transport product.
- [ ] The requested forbidden-term scan returns no matches outside ignored lock files.

## Local Runtime

- [ ] Backend runtime starts without import, migration, or configuration errors.
- [ ] Frontend runtime starts and renders the first playable screen.
- [ ] Required local services start with documented defaults.
- [ ] Missing optional settings fail with clear local error messages.
- [ ] Logs identify request, socket session, battle session, and action identifiers without exposing camera frames or raw tracking data.

## REST Setup Flow

- [ ] Guest or simple player creation returns a stable player identifier and usable token.
- [ ] Profile lookup returns nickname, rating, record, and current loadout fields.
- [ ] Skillset list returns server-approved gesture sequences and cost/cooldown metadata.
- [ ] Animset list returns selectable metadata.
- [ ] Loadout update accepts valid selections and rejects invalid selections with a standard error shape.
- [ ] Matchmaking queue entry, cancel, and status endpoints behave consistently across repeated calls.

## WebSocket Flow

- [ ] Socket token issuance succeeds for a valid player session.
- [ ] WebSocket connection succeeds with a valid token and fails clearly with an invalid token.
- [ ] Match-ready and match-found events move the client from queue to battle without polling-only behavior.
- [ ] Battle-started event initializes turn number, turn owner, deadline, HP, mana, cooldowns, and visible battle status.
- [ ] Ping or heartbeat behavior keeps the connection state observable.
- [ ] Reconnect restores state from the latest server snapshot.

## Battle Engine

- [ ] Valid action submission during the player's turn returns accepted and then a state update.
- [ ] Accepted action applies mana cost, HP change, cooldown change, battle log entry, and next turn owner exactly once.
- [ ] Duplicate `action_id` does not duplicate any state mutation.
- [ ] Out-of-turn action is rejected without state mutation.
- [ ] Invalid gesture sequence is rejected without state mutation.
- [ ] Insufficient mana and active cooldown paths are rejected without state mutation.
- [ ] Turn timeout advances or resolves battle according to the documented rule.
- [ ] Surrender ends the battle and records the correct result.
- [ ] HP depletion ends the battle, emits final state, updates rating, and writes match history.

## Client Hand Recognition

- [ ] Camera permission allowed state shows camera-ready and hand-detected feedback.
- [ ] Camera permission denied state shows a clear blocked state and does not enter battle action submission.
- [ ] No-hand state, unstable-hand state, and recognized-gesture state are visually distinct.
- [ ] Sequence progress displays current step, remaining steps, and reset or timeout state.
- [ ] Local recognition success does not apply skill effects until server confirmation arrives.
- [ ] Local failure reasons are separate from server rejection reasons.
- [ ] Test or fallback input can submit a known valid sequence for repeatable smoke checks.

## End-to-End Play Loop

- [ ] Start from a clean browser session and create or restore a player.
- [ ] Select loadout and enter ranked 1v1 queue.
- [ ] Receive a match and transition into battle.
- [ ] Complete at least one valid action round trip through WebSocket.
- [ ] Complete one invalid action path and confirm no server state mutation.
- [ ] Finish the battle through win/loss, timeout, or surrender.
- [ ] Result screen shows winner, rating delta, end reason, and next action.
- [ ] History or rating screen reflects the completed match.

## Release Gate

- [x] All critical smoke items above pass or have documented blockers.
- [x] Known gaps are labeled as MVP exclusions or follow-up work.
- [x] No FE, BE, or input-runtime source change is required by this checklist update alone.
