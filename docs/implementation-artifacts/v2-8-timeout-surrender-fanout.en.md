# v2-8 Timeout/Surrender Fanout Record

This document is the implementation record for `V2-E3-ST04`. Timeout and surrender battle endings now keep stable final-state fanout for connected participants, while disconnected participants recover the ended state on reconnect.

## Purpose

- Make battle lookup use the same resolution fanout path as WebSocket action/reconnect when it resolves a due timeout.
- Verify that a connected opponent receives `battle.timeout` followed by `battle.ended` even when the timed-out turn owner is disconnected.
- Verify that a disconnected opponent receives `battle.ended` on reconnect after surrender.

## Scope

- `GET /api/v1/battles/{battleSessionId}` no longer mutates due-timeout state without also sending resolution events.
- Timeout fanout order is locked as `battle.timeout` -> `battle.ended`.
- Surrender fanout order is locked as `battle.surrendered` -> `battle.ended`.
- Disconnected participants recover result state through latest ended battle replay.

## Implementation Summary

- `BE/api/src/gesture_api/api/routes/game.py`
  - Converted the battle lookup route to async and made it call `resolve_due_timeout_and_emit`.
  - Timeout resolution entry points now share the same event fanout path across action, WebSocket replay, and battle lookup.
- `BE/api/tests/unit/test_battle_websocket_events.py`
  - Verifies battle lookup resolves timeout for a disconnected turn owner and fans out timeout/ended events to the connected opponent.
  - Verifies surrender sends connected-player events and replays ended state to the disconnected opponent on reconnect.

## Fanout Rule

| Situation | Connected participant | Disconnected participant |
| --- | --- | --- |
| Timeout | receives `battle.timeout` then `battle.ended` | receives `battle.ended` replay on reconnect |
| Surrender | receives `battle.surrendered` then `battle.ended` | receives `battle.ended` replay on reconnect |
| Battle lookup resolves due timeout | uses the same resolution event fanout | sees ended state through lookup response or reconnect |

## Verification

- `uv run pytest BE/api/tests/unit/test_battle_websocket_events.py`
- `uv run ruff check BE`
- `uv run pytest BE`

## Remaining v2 Prerequisites

- `V2-E1-ST02`: select and bind the concrete frame recognizer runtime.
- `V2-E4-ST01` and later: obtain an approved skill domain source.
