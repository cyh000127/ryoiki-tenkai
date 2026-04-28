# v2-3 storage adapter persistence 구현 기록

## 목적

runtime repository가 파일 입출력과 직렬화 책임을 직접 갖지 않도록, result/history/rating persistence를 정식 storage adapter 경계 뒤로 이동했습니다.

## 범위

- game state persistence snapshot을 명시적인 DTO로 분리합니다.
- JSON 파일 저장 구현은 `JsonGameStateStorageAdapter`가 담당합니다.
- SQL 호환 저장 구현은 `SqlGameStateStorageAdapter`가 담당합니다.
- persistence가 필요 없는 테스트/임시 실행은 `NullGameStateStorageAdapter`를 사용할 수 있습니다.
- repository는 player, match history, compact audit runtime state를 관리하되 저장 매체 세부사항을 알지 않습니다.
- history와 leaderboard route는 repository의 읽기 메서드를 통해 접근합니다.

## 구현 요약

- `BE/api/src/gesture_api/repositories/game_state_storage.py`
  - `GameStateStorageAdapter` protocol을 추가했습니다.
  - `GameStatePersistenceSnapshot`을 추가했습니다.
  - `JsonGameStateStorageAdapter`, `SqlGameStateStorageAdapter`, `NullGameStateStorageAdapter`를 추가했습니다.
- `BE/api/src/gesture_api/models/game_state.py`
  - player, match history, compact audit 저장 테이블 모델을 추가했습니다.
- `BE/api/migrations/versions/0002_game_state_storage_tables.py`
  - storage adapter용 테이블 마이그레이션을 추가했습니다.
- `BE/api/src/gesture_api/repositories/game_state.py`
  - 기존 `_load_persisted_state`, `_persist_state` 파일 처리 책임을 adapter 호출로 교체했습니다.
  - `list_match_history`, `list_leaderboard_players` 읽기 메서드를 추가했습니다.
- `BE/api/src/gesture_api/api/routes/game.py`
  - route가 repository 내부 list/dict에 직접 접근하지 않도록 변경했습니다.
- `BE/api/tests/unit/test_game_state_storage.py`
  - JSON/SQL storage adapter snapshot round-trip, repository adapter wiring, null adapter ephemeral 동작을 검증합니다.

## 검증

- `uv run ruff check BE`
- `uv run pytest BE/api/tests/unit/test_game_state_storage.py BE/api/tests/unit/test_game_flow_api.py`

## 남은 v2 선행조건

- 구체 frame recognizer 패키지 또는 런타임 바인딩 선택.
- 정식 skill/resource 교체.
