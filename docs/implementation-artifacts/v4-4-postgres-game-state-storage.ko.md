# v4-4 PostgreSQL game state storage 전환 기록

## 목적

Docker Compose의 PostgreSQL을 game state persistence 기본 backend로 사용한다. JSON 파일 저장은 테스트와 임시 로컬 모드로만 남긴다.

## 구현 내용

- `GAME_STATE_STORAGE_BACKEND` 설정을 추가했다.
- 기본값을 `sql`로 설정했다.
- 전역 `game_state_repository`가 기본적으로 `SqlGameStateStorageAdapter(SessionLocal)`를 사용하도록 전환했다.
- `BE/api/.env.example`에 `GAME_STATE_STORAGE_BACKEND=sql`을 명시했다.
- backend test는 `GAME_STATE_STORAGE_BACKEND=json`으로 격리해 DB 컨테이너 없이 실행되도록 유지했다.

## 런타임 기준

| 실행 방식 | 저장 backend | 비고 |
| --- | --- | --- |
| `docker compose up --build` | PostgreSQL | `db-migrate` 완료 후 API 시작 |
| 호스트 backend 직접 실행 | PostgreSQL | `DATABASE_URL`이 `localhost:5432`를 가리켜야 함 |
| backend unit test | JSON temp file | 테스트 fixture가 임시 파일로 reset |
| 임시 로컬 JSON 모드 | JSON | `GAME_STATE_STORAGE_BACKEND=json` 명시 시에만 사용 |

## 유지되는 인메모리 범위

Repository는 여전히 runtime cache를 메모리에 들고 동작한다. 다만 player, loadout, rating, history, compact audit snapshot은 PostgreSQL adapter를 통해 저장된다. queue와 active battle session은 현재 프로세스 runtime 상태이며, 완전한 multi-process battle runtime은 별도 설계가 필요하다.

## 검증

- `uv run ruff check BE/api/src BE/api/tests`
- `uv run pytest BE/api/tests/unit`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\dev-deps.ps1 -PlanOnly`
- `git diff --check`
