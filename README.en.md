# Gesture Skill Workspace

This repository is a frontend/backend workspace for a browser-based gesture battle MVP.

Korean documentation is available in `README.md`. `README.ko.md` keeps the same Korean content as a mirrored file.

## v1 Release Status

- The v1 functional MVP is release-ready.
- There are no release blockers.
- The v2-1 live recognizer adapter boundary integration is complete.
- The v2-2 camera permission smoke automation and v2-3 storage adapter persistence transition are complete.
- The v2 planning baseline is written.
- The v2 smoke checklist is written.
- The v2 release readiness checkpoint is written.
- The v2 SQL migration smoke procedure is written.
- The v2 storage failure/fallback policy is written.
- The v2 compact audit retention boundary is written.
- The v2 recognition UI state hardening is complete.
- Skill names, skill effects, hand-motion resources, and visual assets will proceed only after a separate domain source is approved.
- Concrete frame recognizer binding remains v2 follow-up scope.
- Final release readiness document: `docs/implementation-artifacts/v1-release-readiness.en.md`
- v2-1 implementation record: `docs/implementation-artifacts/v2-1-live-recognizer-adapter.en.md`
- v2 planning baseline: `docs/implementation-artifacts/v2-planning-baseline.en.md`
- v2 release readiness checkpoint: `docs/implementation-artifacts/v2-release-readiness.en.md`

## Current Status

- Spec review date: `2026-04-28`
- Story summary
  `done 28`
  `partial 0`
  `planned 0`
- No partial stories are currently tracked.
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
- live camera adapter start/stop/status display and recognized-token dispatch through the normalized input boundary
- no-hand, unstable-hand, and recognized-token live camera UI states separated
- result/history/rating persistence moved behind the storage adapter boundary
- v2 epics, stories, implementation order, prerequisites, and technology stack documented
- v2 camera/runtime/storage/matching smoke checklist documented
- v2 release readiness checkpoint documented
- SQL migration apply/reset/rollback smoke procedure documented
- storage failure/fallback policy documented, with corrupted JSON state rejection
- compact audit retention boundary documented, including raw recognition data exclusion rules
- no-hand, unstable-hand, and recognized-token UI states separated

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
pnpm --dir FE/app smoke:camera
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
- the live recognizer adapter is connected to the battle screen
  camera observation-only feedback and recognized-token dispatch remain separate
- battle deadline countdown, fighter cooldown detail, and selected skill state are rendered from server snapshots
- sequence progress, submission readiness, local input status, and server rejection feedback are rendered as separate battle UI states
- result screen renders winner/loser, end reason, rating delta, and rematch/history/home follow-up actions
- a shared gesture token fixture and cross-stack contract tests now lock the default skill-to-sequence mapping
- reconnect restore for the latest active battle snapshot and ended battle result state
- delayed and duplicate socket events are reconciled so stale snapshots do not rewind the UI or reapply results
- server-backed history, rating, and leaderboard screens with loading, empty, and error states
- battle results, compact action audit, ratings, and history now persist behind the backend storage adapter boundary
- v2 planning baseline and blocked conditions for skill implementation are documented
- v2 smoke checklist separates implemented, planned, and blocked items
- v2 release readiness checkpoint separates full v2 release blockers
- SQL migration smoke script and procedure are documented
- storage failure/fallback policy is documented and corrupted JSON state is tested
- compact audit retention boundary is documented with retained/excluded field rules
- recognition UI state hardening is covered by no-hand/unstable/recognized regression tests

## Remaining Work

- no v1 release blockers
- v2 or follow-up scope
  concrete frame recognizer binding, recognizer restart/cleanup hardening, real two-player match hardening, and skill/resource implementation after the skill domain source is approved

## MVP Planning and QA

- `docs/implementation-artifacts/mvp-v1-spec-review.en.md`: spec review snapshot that compares current implementation against the MVP stories.
- `docs/implementation-artifacts/v1-release-readiness.en.md`: v1 release readiness decision and verification evidence.
- `docs/implementation-artifacts/v2-1-live-recognizer-adapter.en.md`: live recognizer adapter integration record.
- `docs/implementation-artifacts/v2-2-camera-permission-smoke.en.md`: camera permission smoke automation record.
- `docs/implementation-artifacts/v2-4-recognition-ui-state.en.md`: recognition UI state hardening record.
- `docs/implementation-artifacts/v2-3-storage-adapter-persistence.en.md`: storage adapter persistence record.
- `docs/implementation-artifacts/v2-planning-baseline.en.md`: v2 planning baseline record.
- `docs/implementation-artifacts/v2-smoke-checklist.en.md`: v2 smoke checklist and blocked items.
- `docs/implementation-artifacts/v2-release-readiness.en.md`: v2 checkpoint decision and full v2 release blockers.
- `docs/implementation-artifacts/v2-sql-migration-smoke.en.md`: SQL migration apply/reset/rollback smoke procedure.
- `docs/implementation-artifacts/v2-storage-failure-policy.en.md`: storage failure modes and fallback policy.
- `docs/implementation-artifacts/v2-audit-retention-boundary.en.md`: compact audit retention boundary.
- `docs/planning-artifacts/v2/technology-stack.en.md`: v2 technology keep/defer decisions.
- `docs/planning-artifacts/v2/epics.en.md`: v2 epics, boundaries, and acceptance signals.
- `docs/planning-artifacts/v2/stories.en.md`: v2 story status and blocked conditions.
- `docs/planning-artifacts/v2/implementation-order.en.md`: v2 implementation order and commit units.
- `docs/planning-artifacts/v2/prerequisites.en.md`: v2 prerequisites and stop conditions.
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
