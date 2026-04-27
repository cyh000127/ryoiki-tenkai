# Gesture Skill Workspace

This repository is a neutral scaffold for a browser-based hand gesture control surface and a backend command runtime.

Korean documentation is available in `README.ko.md`.

## Boundaries

- `FE/app`: browser app, route shell, gesture control UI, generated API client boundary.
- `BE/api`: canonical write owner for command, session, mapping, and audit state.
- `BE/core`: shared domain value objects and pure rules.
- `BE/worker`: delayed or asynchronous processing that does not bypass API write ownership.
- `BE/api/contracts`: canonical wire contract source.
- `scripts`: repository-owned setup and verification entrypoints.
- `infra/runtime`: local runtime topology notes.
- `ops`: operational configuration placeholders.

## Local Entry Points

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\bootstrap.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\check-boundaries.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\backend-check.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\frontend-check.ps1
```

Use `-InstallDependencies` with `scripts\bootstrap.ps1` only when the local package tools are already installed.

## Terminology

- `skillset`: a server-approved combat preset that includes gesture sequences, costs, cooldowns, and related battle rules.
- `animset`: a server-approved visual presentation preset selected by the player.
- `loadout`: the saved `skillset + animset` combination required before queue entry.

## MVP Planning and QA

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
