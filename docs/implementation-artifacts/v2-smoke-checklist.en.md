# v2 Smoke Checklist

Use this document for local v2 handoff verification. Skill names, skill effects, hand-motion resources, and visual assets are blocked until a separate domain source is approved; they are not verification targets yet.

## Snapshot

- Created on: `2026-04-28`
- Baseline branch: `main`
- Source documents:
  - `docs/planning-artifacts/v2/epics.en.md`
  - `docs/planning-artifacts/v2/stories.en.md`
  - `docs/planning-artifacts/v2/implementation-order.en.md`
  - `docs/planning-artifacts/v2/prerequisites.en.md`
  - `docs/planning-artifacts/v2/technology-stack.en.md`
- Related v1 checklist: `docs/implementation-artifacts/smoke-test-checklist.en.md`

## Status Legend

- `[x]`: verifiable with current implementation or documentation.
- `[ ]`: planned v2 item with implementation or verification still remaining.
- `Blocked`: do not execute until the prerequisite decision or domain source exists.

## Baseline Checks by Change Type

### Docs-only Changes

- [x] `git diff --check`
- [x] provider-neutral targeted text scan
- [x] README, implementation record, and planning doc links are current.

### Frontend Changes

- [ ] `pnpm --dir FE/app typecheck`
- [ ] `pnpm --dir FE/app test`
- [ ] `pnpm --dir FE/app smoke:camera`
- [ ] `pnpm --dir FE/app build`
- [ ] Camera state, hand state, local sequence state, and server confirmation state remain separate.

### Backend Changes

- [ ] `uv run ruff check BE`
- [ ] `uv run pytest BE`
- [ ] Contract tests are checked when REST or socket payloads change.
- [ ] State-mutating commands keep stable action/request ids.

### Storage Changes

- [x] Storage adapter unit tests cover JSON, SQL, and null adapter paths.
  - Evidence: `BE/api/tests/unit/test_game_state_storage.py`
- [x] Profile, history, rating, and compact audit survive repository reload.
  - Evidence: `BE/api/tests/unit/test_game_flow_api.py`
- [x] SQL migration apply/reset or rollback smoke steps are run, or a blocker is recorded.
  - Evidence: `docs/implementation-artifacts/v2-sql-migration-smoke.en.md`, `scripts/storage-migration-smoke.ps1`
- [x] Storage failure policy does not allow silent data loss.
  - Evidence: `docs/implementation-artifacts/v2-storage-failure-policy.en.md`

### Match/Socket Changes

- [ ] Two-player queue pairing smoke or backend socket tests run.
- [ ] Reconnect preserves the latest snapshot.
- [ ] Delayed/duplicate events do not roll the UI back to stale state.
- [ ] Timeout/surrender/ended event ordering is stable.

## v2 Recognition Runtime

- [x] The live recognizer adapter boundary is connected to the battle input boundary.
  - Evidence: `docs/implementation-artifacts/v2-1-live-recognizer-adapter.en.md`
- [x] Camera permission allowed/denied smoke command exists.
  - Evidence: `docs/implementation-artifacts/v2-2-camera-permission-smoke.en.md`
- [x] Denied permission does not enter action submission.
  - Evidence: `pnpm --dir FE/app smoke:camera`
- [ ] No-hand, unstable-hand, and recognized-token states are visually separated.
  - Planned story: `V2-E1-ST03`
- [ ] Stop/start/unmount cleanup and permission recovery are locked by regression tests.
  - Planned story: `V2-E1-ST04`
- Blocked: concrete frame recognizer adapter lifecycle smoke.
  - Blocker: recognizer runtime selection is not approved yet.
  - Related story: `V2-E1-ST02`

## v2 Persistence

- [x] Result, history, rating, and compact audit persistence sit behind the storage adapter boundary.
  - Evidence: `docs/implementation-artifacts/v2-3-storage-adapter-persistence.en.md`
- [x] Backend unit tests verify JSON, SQL, and null adapter behavior.
  - Evidence: `BE/api/tests/unit/test_game_state_storage.py`
- [x] SQL migration apply/reset or rollback smoke steps are documented.
  - Evidence: `docs/implementation-artifacts/v2-sql-migration-smoke.en.md`
- [x] Storage adapter failure modes and fallback policy are documented.
  - Evidence: `docs/implementation-artifacts/v2-storage-failure-policy.en.md`
- [x] Compact audit retention boundaries are documented.
  - Evidence: `docs/implementation-artifacts/v2-audit-retention-boundary.en.md`

## v2 Real Match Flow

- [ ] Two-player queue pairing rules are verified separately from the practice-rival path.
  - Planned story: `V2-E3-ST01`
- [ ] Both players receive the same battle id, opposite seats, and the same turn state.
  - Planned story: `V2-E3-ST01`
- [ ] Reconnect restores the latest snapshot in a two-player battle.
  - Planned story: `V2-E3-ST02`
- [ ] Delayed/duplicate event reconciliation regression tests are expanded.
  - Planned story: `V2-E3-ST03`
- [ ] Timeout watcher and surrender event fanout include disconnected-player paths.
  - Planned story: `V2-E3-ST04`

## Skill and Resource Intake

- Blocked: define the skill domain source format.
  - Blocker: approved domain source does not exist yet.
  - Related story: `V2-E4-ST01`
- Blocked: migrate the approved skill catalog fixture.
  - Blocker: source format and approved catalog are required first.
  - Related story: `V2-E4-ST02`
- Blocked: extend the skill/resource metadata API contract.
  - Blocker: skill id/name/effect/cost/cooldown/gesture/resource/version format is required.
  - Related story: `V2-E4-ST03`
- Blocked: connect frontend loadout/resource rendering.
  - Blocker: approved fixture and API contract are required first.
  - Related story: `V2-E4-ST04`

## Release Handoff

- [x] v2 planning baseline exists in Korean and English.
  - Evidence: `docs/implementation-artifacts/v2-planning-baseline.en.md`
- [x] v2 smoke checklist exists in Korean and English.
  - Evidence: this document and `docs/implementation-artifacts/v2-smoke-checklist.ko.md`
- [x] v2 release readiness document separates completed, deferred, and blocked scope.
  - Evidence: `docs/implementation-artifacts/v2-release-readiness.en.md`
- [x] Provider-neutral text scan result is recorded in the handoff note or readiness document.
  - Evidence: `docs/implementation-artifacts/v2-release-readiness.en.md`

## Minimum Handoff Commands

Docs-only changes:

```powershell
git diff --check
```

Run the repository-approved provider-neutral targeted text scan and confirm that there are no matches outside ignored files.

v2 handoff with FE/BE changes:

```powershell
uv run ruff check BE
uv run pytest BE
pnpm --dir FE/app typecheck
pnpm --dir FE/app test
pnpm --dir FE/app smoke:camera
pnpm --dir FE/app build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\check-boundaries.ps1
docker compose -f docker-compose.yml config --quiet
git diff --check
```
