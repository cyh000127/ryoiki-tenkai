# v2-6 socket reconnect 재동기화 구현 기록

이 문서는 `V2-E3-ST02`의 구현 기록입니다. socket reconnect가 active battle의 최신 snapshot을 복구하고, reconnect 시점에 이미 종료되어야 하는 battle을 result 상태로 복구하도록 보강했습니다.

## 목적

- reconnect 후 최신 turn, hp, mana, cooldown 상태를 유지합니다.
- two-player battle에서도 reconnect replay가 practice path와 섞이지 않도록 검증합니다.
- reconnect 시점에 timeout이 이미 만료된 battle은 active snapshot으로 되돌리지 않고 ended result로 복구합니다.
- stale ended snapshot이 최신 active state를 result 화면으로 잘못 되돌리지 않게 합니다.

## 범위

- WebSocket reconnect replay 전에 due timeout을 먼저 해석합니다.
- active battle replay는 `battle.match_found`와 `battle.started`에 최신 `BattleStateResponse`를 싣습니다.
- due timeout replay는 `battle.timeout` 이후 `battle.ended`를 보내 result recovery를 보장합니다.
- frontend reducer와 socket handler는 stale ended snapshot을 무시합니다.
- ended result 상태에서 socket close가 발생해도 queue 상태를 `MATCHED`로 되돌리지 않습니다.

## 구현 요약

- `BE/api/src/gesture_api/api/routes/game.py`
  - `replay_player_matchmaking_state`가 active handoff 전에 `resolve_timeout_if_due`를 호출합니다.
  - reconnect 시점에 timeout이 만료된 battle은 timeout/ended event로 복구합니다.
- `BE/api/tests/unit/test_battle_websocket_events.py`
  - two-player battle에서 action 이후 reconnect가 최신 turn/hp/mana/cooldown을 복구하는지 검증합니다.
  - due timeout battle이 reconnect replay 전에 ended state로 전환되는지 검증합니다.
- `FE/app/src/features/battle-flow/model/battleFlow.ts`
  - `battleEnded` 처리도 stale snapshot guard를 사용합니다.
  - ended result 상태에서 socket disconnect가 queue 상태를 `IDLE`로 유지합니다.
- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
  - socket `battle.ended` event도 stale snapshot이면 dispatch와 query invalidation을 건너뜁니다.
- `FE/app/tests/unit/battleFlow.test.ts`
  - stale ended snapshot 무시와 ended result socket disconnect 상태를 검증합니다.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - reconnect 이후 ended replay가 result screen으로 복구되는지 검증합니다.

## Replay Rule

| 상황 | 결과 |
| --- | --- |
| active battle reconnect | 최신 `battle.match_found`, `battle.started` replay |
| two-player battle action 이후 reconnect | 최신 turn/hp/mana/cooldown 유지 |
| reconnect 시점에 deadline 만료 | `battle.timeout`, `battle.ended` replay |
| 최신 active snapshot 이후 stale ended event 도착 | UI state 유지, result 전환 없음 |
| ended result 화면에서 socket close | screen은 result 유지, queue는 `IDLE` 유지 |

## 검증

- `uv run ruff check BE/api/src/gesture_api/api/routes/game.py BE/api/tests/unit/test_battle_websocket_events.py`
- `uv run pytest BE/api/tests/unit/test_battle_websocket_events.py`
- `pnpm --dir FE/app exec vitest run tests/unit/battleFlow.test.ts tests/unit/BattleGameWorkspace.test.tsx`
- `pnpm --dir FE/app typecheck`

## 남은 v2 선행조건

- `V2-E3-ST03`: delayed/duplicate event reconciliation 회귀 테스트 확대.
- `V2-E3-ST04`: timeout watcher와 surrender event fanout 안정화.
- `V2-E1-ST02`: concrete frame recognizer runtime 선택 및 adapter 결합.
- `V2-E4-ST01` 이후: approved skill domain source 확보.
