# v1 Release Readiness

This document records the final readiness decision for the v1 release.

## Decision

- Decision date: `2026-04-28`
- Decision: v1 functional MVP is release-ready
- Release blockers: none
- Baseline branch: `main`

## Evidence

- All 28 MVP v1 stories are marked `done`.
- The core playable loop is implemented.
  player entry -> loadout -> queue -> WebSocket handoff -> battle -> result -> history/rating -> storage adapter persistence
- Backend and frontend tests cover the critical success and failure paths.
- Server-authoritative battle rules cover action validation, exact-once mutation, rejection, timeout, surrender, and battle end.
- The frontend renders pending, rejected, confirmed, timeout, surrender, result, reconnect, and history/rating states.
- The shared gesture token fixture and cross-stack contract tests lock the default skill sequences.

## Release Gate

| Item | Status | Evidence |
| --- | --- | --- |
| Story coverage | PASS | `docs/planning-artifacts/mvp-v1/stories.en.md` reports `done 28`, `partial 0`, `planned 0` |
| Backend lint | PASS | `uv run ruff check BE` |
| Backend tests | PASS | `uv run pytest BE` |
| Frontend typecheck | PASS | `pnpm --dir FE/app typecheck` |
| Frontend tests | PASS | `pnpm --dir FE/app test` |
| Frontend build | PASS | `pnpm --dir FE/app build` |
| Boundary check | PASS | `scripts\check-boundaries.ps1` |
| Runtime config | PASS | `docker compose -f docker-compose.yml config --quiet` |
| Whitespace check | PASS | `git diff --check` |
| Provider-neutral docs scan | PASS | targeted repository scan |

## v1 Release Scope

- Lightweight guest identity create/restore.
- Profile lookup.
- `skillset` / `animset` catalogs.
- `loadout` save and queue-entry guard.
- Ranked 1v1 queue enter/cancel/status.
- WebSocket token authentication and battle handoff.
- Practice-rival playable battle loop.
- Server-authoritative skill action validation and mutation.
- Invalid, duplicate, out-of-turn, insufficient mana, and cooldown rejection.
- `HP_ZERO`, `TIMEOUT`, and `SURRENDER` battle end.
- Reconnect snapshot restore.
- Delayed and duplicate socket event reconciliation.
- Result, history, rating, and leaderboard views.
- Runtime-store result/history/rating persistence.
- Deterministic local smoke path through debug fallback input.

## Intentionally Deferred From v1

These items are not v1 release blockers and should be handled in v2 or follow-up work.

- Full live hand-recognition package and adapter integration.
- Automated real-device browser camera permission QA.
- Final skill names, skill images, and hand-motion assets.
- Production persistence through the relational storage adapter.
- More advanced real-player matchmaking operations.
- Deployment, observability, and operations automation.

## Post-Release Priorities

1. [x] Connect the live recognizer adapter to the current normalized gesture input boundary.
   - Implementation record: `docs/implementation-artifacts/v2-1-live-recognizer-adapter.en.md`
2. [x] Automate real-device browser camera smoke scenarios.
   - Implementation record: `docs/implementation-artifacts/v2-2-camera-permission-smoke.en.md`
3. [x] Replace runtime-store persistence with the formal storage adapter.
   - Implementation record: `docs/implementation-artifacts/v2-3-storage-adapter-persistence.en.md`
4. [ ] Replace skill names, visual assets, and hand-motion resources from the separate source.
   - Deferred reason: do not invent implementation before the separate skill domain source is approved.
5. [x] Draft the v2 planning documents.
   - Implementation record: `docs/implementation-artifacts/v2-planning-baseline.en.md`
6. [x] Refresh the v2 smoke checklist.
   - Implementation record: `docs/implementation-artifacts/v2-smoke-checklist.en.md`
7. [x] Re-check v2 release readiness.
   - Implementation record: `docs/implementation-artifacts/v2-release-readiness.en.md`
8. [x] Record the provider-neutral scan result in the readiness document.
   - Implementation record: `docs/implementation-artifacts/v2-release-readiness.en.md`
9. [x] Document the SQL migration smoke procedure.
   - Implementation record: `docs/implementation-artifacts/v2-sql-migration-smoke.en.md`
