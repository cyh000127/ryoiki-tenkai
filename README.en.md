# Gesture Skill Workspace

This repository is a frontend/backend workspace for a browser-based gesture battle MVP.

Korean documentation is available in `README.md`. `README.ko.md` keeps the same Korean content as a mirrored file.

## Current Status

- Spec review date: `2026-04-28`
- Story summary
  `done 27`
  `partial 1`
  `planned 0`
- Partial stories
  `E4-ST01` Define MVP Gesture Token Set and Skill Sequences
- Detailed review
  `docs/implementation-artifacts/mvp-v1-spec-review.en.md`

The repository is currently wired through the following playable flow:

- guest player create or restore
- `skillset` / `animset` catalog lookup and `loadout` save
- ranked 1v1 queue entry, cancel, and status lookup
- WebSocket auth and `battle.match_ready` / `battle.match_found` / `battle.started` handoff
- server-authoritative battle action validation and state mutation
- automatic practice rival turns
- `HP_ZERO`, `TIMEOUT`, and `SURRENDER` resolution with result screen rendering

## Run Locally

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

`FE/app/.env` is optional when the default backend URL `http://localhost:8000` is used.

### Backend

```bash
uv run --package gesture-api uvicorn gesture_api.main:app --app-dir BE/api/src --reload --host 0.0.0.0 --port 8000
```

### Frontend

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

Optional PowerShell helper scripts are still available:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\bootstrap.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\check-boundaries.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\backend-check.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\frontend-check.ps1
```

## Boundaries

- `FE/app`: browser app, route shell, gesture control UI, generated API client boundary.
- `BE/api`: canonical write owner for command, session, mapping, and audit state.
- `BE/core`: shared domain value objects and pure rules.
- `BE/worker`: delayed or asynchronous processing that does not bypass API write ownership.
- `BE/api/contracts`: canonical wire contract source.
- `scripts`: repository-owned setup and verification entrypoints.
- `infra/runtime`: local runtime topology notes.
- `ops`: operational configuration placeholders.

## Terminology

- `skillset`: a server-approved combat preset that includes gesture sequences, costs, cooldowns, and related battle rules.
- `animset`: a server-approved visual presentation preset selected by the player.
- `loadout`: the saved `skillset + animset` combination required before queue entry.

## Completed Work

- lightweight guest identity create/restore and profile lookup
- `skillset`, `animset`, and `loadout` APIs with validation
- idempotent matchmaking queue entry, cancel, and status lookup
- WebSocket token auth and battle handoff events
- server-authoritative battle validation and mutation
  duplicate, invalid gesture, out-of-turn, insufficient mana, cooldown, timeout, surrender, and battle end paths
- automatic practice rival turns
- frontend battle workspace connected to real REST and WebSocket flow
  pending, rejected, confirmed, timeout, surrender, and result handling
- live camera input surface and debug fallback controls are now separated
  deterministic sequence replay and manual token input stay in a debug-only panel
- battle deadline countdown, fighter cooldown detail, and selected skill state are rendered from server snapshots
- sequence progress, submission readiness, local input status, and server rejection feedback are rendered as separate battle UI states
- result screen renders winner/loser, end reason, rating delta, and rematch/history/home follow-up actions
- reconnect restore for the latest active battle snapshot and ended battle result state
- delayed and duplicate socket events are reconciled so stale snapshots do not rewind the UI or reapply results
- server-backed history, rating, and leaderboard screens with loading, empty, and error states
- battle results, compact action audit, ratings, and history now persist in the backend runtime store

## Remaining Work

- formalize the gesture token set as a shared contract or fixture
- final end-to-end smoke coverage

## MVP Planning and QA

- `docs/implementation-artifacts/mvp-v1-spec-review.en.md`: spec review snapshot that compares current implementation against the MVP stories.
- `docs/implementation-artifacts/mvp-v1-implementation-plan.en.md`: MVP implementation baseline for WebSocket flow, server authoritative rules, client hand recognition, and excluded scope.
- `docs/planning-artifacts/mvp-v1/technology-stack.en.md`: selected MVP technology stack, boundaries, deferred choices, and dependency rules.
- `docs/planning-artifacts/mvp-v1/epics.en.md`: MVP implementation plan split into epic-level outcomes, boundaries, stories, and acceptance signals.
- `docs/planning-artifacts/mvp-v1/stories.en.md`: story-sized implementation units with scope, dependencies, status, and verification notes.
- `docs/planning-artifacts/mvp-v1/implementation-order.en.md`: recommended build order and commit order for the MVP.
- `docs/planning-artifacts/mvp-v1/prerequisites.en.md`: prerequisites for product, contract, FE, BE, input runtime, persistence, QA, and merge readiness.
- `docs/implementation-artifacts/smoke-test-checklist.en.md`: smoke checklist for repository, runtime, REST, WebSocket, battle, client recognition, and end-to-end verification.

## Scaffold Policy

- Keep external provider details out of documentation and product copy.
- Keep camera frames and raw landmark streams on the client side by default.
- Send only confirmed command metadata to the backend.
- Keep user-visible copy in frontend locale catalogs.
- Extend contracts before generating or consuming client code.
