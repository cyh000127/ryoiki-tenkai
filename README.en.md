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
- The v2 two-player queue pairing rule is hardened.
- The v2 socket reconnect latest snapshot resync is hardened.
- The v2 delayed/duplicate event reconciliation is hardened.
- The v2 timeout/surrender fanout hardening is complete.
- The v2 recognizer lifecycle hardening is complete.
- The v2 recognizer runtime port boundary is separated.
- The v2 recognizer runtime port smoke is hardened.
- The v2 browser frame signal runtime binding is complete.
- The v3 planning baseline is written.
- The v3 handoff verification script is written.
- The v3 runtime health summary is reflected in the backend health response.
- The v3 smoke checklist is written.
- The v3 release readiness checkpoint is written.
- The v4 Japanese voice startup command plan and implementation record are written.
- The v4 Japanese voice startup command is connected to the home screen.
- The v4 STT module boundary is separated as a shared transcript recognizer port.
- The v4 character, skill, and STT candidate catalog is written.
- The v4 Phase 1 Jujutsu character, technique, and STT catalog is written.
- Skill names, skill effects, hand-motion resources, and visual assets will proceed only after a separate domain source is approved.
- Final release readiness document: `docs/implementation-artifacts/v1-release-readiness.en.md`
- v2-1 implementation record: `docs/implementation-artifacts/v2-1-live-recognizer-adapter.en.md`
- v2-12 implementation record: `docs/implementation-artifacts/v2-12-browser-frame-signal-runtime.en.md`
- v2 planning baseline: `docs/implementation-artifacts/v2-planning-baseline.en.md`
- v2 release readiness checkpoint: `docs/implementation-artifacts/v2-release-readiness.en.md`
- v3 handoff verification record: `docs/implementation-artifacts/v3-1-handoff-check.en.md`
- v3 runtime health summary record: `docs/implementation-artifacts/v3-2-health-runtime-summary.en.md`
- v3 smoke checklist: `docs/implementation-artifacts/v3-smoke-checklist.en.md`
- v3 release readiness checkpoint: `docs/implementation-artifacts/v3-release-readiness.en.md`
- v4 Japanese voice startup command record: `docs/implementation-artifacts/v4-1-japanese-stt-startup-command.en.md`
- v4 STT module boundary record: `docs/implementation-artifacts/v4-2-stt-module-boundary.en.md`
- v4 character, skill, and STT intake record: `docs/implementation-artifacts/v4-3-character-skill-stt-intake.en.md`
- v4 Phase 1 Jujutsu catalog: `docs/product/jujutsu-character-skill-stt-catalog.en.md`

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
- ranked queue pairing for two players with opposite-seat battle handoff
- WebSocket auth and `battle.match_ready` / `battle.match_found` / `battle.started` handoff
- server-authoritative battle action validation and state mutation
- automatic practice rival turns
- `HP_ZERO`, `TIMEOUT`, and `SURRENDER` resolution with result screen rendering
- latest turn/hp/mana/cooldown snapshot recovery after two-player reconnect
- delayed/duplicate socket event reconciliation
- timeout/surrender final-state fanout and disconnected participant replay
- live camera adapter start/stop/status display and recognized-token dispatch through the normalized input boundary
- live camera adapter runtime session port separated
- default browser frame signal runtime connected to the live camera adapter
- camera permission smoke verifies runtime port start/stop
- no-hand, unstable-hand, and recognized-token live camera UI states separated
- v3 epics, stories, implementation order, prerequisites, and technology stack documented
- v3 handoff check fast/full modes and plan-only verification path documented
- backend `/healthz` safe runtime summary reflected in contract/tests
- v3 smoke checklist and release readiness checkpoint documented
- Japanese voice startup command home-screen panel, status rendering, and manual fallback
- Shared STT transcript recognizer port separated from startup command matching
- Original character, skill, and STT trigger candidate catalog documented
- Phase 1 Jujutsu character, technique, and STT trigger candidate catalog documented
- result/history/rating persistence moved behind the storage adapter boundary
- v2 epics, stories, implementation order, prerequisites, and technology stack documented
- v2 camera/runtime/storage/matching smoke checklist documented
- v2 release readiness checkpoint documented
- SQL migration apply/reset/rollback smoke procedure documented
- storage failure/fallback policy documented, with corrupted JSON state rejection
- compact audit retention boundary documented, including raw recognition data exclusion rules
- no-hand, unstable-hand, and recognized-token UI states separated
- two-player queue pairing separated from the practice path

## Run Locally

### Prerequisites

- `uv`
- `pnpm`
- Python `3.13+`
- Node.js
- Docker Compose

### Install

```bash
uv sync
pnpm --dir FE/app install
cp FE/app/.env.example FE/app/.env
```

`FE/app/.env` is optional when the default backend URL `http://localhost:8000` is used.

### Local Dependencies

When running the backend and frontend directly on the host, start the SQL database and cache with compose first. This command starts `db` and `cache`, then applies SQL migrations.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\dev-deps.ps1
```

To start the whole runtime in containers, use this command. `api` starts after the DB health check and migration finish.

```bash
docker compose up --build
```

Do not copy `BE/api/.env.example` directly to `BE/api/.env` when running the backend on the host. Its database host is the compose container host `db`. Host-run backend uses the default `localhost:5432` setting or an explicit `DATABASE_URL=postgresql+psycopg://app:app@localhost:5432/gesture_skill`.

