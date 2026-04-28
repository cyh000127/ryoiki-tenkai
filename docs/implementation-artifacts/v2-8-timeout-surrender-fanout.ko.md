# v2-8 timeout/surrender fanout 구현 기록

이 문서는 `V2-E3-ST04`의 구현 기록입니다. timeout 또는 surrender로 전투가 끝날 때 연결된 참여자에게는 안정적인 이벤트 순서로 최종 상태를 보내고, 연결이 끊긴 참여자는 다음 reconnect에서 ended state를 복구하도록 회귀 테스트를 확장했습니다.

## 목적

- timeout 해석 경로가 WebSocket action/reconnect뿐 아니라 battle lookup에서도 같은 resolution fanout을 사용하게 합니다.
- turn owner가 disconnected 상태여도 연결된 opponent가 `battle.timeout` 이후 `battle.ended`를 받도록 검증합니다.
- surrender 시 disconnected opponent가 즉시 이벤트를 받지 못해도 reconnect에서 `battle.ended`를 받도록 검증합니다.

## 범위

- `GET /api/v1/battles/{battleSessionId}`에서 due timeout을 해석할 때 저장소 상태만 바꾸지 않고 resolution event fanout까지 수행합니다.
- timeout fanout 순서는 `battle.timeout` -> `battle.ended`로 고정합니다.
- surrender fanout 순서는 `battle.surrendered` -> `battle.ended`로 고정합니다.
- disconnected participant는 latest ended battle replay를 통해 result state를 복구합니다.

## 구현 요약

- `BE/api/src/gesture_api/api/routes/game.py`
  - battle lookup route를 async로 전환하고 `resolve_due_timeout_and_emit`을 사용하도록 변경했습니다.
  - timeout resolution 진입점이 action, WebSocket replay, battle lookup에서 같은 event fanout 경로를 공유합니다.
- `BE/api/tests/unit/test_battle_websocket_events.py`
  - disconnected turn owner의 timeout을 battle lookup이 해석하고 connected opponent가 timeout/ended event를 받는지 검증합니다.
  - surrender한 connected player와 disconnected opponent의 ended replay를 검증합니다.

## Fanout Rule

| 상황 | 연결된 참여자 | 연결이 끊긴 참여자 |
| --- | --- | --- |
| timeout | `battle.timeout` 이후 `battle.ended` 수신 | reconnect 시 `battle.ended` replay |
| surrender | `battle.surrendered` 이후 `battle.ended` 수신 | reconnect 시 `battle.ended` replay |
| battle lookup이 due timeout 해석 | 같은 resolution event fanout 사용 | lookup 응답 또는 reconnect에서 ended state 확인 |

## 검증

- `uv run pytest BE/api/tests/unit/test_battle_websocket_events.py`
- `uv run ruff check BE`
- `uv run pytest BE`

## 남은 v2 선행조건

- `V2-E1-ST02`: concrete frame recognizer runtime 선택 및 adapter 결합.
- `V2-E4-ST01` 이후: approved skill domain source 확보.
