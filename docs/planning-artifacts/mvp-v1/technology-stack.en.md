# MVP v1 Technology Stack

This document is the technology-stack decision record for MVP v1. It should be updated before implementation work introduces a new runtime, framework, database, queue, recognition package, or test tool.

## Decision Principles

- Prefer the repository's current stack unless a missing capability blocks an MVP story.
- Keep battle state server-authoritative; client recognition is input evidence only.
- Keep raw camera frames and raw tracking streams on the client.
- Keep external infrastructure vendor-neutral for MVP local development.
- Keep the stack small enough for local smoke tests and parallel FE, BE, input-runtime, and QA work.
- Add new dependencies only behind a clear boundary and with at least one focused test.

## Confirmed Stack

| Area | Choice | Reason |
| --- | --- | --- |
| Frontend language | TypeScript | Strong contracts for battle events, gesture tokens, and UI state transitions. |
| Frontend runtime | React | Current app scaffold already uses it and it is sufficient for interactive battle UI. |
| Frontend build tool | Vite | Current development and production scripts already use it. |
| Frontend routing | React Router | Current route shell already depends on it. |
| Server-state client | React Query | Fits REST setup flows, profile lookup, catalogs, history, and rating reads. |
| Client state | Feature-level reducers and pure state machines | Keeps battle flow and gesture sequence logic testable without adding a global state framework. |
| Styling | Plain CSS with repository theme primitives | Current UI is small; avoid adding a component framework before interaction patterns stabilize. |
| Input recognition boundary | Browser camera input plus a client-side hand-landmark adapter | Keeps camera data local and allows the concrete recognition package to be swapped behind one adapter. |
| Gesture interpretation | TypeScript sequence state machine | Already implemented and unit-tested; handles stability, debounce, timeout, reset, and failure reasons. |
| Backend language | Python 3.13 | Current workspace and lint configuration target this version. |
| Backend web runtime | FastAPI on ASGI | Current API scaffold supports REST and WebSocket in one process for MVP. |
| Backend schema validation | Pydantic models | Current API schemas and settings use this model family. |
| Backend domain structure | API package plus pure core package | Preserves write ownership in the API while keeping pure rules reusable. |
| Relational storage | PostgreSQL-compatible SQL database | Required for player, loadout, battle result, rating, and history persistence. |
| Database access | SQLAlchemy with Alembic migrations | Current scaffold already has models, session boundary, and migration setup. |
| Cache and queue support | Redis-compatible key-value cache | Good fit for queue membership, short-lived socket/session state, and idempotency keys when persistence is not required. |
| API contracts | OpenAPI for REST and JSON Schema for async events | Current contract directories already use these formats. |
| Realtime channel | WebSocket | Required for matchmaking and battle events without polling-only behavior. |
| Backend package manager | uv workspace | Current Python workspace is configured around it. |
| Frontend package manager | pnpm workspace | Current frontend scripts and lockfile use it. |
| Local runtime | Container compose | Current local topology starts web, API, database, and cache services together. |
| Backend tests | pytest, httpx, ruff | Current backend checks already use this path. |
| Frontend tests | Vitest, Testing Library, jsdom, TypeScript check | Current frontend checks already use this path. |

## Input Runtime Decision

The MVP should not couple UI or battle logic directly to a specific hand-recognition package. Instead, implement the live recognizer behind this boundary:

- The adapter reads browser camera input.
- The adapter emits normalized gesture observations:
  - `token`
  - `confidence`
  - `stability_ms`
  - `hand_detected`
  - `reason`
- The sequence state machine consumes normalized observations only.
- The battle submission layer receives completed gesture token sequences only.
- Fallback input remains available for smoke tests and local debugging.

This keeps the implementation aligned with the MVP rule that raw camera frames and raw tracking streams stay client-side.

## Backend Runtime Decision

Use one API process for MVP REST and WebSocket behavior. Split into additional runtimes only when there is a measured need.

### API Process Owns

- Player and profile commands.
- Loadout validation.
- Queue commands.
- WebSocket authentication and event dispatch.
- Battle action validation and mutation.
- Result, rating, and history writes.

### Worker Package Owns

- Delayed or asynchronous processing that does not bypass API write ownership.
- Follow-up jobs after the API has already committed authoritative state.

The worker package should not become a second battle-state writer in MVP v1.

## Persistence Decision

Use relational storage for durable state:

- player profile.
- loadout.
- battle session.
- battle result.
- compact action audit.
- rating.
- match history.

Use cache storage for short-lived operational state:

- queue membership.
- socket presence.
- temporary idempotency keys.
- heartbeat or reconnect metadata.

If a value must survive process restart as product state, it belongs in relational storage.

## Frontend Architecture Decision

Keep the current layered frontend shape:

- `app`: providers and app-level composition.
- `router`: route definitions.
- `pages`: route-level screens.
- `widgets`: larger UI surfaces such as the battle workspace.
- `features`: state machines and user-flow logic.
- `entities`: shared domain models.
- `platform`: API client, theme, localization, and reusable UI primitives.
- `generated`: generated API client boundary.

Do not add a new frontend architecture layer unless a story requires a repeated pattern that cannot be kept local.

## Testing Strategy

### Required Before Story Handoff

- Backend rule tests for every accepted or rejected battle action path.
- Frontend state-machine tests for gesture and battle-flow transitions.
- Component tests for pending, accepted, rejected, opponent-turn, and ended battle states.
- Contract tests when REST or async payloads change.
- Local smoke checklist update when a user-visible path changes.

### Required Before MVP Handoff

- Backend checks pass.
- Frontend typecheck, tests, and build pass.
- Container compose configuration validates.
- A deterministic fallback-input path can complete one valid action submission.
- One invalid action path is verified without server state mutation.

## Deferred Choices

These are intentionally not part of the MVP stack:

- Server-side camera frame processing.
- Live media transport between players.
- A separate realtime gateway process.
- A general-purpose message broker.
- A full account and identity platform.
- A frontend component framework.
- A server-rendered frontend framework.
- A mobile-native runtime.
- Advanced 3D rendering.
- Production observability platform.

## Dependency Introduction Rules

Before adding a dependency, confirm:

- The target story cannot be completed with the current stack.
- The dependency is isolated behind a repository-owned interface.
- The package does not require sending raw camera frames or raw tracking streams to the backend.
- The dependency can run in local development without external managed infrastructure.
- At least one unit, component, or contract test covers the integration point.
- README or planning docs are updated if setup or verification changes.

## Version Policy

- Keep current major versions unless a specific story requires an upgrade.
- Upgrade one runtime family per commit.
- Run the related package checks after an upgrade.
- Do not mix dependency upgrades with battle-rule changes unless the upgrade is required for that rule.

## Epic Mapping

| Epic | Primary Stack Areas |
| --- | --- |
| E1 Player Entry and Loadout | FastAPI, Pydantic, SQLAlchemy, React, React Query |
| E2 Matchmaking and Session Handoff | FastAPI, WebSocket, cache, React, feature reducers |
| E3 Server-Authoritative Battle Engine | Python domain rules, SQLAlchemy, WebSocket events, pytest |
| E4 Client Gesture Input Runtime | Browser camera adapter, TypeScript state machine, Vitest |
| E5 Battle Workspace UI | React, Router, feature reducers, CSS theme primitives |
| E6 Rating, History, and Leaderboard | Relational storage, SQLAlchemy, React Query |
| E7 Local Verification and Handoff | uv, pnpm, pytest, Vitest, ruff, container compose |
