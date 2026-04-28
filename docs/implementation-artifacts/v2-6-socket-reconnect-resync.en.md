# v2-6 Socket Reconnect Resync Record

This document is the implementation record for `V2-E3-ST02`. Socket reconnect now restores the latest active battle snapshot and recovers battles that should already be ended at reconnect time into the result state.

## Purpose

- Preserve the latest turn, hp, mana, and cooldown state after reconnect.
- Verify two-player battle reconnect replay separately from the practice path.
- Avoid replaying an active snapshot when a battle deadline already expired before reconnect.
- Prevent stale ended snapshots from rolling a newer active state into the result screen.

## Scope

- Resolve due timeout before WebSocket reconnect replay.
- Active battle replay carries the latest `BattleStateResponse` through `battle.match_found` and `battle.started`.
- Due-timeout replay sends `battle.timeout` followed by `battle.ended` for result recovery.
- The frontend reducer and socket handler ignore stale ended snapshots.
- Socket close on an ended result screen does not move queue state back to `MATCHED`.

## Implementation Summary

- `BE/api/src/gesture_api/api/routes/game.py`
  - `replay_player_matchmaking_state` calls `resolve_timeout_if_due` before active handoff.
  - A timed-out battle at reconnect is recovered through timeout/ended events.
- `BE/api/tests/unit/test_battle_websocket_events.py`
  - Verifies two-player reconnect restores latest turn/hp/mana/cooldown after an action.
  - Verifies due timeout is resolved before reconnect replay.
- `FE/app/src/features/battle-flow/model/battleFlow.ts`
  - `battleEnded` also uses the stale snapshot guard.
  - Socket disconnect keeps ended result queue state as `IDLE`.
- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
  - Socket `battle.ended` skips dispatch and query invalidation when the snapshot is stale.
- `FE/app/tests/unit/battleFlow.test.ts`
  - Verifies stale ended snapshot suppression and ended-result socket disconnect state.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - Verifies ended replay after reconnect restores the result screen.

## Replay Rule

| Situation | Result |
| --- | --- |
| Active battle reconnect | latest `battle.match_found` and `battle.started` replay |
| Reconnect after an action in a two-player battle | latest turn/hp/mana/cooldown are preserved |
| Deadline expired before reconnect | `battle.timeout` and `battle.ended` replay |
| Stale ended event after a newer active snapshot | UI state is preserved; no result transition |
| Socket closes on ended result screen | screen stays result; queue stays `IDLE` |

## Verification

- `uv run ruff check BE/api/src/gesture_api/api/routes/game.py BE/api/tests/unit/test_battle_websocket_events.py`
- `uv run pytest BE/api/tests/unit/test_battle_websocket_events.py`
- `pnpm --dir FE/app exec vitest run tests/unit/battleFlow.test.ts tests/unit/BattleGameWorkspace.test.tsx`
- `pnpm --dir FE/app typecheck`

## Remaining v2 Prerequisites

- `V2-E1-ST02`: select and bind the concrete frame recognizer runtime.
- `V2-E4-ST01` and later: obtain an approved skill domain source.
