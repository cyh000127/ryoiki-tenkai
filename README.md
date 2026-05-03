# 손동작 술식 전투 워크스페이스

브라우저 카메라로 손동작을 인식하고, 인식된 동작을 전투 입력으로 사용해 술식을 발동하는 웹 기반 실시간 전투 프로젝트입니다.

현재 프로젝트는 프론트엔드, 백엔드, PostgreSQL, Redis, DB migration, MediaPipe 기반 손동작 인식, 연습 모드, 매칭/전투 흐름, Unity WebGL 연출 경계를 포함합니다.

## 구성

- `FE/app`: React + Vite 프론트엔드
- `BE/api`: FastAPI 백엔드
- `db`: PostgreSQL
- `cache`: Redis
- `db-migrate`: Alembic migration 실행 컨테이너
- `Unity/RendererProject`: 술식 연출 렌더러 프로젝트

## 참고 문서

- v5 연습/매칭 플로우: `docs/planning-artifacts/v5/practice-match-flow.ko.md`
- v6 Unity renderer 명세: `docs/planning-artifacts/v6/unity-renderer-spec.ko.md`
- v6 TODO: `docs/planning-artifacts/v6/todo.ko.md`
- v6 practice overlay preview 기록: `docs/implementation-artifacts/v6-1-practice-overlay-preview.ko.md`
- v6 practice effect activation 기록: `docs/implementation-artifacts/v6-2-practice-effect-activation.ko.md`
- v6 Unity build handoff check 기록: `docs/implementation-artifacts/v6-3-unity-build-handoff-check.ko.md`
- v6 practice smoke checklist 기록: `docs/implementation-artifacts/v6-4-practice-smoke-checklist.ko.md`
- v6 frontend skill effect boundary 기록: `docs/implementation-artifacts/v6-5-frontend-skill-effect-boundary.ko.md`

## 빠른 실행

Docker Compose로 프론트엔드, 백엔드, DB, cache, migration을 한 번에 실행합니다.

```powershell
docker compose up --build
```

실행 후 접속 주소는 아래와 같습니다.

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/healthz`
- API docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

`db-migrate` 컨테이너는 migration을 완료하면 정상 종료됩니다. 계속 떠 있어야 하는 컨테이너는 `web`, `api`, `db`, `cache`입니다.

중지:

```powershell
docker compose down
```

DB 데이터까지 초기화:

```powershell
docker compose down -v
```

## 개발 실행

프론트엔드와 백엔드를 호스트에서 hot reload로 실행하고, PostgreSQL/Redis만 Docker로 띄우는 방식입니다.

### 1. 의존성 설치

```powershell
uv sync
pnpm --dir FE/app install
```

### 2. DB와 cache 실행

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\dev-deps.ps1
```

### 3. 백엔드 실행

```powershell
$env:DATABASE_URL = "postgresql+psycopg://app:app@localhost:5432/gesture_skill"
$env:GAME_STATE_STORAGE_BACKEND = "sql"
uv run --package gesture-api uvicorn gesture_api.main:app --app-dir BE/api/src --reload --host 0.0.0.0 --port 8000
```

### 4. 프론트엔드 실행

새 터미널에서 실행합니다.

```powershell
pnpm --dir FE/app dev
```

브라우저에서 접속합니다.

```text
http://localhost:5173
```

## 로컬 macOS 실행: Docker 없이

Docker가 없어도 로컬 PostgreSQL만 준비되어 있으면 백엔드와 프론트를 바로 실행할 수 있습니다.

### 1. PostgreSQL 설치와 시작

```bash
brew install postgresql@16
brew services start postgresql@16
```

### 2. 개발용 role과 database 준비

```bash
createuser app
psql postgres -c "ALTER USER app WITH PASSWORD 'app';"
createdb -O app gesture_skill
```

### 3. SQL migration 적용

```bash
export DATABASE_URL="postgresql+psycopg://app:app@localhost:5432/gesture_skill"
export GAME_STATE_STORAGE_BACKEND="sql"
cd BE/api
uv run --package gesture-api alembic upgrade head
```

주의:

- `alembic.ini`의 `script_location = migrations`는 `BE/api` 기준 상대경로입니다.
- migration command는 `BE/api` 디렉터리에서 실행하는 것을 권장합니다.

### 4. 백엔드 실행

```bash
export DATABASE_URL="postgresql+psycopg://app:app@localhost:5432/gesture_skill"
export GAME_STATE_STORAGE_BACKEND="sql"
cd BE/api
uv run --package gesture-api uvicorn gesture_api.main:app --app-dir src --reload --host 0.0.0.0 --port 8000
```

### 5. 프론트엔드 실행

```bash
pnpm --dir FE/app dev
```

### 6. 접속

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/healthz`
- API docs: `http://localhost:8000/docs`

## 검증

기본 확인 명령은 아래와 같습니다.

```powershell
pnpm --dir FE/app typecheck
pnpm --dir FE/app test
uv run pytest BE/api/tests/unit
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\unity-build-check.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v6-practice-smoke-check.ps1 -Mode fast
git diff --check
```
