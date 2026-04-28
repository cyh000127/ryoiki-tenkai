# v2 Technology Stack Decision Record

This document records the technology boundaries kept or selected in v2. The stack already selected in v1 remains in place, the recognition runtime and operation topology decisions are fixed as done, and the skill domain source remains blocked until approval.

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

## v2 Selection Status

| Area | Status | Conditions Before Decision |
| --- | --- | --- |
| Concrete frame recognizer runtime | done | The browser frame signal runtime is connected as the default live recognizer runtime. No external runtime dependency was added. |
| Skill domain source format | blocked | Approve skill id/name/effect/cost/cooldown/gesture/resource/version format. |
| Production storage topology | done | SQL migration smoke, failure policy, and audit retention boundaries are documented, and the compose dependency startup boundary is fixed. |
| Real two-player matchmaking policy | done | Queue pairing, reconnect latest snapshot recovery, delayed/duplicate reconciliation, and timeout/surrender fanout hardening are complete. |

## Completed Storage Topology Baseline

- Local host execution starts the SQL database and cache through `scripts/dev-deps.ps1` before applying migrations.
- Full container execution uses `docker compose up --build`; the API starts after database health checks and migrations pass.
- Direct backend execution on the host uses a localhost database URL instead of the compose-container database host.
- The JSON development adapter and SQL adapter remain behind the same storage protocol.
- SQL migration apply/reset/rollback smoke steps and the storage failure/fallback policy are recorded in separate implementation artifacts.

## Completed Recognition Runtime Baseline

- The default live recognizer runtime is the browser frame signal runtime.
- Canvas downsampling converts frame contrast/motion into a scalar signal, and raw frames do not leave the local boundary.
- The runtime returns `recognized` only when the expected token remains stable for the configured window.
- It returns `no_hand` when frame signal is missing or low, and `unstable` while the signal is not stable enough.
- The existing no-op runtime remains available only for explicit fallback or tests.
- The implementation record is `docs/implementation-artifacts/v2-12-browser-frame-signal-runtime.en.md`.

## Recognition Runtime Replacement Criteria

When replacing the current recognizer runtime, verify the following.

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

- Record the selection reason and fallback here before adding a new runtime dependency, and compare the benefit and risk against the current browser frame signal runtime.
- Add smoke or unit tests when a dependency changes browser permission, camera stream, storage migration, or socket behavior.
- Include lock file changes only when an actual dependency is added.
- Do not put unapproved external provider or service names in docs or user-facing copy.
