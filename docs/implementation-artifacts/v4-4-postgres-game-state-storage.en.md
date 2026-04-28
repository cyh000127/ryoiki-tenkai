# v4-4 PostgreSQL Game State Storage Transition Record

## Purpose

Use the Docker Compose PostgreSQL service as the default game state persistence backend. JSON file storage remains only for tests and temporary local mode.

## Implementation

- Added `GAME_STATE_STORAGE_BACKEND`.
- Set the default backend to `sql`.
- Switched the global `game_state_repository` to use `SqlGameStateStorageAdapter(SessionLocal)` by default.
- Added `GAME_STATE_STORAGE_BACKEND=sql` to `BE/api/.env.example`.
- Kept backend tests isolated with `GAME_STATE_STORAGE_BACKEND=json` so they can run without a DB container.

## Runtime Rules

| Runtime | Storage Backend | Notes |
| --- | --- | --- |
| `docker compose up --build` | PostgreSQL | API starts after `db-migrate` completes |
| host-run backend | PostgreSQL | `DATABASE_URL` must point to `localhost:5432` |
| backend unit tests | JSON temp file | test fixture resets to a temporary file |
| temporary local JSON mode | JSON | only when `GAME_STATE_STORAGE_BACKEND=json` is explicit |

## Remaining In-Memory Boundary

The repository still keeps a runtime cache in memory while the process runs. Player, loadout, rating, history, and compact audit snapshots are persisted through the PostgreSQL adapter. Queue and active battle sessions remain process runtime state; fully multi-process battle runtime needs a separate design.

## Verification

- `uv run ruff check BE/api/src BE/api/tests`
- `uv run pytest BE/api/tests/unit`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\dev-deps.ps1 -PlanOnly`
- `git diff --check`
