# v2 SQL Migration Smoke Procedure

This document is the implementation record for `V2-E2-ST02`. It provides one repeatable procedure for migration apply, disposable rollback, and reset smoke checks when using the SQL storage adapter.

## Purpose

- Confirm that storage-adapter migrations apply to the local database.
- Require an explicit flag before any rollback check that can lose data.
- Separate reset smoke so it only runs against a local disposable database.

## Applies To

- Alembic config: `BE/api/alembic.ini`
- Migration scripts: `BE/api/migrations/versions`
- Default local database URL: `postgresql+psycopg://app:app@localhost:5432/gesture_skill`
- Container service: `db` in `docker-compose.yml`

## Automated Smoke Entrypoint

Default apply smoke:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -StartDb
```

Plan-only check:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -PlanOnly
```

Rollback smoke on a disposable local database:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -StartDb -VerifyRollback -AllowDestructiveReset
```

`-VerifyRollback` can run migration downgrade commands, so use it only against a local disposable database. Do not use it against shared development databases, production databases, or local state that must be preserved.

## Manual Procedure

When not using the script, run the following from the repository root.

```powershell
docker compose up -d db
$env:DATABASE_URL = "postgresql+psycopg://app:app@localhost:5432/gesture_skill"
Push-Location BE/api
uv run --package gesture-api alembic current
uv run --package gesture-api alembic upgrade head
uv run --package gesture-api alembic current
Pop-Location
```

Run rollback smoke only against a disposable local database.

```powershell
$env:DATABASE_URL = "postgresql+psycopg://app:app@localhost:5432/gesture_skill"
Push-Location BE/api
uv run --package gesture-api alembic downgrade -1
uv run --package gesture-api alembic current
uv run --package gesture-api alembic upgrade head
uv run --package gesture-api alembic current
Pop-Location
```

Run reset smoke only when the local volume can be discarded.

```powershell
docker compose down --volumes
docker compose up -d db
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1
```

## Success Criteria

- `alembic upgrade head` exits without errors.
- `alembic current` shows the latest revision.
- When rollback smoke runs, `downgrade -1` succeeds and `upgrade head` succeeds again.
- When reset smoke runs, migrations succeed from an empty local database.
- The smoke procedure does not introduce storage of raw camera frames, raw landmarks, or raw tracking streams.

## Failure Handling

- If the database service does not start, check `db` with `docker compose ps`.
- If connection fails, confirm that `DATABASE_URL` points to `localhost:5432`.
- If migration fails, record the failed revision id, command, and stderr in the readiness or handoff note.
- After a rollback failure, reset the local disposable database and run `upgrade head` again.

## Verification

- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -PlanOnly`
- `git diff --check`
- provider-neutral targeted text scan
