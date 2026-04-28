# v2-5 Two-Player Queue Pairing Record

This document is the implementation record for `V2-E3-ST01`. Ranked queue pairing now waits for a real queued player instead of automatically placing one connected player into a practice battle.

## Purpose

- Allow two players to match into the same battle session without the practice rival path.
- Ensure the first queued player and the later queued player receive the same `battleSessionId` and opposite seats.
- Prevent duplicate queue entries and duplicate ready events on repeated queue enter.
- Separate the API/WebSocket matchmaking path from the explicit practice path in tests.

## Scope

- The `RANKED_1V1` queue creates an API matchmaking battle only when a real queued opponent exists.
- The first queued player is assigned `PLAYER_ONE`; the later queued player is assigned `PLAYER_TWO`.
- When both players are connected, both receive `battle.match_found` and `battle.started`.
- If one player is disconnected, the match is still created and that player receives the latest active battle handoff on WebSocket reconnect.
- The `pl_practice` fallback remains only in explicit repository/test helper paths.

## Implementation Summary

- `BE/api/src/gesture_api/repositories/game_state.py`
  - Added `create_match_for_player(..., allow_practice=...)`.
  - With `allow_practice=False`, no battle is created unless a real queued opponent exists.
  - With a real queued opponent, the older queued player is kept in the first seat.
- `BE/api/src/gesture_api/api/routes/game.py`
  - Queue enter and WebSocket replay use `allow_practice=False`.
  - Repeated queue enter for an already queued player keeps the same `queuedAt` and does not re-emit `match_ready`.
- `BE/api/tests/unit/test_battle_websocket_events.py`
  - Verifies two connected players receive one battle id and opposite seats.
  - Separates the practice battle path through an explicit helper.
- `BE/api/tests/unit/test_game_flow_api.py`
  - Separates the existing practice-centered battle helper into an explicit repository path.

## Pairing Rule

| Situation | Result |
| --- | --- |
| Player enters queue without loadout | `LOADOUT_REQUIRED` |
| First valid player enters queue | `SEARCHING`, one `match_ready` |
| Same player repeats queue enter | existing `queuedAt`, no duplicate ready event |
| Second valid player enters queue | both players match into one battle |
| Connected participants | `battle.match_found` and `battle.started` fanout |
| Disconnected participant | latest active battle handoff on reconnect |
| No real queued opponent | API path does not auto-create a practice battle |

## Seat Rule

- First queued player: `PLAYER_ONE`
- Later queued player: `PLAYER_TWO`
- `turnOwnerPlayerId` starts as the `PLAYER_ONE` player id.

## Verification

- `uv run ruff check BE/api/src/gesture_api/repositories/game_state.py BE/api/src/gesture_api/api/routes/game.py BE/api/tests/unit/test_battle_websocket_events.py BE/api/tests/unit/test_game_flow_api.py`
- `uv run pytest BE/api/tests/unit/test_battle_websocket_events.py BE/api/tests/unit/test_game_flow_api.py`

## Follow-up v2 Prerequisites

- `V2-E3-ST03`: expand delayed/duplicate event reconciliation regression tests.
- `V2-E3-ST04`: stabilize timeout watcher and surrender event fanout.
