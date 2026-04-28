# v2 Technology Stack Decision Record

This document records the technology boundaries to keep or choose in v2. The stack already selected in v1 remains in place, and unselected runtimes are marked as blocked or planned.

## Stack We Keep

| Area | Choice | v2 Policy |
| --- | --- | --- |
| Frontend language | TypeScript | Keep type safety for battle state, socket events, and gesture tokens. |
| Frontend runtime | React + Vite | Keep the current workspace and test setup. |
| Frontend data fetching | Query/cache based client adapter | Keep using it for REST catalog, profile, history, and leaderboard flows. |
| Backend language | Python 3.13+ | Keep the existing API, repository, and test stack. |
| Backend API | ASGI-based REST/WebSocket app | Keep REST and socket event contracts separate. |
| Validation | Pydantic schemas | Keep camelCase wire contracts and domain model conversion. |
| Persistence | SQLAlchemy/Alembic + storage adapter | Keep JSON development adapter and SQL adapter behind one protocol. |
| API contract | OpenAPI + JSON Schema + shared catalog fixture | Update contracts before FE/BE behavior changes. |
| Frontend tests | Vitest + component tests + browser smoke | Run unit/component/smoke checks according to affected scope. |
| Backend tests | pytest + ruff | Continue covering rule paths, storage adapter, and socket flow. |

## v2 Pending Choices

| Area | Status | Conditions Before Decision |
| --- | --- | --- |
| Concrete frame recognizer runtime | blocked | Compare browser support, lifecycle cleanup, bundle impact, and local smoke feasibility. |
| Skill domain source format | blocked | Approve skill id/name/effect/cost/cooldown/gesture/resource/version format. |
| Production storage topology | planned | Document SQL migration smoke and failure policy. |
| Real two-player matchmaking policy | partial | Queue pairing and reconnect latest snapshot recovery are complete; broader event reconciliation and fanout hardening remain. |

## Recognition Runtime Selection Criteria

When choosing the concrete recognizer runtime, verify the following.

- It can run in the browser.
- It allows explicit camera stream lifecycle control.
- The adapter can normalize token, confidence, stability, and reason.
- It does not send raw frames or raw tracking streams to the backend.
- Allowed/denied/error paths can be verified through unit tests or a smoke fixture.
- Product copy must not depend on a specific external provider name.

## Skill/Resource Selection Criteria

Skill implementation is a domain-specification issue, not only a technology choice. Do not implement it without:

- approved skill domain source.
- mapping between gesture token and skill effect.
- resource key naming rule.
- missing resource fallback.
- contract migration plan.
- FE/BE cross-stack fixture test plan.

## Dependency Addition Rules

- Record the selection reason and fallback here before adding a new runtime dependency.
- Add smoke or unit tests when a dependency changes browser permission, camera stream, storage migration, or socket behavior.
- Include lock file changes only when an actual dependency is added.
- Do not put unapproved external provider or service names in docs or user-facing copy.
