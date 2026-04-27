# MVP v1 Implementation and Verification Plan

This document records the MVP implementation baseline derived from the v1 product and engineering plan. It is intentionally scoped to repository planning and QA checks so FE, BE, and input-runtime workers can implement in parallel without changing ownership rules.

## Detailed Planning Artifacts

- `docs/planning-artifacts/mvp-v1/technology-stack.en.md`: selected MVP technology stack, boundaries, deferred choices, and dependency rules.
- `docs/planning-artifacts/mvp-v1/epics.en.md`: epic-level outcomes, boundaries, stories, and acceptance signals.
- `docs/planning-artifacts/mvp-v1/stories.en.md`: story-sized implementation units with status, scope, dependencies, and verification notes.
- `docs/planning-artifacts/mvp-v1/implementation-order.en.md`: recommended build order and commit order.
- `docs/planning-artifacts/mvp-v1/prerequisites.en.md`: prerequisites for product, contracts, FE, BE, input runtime, persistence, QA, and merge readiness.

## Product Baseline

- Build a browser-based, turn-based 1v1 battle loop driven by hand gesture input.
- Use REST for setup, lookup, and queue entry flows.
- Use WebSocket as the primary channel for matchmaking progress and battle events.
- Keep the server authoritative for battle state, action validation, turn progression, and final results.
- Run hand recognition on the client; the backend receives only normalized action metadata and gesture sequences.
- Prioritize state correctness, understandable input feedback, and repeatable verification over advanced presentation.

## Architecture Decisions

### WebSocket-Centered Battle Flow

- The client opens an authenticated WebSocket connection before entering a battle-ready state.
- Matchmaking and battle screens subscribe to event messages instead of polling for state changes.
- Battle action submission uses a stable `action_id`, `battle_session_id`, `turn_number`, and `gesture_sequence`.
- The server emits accepted, rejected, state-updated, timeout, and ended events as the source of truth.
- REST remains available for initial player setup, loadout setup, queue commands, battle snapshot lookup, history, and rating views.

### Server Authoritative Rules

- The server owns match creation, battle session creation, turn ownership, HP, mana, cooldowns, timeouts, surrender, win/loss, rating changes, and saved match history.
- Client-side recognition success is never treated as final skill activation.
- The server validates current turn, sequence validity, resource availability, cooldown state, duplicate `action_id`, and session status before applying any battle change.
- Duplicate action submissions must be idempotent and must not apply damage, cost, cooldown, rating, or history writes more than once.
- Reconnection or delayed events must resolve against the latest server snapshot.

### Client Hand Recognition

- Camera frames and raw tracking data stay on the client.
- The client converts local hand recognition output into a normalized gesture token sequence.
- The UI must show camera readiness, hand-detected state, current gesture, target sequence step, confidence or stability signal, and failure reason.
- Local UI may react immediately for feedback, but battle state changes only after server confirmation.
- Debug views are allowed for development, but they must be separated from the normal play surface.

## MVP Scope

- Guest or simple player identity.
- Skillset and presentation-set selection from server-approved presets.
- Ranked 1v1 matchmaking entry, cancel, and matched state.
- Turn-based battle session start, action submission, timeout, surrender, and end.
- Gesture sequence validation against skill rules.
- HP, mana, cooldown, turn owner, and battle log updates.
- Rating change and match history persistence.
- Minimum result, history, and leaderboard views.
- Local setup and verification commands documented in the repository.

## Out of Scope for MVP

- Real-time video or voice transport between players.
- Server-side camera frame analysis or raw tracking storage.
- Spectator mode, team battle, party flow, guild/social systems, and chat.
- Full replay video, cinematic battle replay, or advanced 3D presentation.
- Complex skill gestures that are difficult to explain or repeatedly perform.
- Production-grade account recovery, billing, moderation, or external identity integrations.
- Multi-region deployment, autoscaling, and production observability beyond local traceability.

## Implementation Workstreams

### Backend

- Confirm API contracts for player, loadout, matchmaking, battle snapshot, surrender, history, rating, and WebSocket token flows.
- Implement WebSocket session authentication, connection lifecycle, event dispatch, and reconnection behavior.
- Implement queue matching and battle session creation.
- Implement battle engine validation for turn owner, gesture sequence, resource state, cooldown, duplicate action, timeout, surrender, and end conditions.
- Persist match result, rating change, and minimal action log needed for audit and debugging.
- Cover service-level rejection paths and idempotency with focused tests.

### Frontend

- Build the playable route flow: start, loadout, queue, battle, result, history/rating, and minimal settings.
- Keep server state in query or socket adapters and keep local recognition state in feature-level input modules.
- Render WebSocket connection status, turn status, action result, timeout, and battle end states from server events.
- Render hand recognition feedback with clear progress and failure states.
- Keep debug panels available but visually separated from normal user flows.
- Add component and browser checks for launch-critical states when the feature exists.

### Input Runtime

- Define a small MVP gesture token set and at least three skill sequences.
- Implement a client-side sequence state machine with stability threshold, debounce, timeout, reset, and failure reason states.
- Provide deterministic fallback or test mode so smoke checks can submit known gesture sequences without relying on live camera conditions.
- Record enough local debug information to diagnose false negative, false positive, timeout, and permission-blocked paths.

### QA and Documentation

- Keep README links current for setup and verification entrypoints.
- Maintain a smoke checklist for local, API, WebSocket, battle-loop, client-recognition, and documentation checks.
- Track MVP exclusions explicitly so parallel workers do not spend time on deferred work.
- Run the forbidden-term repository scan before handoff.

## Acceptance Criteria

- A local developer can run setup and verification commands from README.
- A player can enter the app, select loadout, join matchmaking, enter battle, submit a valid gesture sequence, receive a server-confirmed result, and view match outcome.
- Invalid, duplicate, out-of-turn, insufficient-resource, cooldown, timeout, disconnect, and surrender paths are rejected or completed by server rules.
- Client feedback distinguishes camera readiness, hand detection, sequence progress, local input failure, server rejection, and confirmed skill activation.
- Match result, rating change, and history are persisted and retrievable.
- MVP exclusions remain absent from implementation goals, product copy, and docs.
