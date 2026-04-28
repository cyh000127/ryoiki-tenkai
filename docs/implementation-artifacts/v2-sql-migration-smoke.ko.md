# v2 SQL migration smoke 절차

이 문서는 `V2-E2-ST02`의 구현 기록입니다. SQL storage adapter를 사용할 때 migration apply, disposable rollback, reset smoke를 같은 절차로 확인할 수 있게 했습니다.

## 목적

- storage adapter용 migration이 로컬 database에 적용되는지 확인합니다.
- rollback 검증이 데이터 손실 가능성을 명시적으로 요구하도록 합니다.
- reset smoke는 local disposable database에서만 실행하도록 기준을 분리합니다.

## 적용 대상

- Alembic 설정: `BE/api/alembic.ini`
- Migration script: `BE/api/migrations/versions`
- 기본 local database URL: `postgresql+psycopg://app:app@localhost:5432/gesture_skill`
- Container service: `docker-compose.yml`의 `db`

## 자동 smoke entrypoint

기본 apply smoke:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -StartDb
```

실행 계획만 확인:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -PlanOnly
```

disposable local database에서 rollback smoke까지 확인:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -StartDb -VerifyRollback -AllowDestructiveReset
```

`-VerifyRollback`은 migration downgrade를 실행할 수 있으므로 local disposable database에서만 사용합니다. 공유 개발 database, 운영 database, 보존해야 하는 local state에는 사용하지 않습니다.

## 수동 절차

자동 script를 쓰지 않을 때는 저장소 루트에서 아래 순서로 실행합니다.

```powershell
docker compose up -d db
$env:DATABASE_URL = "postgresql+psycopg://app:app@localhost:5432/gesture_skill"
Push-Location BE/api
uv run --package gesture-api alembic current
uv run --package gesture-api alembic upgrade head
uv run --package gesture-api alembic current
Pop-Location
```

rollback smoke는 disposable local database에서만 실행합니다.

```powershell
$env:DATABASE_URL = "postgresql+psycopg://app:app@localhost:5432/gesture_skill"
Push-Location BE/api
uv run --package gesture-api alembic downgrade -1
uv run --package gesture-api alembic current
uv run --package gesture-api alembic upgrade head
uv run --package gesture-api alembic current
Pop-Location
```

reset smoke는 local volume을 버려도 될 때만 실행합니다.

```powershell
docker compose down --volumes
docker compose up -d db
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1
```

## 성공 기준

- `alembic upgrade head`가 오류 없이 종료됩니다.
- `alembic current`가 최신 revision을 보여줍니다.
- rollback smoke를 실행한 경우 `downgrade -1` 후 `upgrade head`가 다시 성공합니다.
- reset smoke를 실행한 경우 빈 local database에서 migration이 처음부터 성공합니다.
- smoke 절차가 raw camera frame, raw landmark, raw tracking stream 저장을 도입하지 않습니다.

## 실패 시 처리

- database service가 시작되지 않으면 `docker compose ps`로 `db` 상태를 확인합니다.
- connection 오류가 나면 `DATABASE_URL`이 `localhost:5432`를 가리키는지 확인합니다.
- migration 오류가 나면 실패한 revision id, command, stderr를 readiness 또는 handoff note에 기록합니다.
- rollback 실패 후에는 local disposable database를 reset하고 `upgrade head`를 다시 실행합니다.

## 검증

- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -PlanOnly`
- `git diff --check`
- provider-neutral targeted text scan