Opening a `POST`-only API directly in a browser can return `405 Method Not Allowed`. For example, queue enter is `POST /api/v1/matchmaking/queue`.

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
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\dev-deps.ps1 -PlanOnly
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\check-boundaries.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\backend-check.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\frontend-check.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode fast
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode full
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
- two-player queue pairing rule and socket handoff are covered by regression tests
- socket reconnect latest snapshot recovery and ended replay result recovery are covered by regression tests
- timeout/surrender fanout and disconnected participant replay are covered by regression tests
- recognizer stop/start, permission recovery, and unmount cleanup are covered by regression tests
- recognizer runtime session start/stop and startup failure cleanup are covered by regression tests
- camera permission smoke verifies the fake runtime port lifecycle
- browser frame signal runtime stability and recognition reset are covered by regression tests
- v3 planning baseline is written while blocked domain scope is preserved
- v3 handoff verification automation has fast/full modes and a plan-only path
- backend health response has a safe runtime summary with contract regression coverage
- v3 smoke checklist and release readiness are documented
- Japanese voice startup command model, home-screen panel, and manual fallback regression tests
- Shared STT module and startup command model regression tests
- Character/skill/STT candidates and future hand-shape implementation plan documented
- Jujutsu Phase 1 catalog and future hand-shape implementation plan documented

## Remaining Work

- no v1 release blockers
- no v3 release blockers
- v2 or follow-up scope
  skill/resource implementation after the skill domain source is approved

## MVP Planning and QA

- `docs/implementation-artifacts/mvp-v1-spec-review.en.md`: spec review snapshot that compares current implementation against the MVP stories.
- `docs/implementation-artifacts/v1-release-readiness.en.md`: v1 release readiness decision and verification evidence.
- `docs/implementation-artifacts/v2-1-live-recognizer-adapter.en.md`: live recognizer adapter integration record.
- `docs/implementation-artifacts/v2-2-camera-permission-smoke.en.md`: camera permission smoke automation record.
- `docs/implementation-artifacts/v2-4-recognition-ui-state.en.md`: recognition UI state hardening record.
- `docs/implementation-artifacts/v2-5-two-player-queue-pairing.en.md`: two-player queue pairing record.
- `docs/implementation-artifacts/v2-6-socket-reconnect-resync.en.md`: socket reconnect resync record.
- `docs/implementation-artifacts/v2-7-delayed-duplicate-event-reconciliation.en.md`: delayed/duplicate event reconciliation record.
- `docs/implementation-artifacts/v2-8-timeout-surrender-fanout.en.md`: timeout/surrender fanout record.
- `docs/implementation-artifacts/v2-9-recognizer-lifecycle-hardening.en.md`: recognizer lifecycle hardening record.
- `docs/implementation-artifacts/v2-10-recognizer-runtime-port.en.md`: recognizer runtime port record.
- `docs/implementation-artifacts/v2-11-recognizer-runtime-port-smoke.en.md`: recognizer runtime port smoke record.
- `docs/implementation-artifacts/v2-12-browser-frame-signal-runtime.en.md`: browser frame signal runtime record.
- `docs/implementation-artifacts/v2-3-storage-adapter-persistence.en.md`: storage adapter persistence record.
- `docs/implementation-artifacts/v3-planning-baseline.en.md`: v3 planning baseline record.
- `docs/implementation-artifacts/v3-1-handoff-check.en.md`: v3 handoff verification script record.
- `docs/implementation-artifacts/v3-2-health-runtime-summary.en.md`: safe runtime health summary record.
- `docs/implementation-artifacts/v3-smoke-checklist.en.md`: v3 smoke checklist and blocked carryover.
- `docs/implementation-artifacts/v3-release-readiness.en.md`: v3 checkpoint decision and full feature release blockers.
- `docs/implementation-artifacts/v4-1-japanese-stt-startup-command.en.md`: Japanese voice startup command implementation record.
- `docs/implementation-artifacts/v4-2-stt-module-boundary.en.md`: shared STT module boundary implementation record.
- `docs/implementation-artifacts/v4-3-character-skill-stt-intake.en.md`: character, skill, and STT candidate intake record.
- `docs/product/jujutsu-character-skill-stt-catalog.en.md`: Phase 1 Jujutsu character, technique, and STT trigger candidate catalog.
- `docs/product/character-skill-stt-catalog.en.md`: original character, skill, and STT trigger candidate catalog.
- `docs/planning-artifacts/v4/technology-stack.en.md`: v4 voice startup technology decision.
- `docs/planning-artifacts/v4/epics.en.md`: v4 epics, boundaries, and acceptance signals.
- `docs/planning-artifacts/v4/stories.en.md`: v4 story status and verification criteria.
- `docs/planning-artifacts/v4/implementation-order.en.md`: v4 implementation order and commit unit.
- `docs/planning-artifacts/v4/prerequisites.en.md`: v4 prerequisites and stop conditions.
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
- `docs/planning-artifacts/v3/technology-stack.en.md`: v3 technology keep/defer decisions.
- `docs/planning-artifacts/v3/epics.en.md`: v3 epics, boundaries, and acceptance signals.
- `docs/planning-artifacts/v3/stories.en.md`: v3 story status and blocked conditions.
- `docs/planning-artifacts/v3/implementation-order.en.md`: v3 implementation order and commit units.
- `docs/planning-artifacts/v3/prerequisites.en.md`: v3 prerequisites and stop conditions.
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
