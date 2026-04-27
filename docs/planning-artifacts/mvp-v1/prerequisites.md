# MVP v1 Prerequisites

This document lists the conditions that should be true before starting or merging each major implementation area.

## Global Prerequisites

- Repository bootstrap command runs from the repository root.
- Backend and frontend check scripts are available and documented.
- `technology-stack.md` is reviewed before adding a new runtime, framework, database, queue, recognition package, or test tool.
- Ownership boundaries are clear:
  - `BE/api` owns API contracts, request handling, battle state writes, and persistence-facing services.
  - `BE/core` owns pure domain rules and value objects.
  - `BE/worker` owns asynchronous processing that does not bypass API write ownership.
  - `FE/app` owns routes, UI, client state, recognition adapters, and socket consumers.
  - `docs` owns planning, verification, and handoff artifacts.
- Planning docs avoid external provider or product-specific names unless explicitly approved.
- Raw camera frames and raw tracking streams are not sent to the backend.

## Product Prerequisites

- MVP scope is limited to browser-based, turn-based 1v1 battle.
- Server remains authoritative for battle state, turn progression, action validation, timeout, surrender, result, rating, and history.
- Client recognition success is only local input evidence, not a final skill activation.
- MVP excludes live media transport between players, spectator mode, social systems, advanced replay, and production account recovery.

## Contract Prerequisites

- Standard response and error shapes are defined before FE consumers depend on them.
- REST contracts exist for:
  - Player create or restore.
  - Profile lookup.
  - Skillset catalog.
  - Presentation-set catalog.
  - Loadout update.
  - Queue enter, cancel, and status.
  - Battle snapshot lookup.
  - Surrender.
  - History.
  - Rating or leaderboard.
- Socket contracts exist for:
  - Connection authentication.
  - Ping or heartbeat.
  - Match-found.
  - Battle-started.
  - Action submission.
  - Action accepted.
  - Action rejected.
  - State updated.
  - Timeout.
  - Surrendered.
  - Battle ended.
- Every state-mutating command includes a stable command or action identifier.

## Backend Prerequisites

- Player identity model exists before queue or battle session ownership is implemented.
- Loadout validation exists before queue entry accepts a player.
- Skill cost, cooldown, damage, and gesture sequence metadata exist before battle action validation.
- Socket token validation exists before battle events are emitted to a client.
- Idempotency strategy exists before accepted action mutation is implemented.
- Battle result storage exists before rating and history features are considered complete.
- Timeout and surrender rules are documented before they are implemented.

## Frontend Prerequisites

- Route shell and application state boundaries exist before adding battle screens.
- Locale or copy catalog is updated before user-visible strings are added.
- Server event reducer or adapter exists before battle UI depends on socket events.
- Input controls are disabled unless the client is in an actionable state.
- Debug controls are separated from the normal play surface.
- Compact and desktop layouts are checked for text overflow and overlapping UI.

## Gesture Runtime Prerequisites

- MVP gesture token names are defined and stable.
- At least three skill sequences are available for smoke testing.
- Sequence state machine exposes:
  - idle or waiting state.
  - progress state.
  - complete state.
  - failed state.
  - timeout state.
  - reset behavior.
- Recognition adapter normalizes raw recognition output into token, confidence, and stability metadata.
- Deterministic fallback input exists before end-to-end smoke tests depend on live hand input.

## Persistence Prerequisites

- Storage boundary is selected for local MVP development.
- Battle session record shape is known before match creation writes sessions.
- Result record shape is known before battle end is implemented.
- Rating update must be idempotent before completed results can be replayed or re-read.
- History records store compact action metadata only.

## QA Prerequisites

- Backend rule paths have unit tests before UI behavior is treated as reliable.
- Frontend reducers or components have tests for pending, accepted, rejected, opponent-turn, and ended states.
- Socket authentication has valid and invalid token tests.
- Smoke checklist is updated whenever a new user-visible MVP path appears.
- A targeted provider-name scan is run before handoff.

## Merge Readiness Prerequisites

Before merging a story, confirm:

- The story has a linked epic and acceptance criteria.
- Automated tests cover the main success path and at least one meaningful failure path.
- README or docs are updated when setup, verification, or behavior changes.
- The change does not introduce raw camera or raw tracking uploads.
- The change does not promise deferred MVP exclusions.
- Local checks pass or blockers are documented in the handoff notes.

## Blockers That Should Stop Implementation

- No agreed battle state contract for the feature being implemented.
- No way to verify the feature locally.
- A frontend feature would require backend behavior that is not defined yet.
- A backend feature would require accepting raw client recognition data that should remain local.
- A story depends on rating, history, timeout, or reconnect behavior before its prerequisite stories are complete.
