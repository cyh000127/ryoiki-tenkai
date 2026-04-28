# v2-5 two-player queue pairing 구현 기록

이 문서는 `V2-E3-ST01`의 구현 기록입니다. ranked queue가 connected player 한 명을 자동으로 practice battle에 넣는 대신, 실제 queued player 두 명을 하나의 battle session으로 묶도록 pairing rule을 강화했습니다.

## 목적

- 두 player가 practice rival 없이 같은 battle session으로 매칭될 수 있게 합니다.
- 먼저 큐에 들어간 player와 나중에 들어온 player가 같은 `battleSessionId`를 받고 반대 seat를 받도록 고정합니다.
- duplicate queue enter가 중복 queue entry나 중복 ready event를 만들지 않게 합니다.
- API/WebSocket matchmaking path와 explicit practice path를 테스트에서 분리합니다.

## 범위

- `RANKED_1V1` queue에서 real queued opponent가 있을 때만 API matchmaking battle을 생성합니다.
- 먼저 큐에 들어간 player를 `PLAYER_ONE`, 나중에 들어온 player를 `PLAYER_TWO`로 배정합니다.
- 두 player가 모두 connected 상태면 둘 모두에게 `battle.match_found`와 `battle.started`를 fanout합니다.
- 한 player가 disconnected 상태여도 match는 생성되며, 해당 player는 WebSocket reconnect 시 latest active battle handoff를 받습니다.
- `pl_practice` fallback은 explicit repository/test helper path로만 남깁니다.

## 구현 요약

- `BE/api/src/gesture_api/repositories/game_state.py`
  - `create_match_for_player(..., allow_practice=...)` 옵션을 추가했습니다.
  - `allow_practice=False`일 때 real queued opponent가 없으면 battle을 만들지 않습니다.
  - real queued opponent가 있으면 먼저 큐에 있던 player를 첫 번째 seat로 둡니다.
- `BE/api/src/gesture_api/api/routes/game.py`
  - matchmaking queue enter와 WebSocket replay에서 `allow_practice=False`를 사용합니다.
  - 이미 큐에 있는 player의 repeated queue enter는 같은 `queuedAt`을 유지하고 `match_ready`를 재발행하지 않습니다.
- `BE/api/tests/unit/test_battle_websocket_events.py`
  - 두 connected player가 같은 battle id와 반대 seat를 받는지 검증합니다.
  - practice battle path가 explicit helper로만 사용되는지 분리했습니다.
- `BE/api/tests/unit/test_game_flow_api.py`
  - 기존 practice-centered battle helper를 explicit repository path로 분리했습니다.

## Pairing Rule

| 상황 | 결과 |
| --- | --- |
| loadout 없는 player가 queue enter | `LOADOUT_REQUIRED` |
| 첫 번째 valid player queue enter | `SEARCHING`, `match_ready` 1회 |
| 같은 player repeated queue enter | 기존 `queuedAt` 유지, duplicate ready event 없음 |
| 두 번째 valid player queue enter | 두 player를 같은 battle로 매칭 |
| connected participants | `battle.match_found`, `battle.started` fanout |
| disconnected participant | reconnect 시 latest active battle handoff |
| real queued opponent 없음 | API path에서는 practice battle을 자동 생성하지 않음 |

## Seat 기준

- 먼저 큐에 들어간 player: `PLAYER_ONE`
- 나중에 들어온 player: `PLAYER_TWO`
- `turnOwnerPlayerId`는 `PLAYER_ONE` player id로 시작합니다.

## 검증

- `uv run ruff check BE/api/src/gesture_api/repositories/game_state.py BE/api/src/gesture_api/api/routes/game.py BE/api/tests/unit/test_battle_websocket_events.py BE/api/tests/unit/test_game_flow_api.py`
- `uv run pytest BE/api/tests/unit/test_battle_websocket_events.py BE/api/tests/unit/test_game_flow_api.py`

## 남은 v2 선행조건

- `V2-E3-ST02`: socket reconnect와 latest snapshot 재동기화 hardening.
- `V2-E3-ST03`: delayed/duplicate event reconciliation 회귀 테스트 확대.
- `V2-E3-ST04`: timeout watcher와 surrender event fanout 안정화.
