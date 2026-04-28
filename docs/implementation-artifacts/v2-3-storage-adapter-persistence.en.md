# v2-3 Storage Adapter Persistence Record

## Purpose

Result, history, and rating persistence now sit behind a formal storage adapter boundary so the runtime repository no longer owns file I/O and serialization details directly.

## Scope

- Split the game state persistence snapshot into an explicit DTO.
- Keep JSON file storage in `JsonGameStateStorageAdapter`.
- Keep SQL-compatible storage in `SqlGameStateStorageAdapter`.
- Allow tests and temporary runs to use `NullGameStateStorageAdapter`.
- Keep player, match history, and compact audit runtime state in the repository while hiding storage media details.
- Route history and leaderboard reads through repository methods.

## Implementation Summary

- `BE/api/src/gesture_api/repositories/game_state_storage.py`
  - Added the `GameStateStorageAdapter` protocol.
  - Added `GameStatePersistenceSnapshot`.
  - Added `JsonGameStateStorageAdapter`, `SqlGameStateStorageAdapter`, and `NullGameStateStorageAdapter`.
- `BE/api/src/gesture_api/models/game_state.py`
  - Added table models for players, match history, and compact audit storage.
- `BE/api/migrations/versions/0002_game_state_storage_tables.py`
  - Added the storage-adapter table migration.
- `BE/api/src/gesture_api/repositories/game_state.py`
  - Replaced direct `_load_persisted_state` and `_persist_state` file handling with adapter calls.
  - Added `list_match_history` and `list_leaderboard_players` read methods.
- `BE/api/src/gesture_api/api/routes/game.py`
  - Stopped route-level direct access to repository internal lists and dictionaries.
- `BE/api/tests/unit/test_game_state_storage.py`
  - Covers JSON/SQL storage adapter snapshot round-trip, repository adapter wiring, and null adapter ephemeral behavior.

## Verification

- `uv run ruff check BE`
- `uv run pytest BE/api/tests/unit/test_game_state_storage.py BE/api/tests/unit/test_game_flow_api.py`

## Remaining v2 Prerequisites

- Select the concrete frame recognizer package or runtime binding.
- Replace final skill/resource assets.
