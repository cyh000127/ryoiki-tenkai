# Gesture Skill Workspace

Browser-based gesture battle MVP workspace with a FastAPI backend and React frontend.

## Documentation

- Korean: `README.ko.md`
- English: `README.en.md`

Planning documents use the same language split:

- Korean files use `.ko.md`
- English files use `.en.md`

## Quick Start

### Prerequisites

- `uv`
- `pnpm`
- Python `3.13+`
- Node.js

### Install

```bash
uv sync
pnpm --dir FE/app install
cp FE/app/.env.example FE/app/.env
```

`FE/app/.env` is optional when `http://localhost:8000` is used as the backend base URL.

### Run

Backend:

```bash
uv run --package gesture-api uvicorn gesture_api.main:app --app-dir BE/api/src --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
pnpm --dir FE/app dev
```

Open `http://localhost:5173`.

## Verification

```bash
pnpm --dir FE/app typecheck
pnpm --dir FE/app test
uv run pytest BE/api/tests/unit
git diff --check
```

## Completed Work

- Guest player create/restore flow, profile lookup, and loadout save/validation are implemented.
- Skillset and animset catalog APIs are wired, and terminology is unified to `skillset`, `animset`, and `loadout`.
- Matchmaking queue enter/cancel/status, WebSocket token auth, and `battle.match_ready` / `battle.match_found` / `battle.started` handoff are implemented.
- Server-authoritative battle rules are connected end to end: action validation, exact-once apply, duplicate and invalid rejection paths, practice rival auto-turn, HP zero resolution, timeout, surrender, and end events.
- Frontend battle workspace now uses real REST and WebSocket flow for pending, rejected, confirmed, timeout, surrender, and result handling.
- Reconnect now restores the latest active battle snapshot and replays ended battles back into the result state.

## Remaining Work

- Live camera recognition adapter hardening and better separation from deterministic fallback input.
- Delayed event reconciliation and additional reconnect hardening against stale client state.
- Battle workspace polish for timer/deadline visibility, cooldown detail, compact/mobile UX, and richer battle feedback.
- Durable persistence for battle results, compact action audit, rating history, and leaderboard data.
- Client history, rating, and leaderboard screens, plus final smoke coverage.

## Key Docs

- `docs/implementation-artifacts/mvp-v1-implementation-plan.ko.md`
- `docs/planning-artifacts/mvp-v1/stories.ko.md`
- `docs/planning-artifacts/mvp-v1/implementation-order.ko.md`
- `docs/implementation-artifacts/smoke-test-checklist.ko.md`
