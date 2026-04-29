# 손동작 술식 전투 워크스페이스

브라우저 카메라로 손동작을 인식하고, 인식된 동작을 전투 입력으로 사용해 술식을 발동하는 웹 기반 실시간 전투 프로젝트입니다.

현재 프로젝트는 프론트엔드, 백엔드, PostgreSQL, Redis, DB migration, MediaPipe 기반 손동작 인식, 연습 모드, 매칭/전투 흐름을 포함합니다.

## 구성

- `FE/app`: React + Vite 프론트엔드
- `BE/api`: FastAPI 백엔드
- `db`: PostgreSQL
- `cache`: Redis
- `db-migrate`: Alembic migration 실행 컨테이너
- `Unity/RendererProject`: 술식 연출 렌더러 프로젝트

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

## 검증

기본 확인 명령은 아래와 같습니다.

```powershell
pnpm --dir FE/app typecheck
pnpm --dir FE/app test
uv run pytest BE/api/tests/unit
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\unity-build-check.ps1
git diff --check
```
