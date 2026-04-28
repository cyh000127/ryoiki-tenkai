# v2 Prerequisites

This document lists the conditions to check before starting or merging v2 work.

## Global Prerequisites

- Confirm the completed scope from the v1 release readiness document.
- Before implementation, map the work to `done`, `planned`, `blocked`, or `deferred` in `stories.en.md`.
- Reflect technology choice changes in `technology-stack.ko.md` and `technology-stack.en.md` first.
- Documentation and product copy must not include unapproved external provider or service names.
- Raw camera frames, raw landmarks, and raw tracking streams are not sent to or stored by the backend.
- Keep each feature to no more than three commits.

## Skill Implementation Prerequisites

Do not start skill implementation until all of the following are true.

- A separate domain source exists.
- The domain source defines at least:
  - stable skill id.
  - display name.
  - battle effect.
  - mana or resource cost.
  - cooldown.
  - gesture sequence.
  - motion or visual resource key.
  - version or change note.
- Skill effect validation and gesture token validation have separate responsibilities.
- The team has agreed how the approved source will update the shared fixture, backend catalog, and frontend default catalog.
- Missing resource fallback policy is defined.

Without these conditions, do not invent skill names, effects, images, hand-motion resources, or resource keys.

## Recognition Runtime Prerequisites

- Selection criteria for the browser-compatible recognizer runtime must be defined.
- The normalized observation shape returned by the adapter must be defined:
  - status.
  - token.
  - confidence.
  - stable duration.
  - reason.
- Camera permission allowed/denied smoke must remain available.
- There must be a test strategy for stop/start/unmount lifecycle.
- Verify that raw frames and raw tracking data do not leave the local boundary.

## Backend Prerequisites

- Update contract tests before changing REST or socket payloads.
- Keep server-authoritative battle rules.
- State-mutating commands must have stable action/request ids.
- Storage changes must pass through the adapter boundary.
- Match result, rating, and history writes must be idempotent.
- Backend socket/API tests are required when timeout, surrender, or reconnect behavior changes.

## Frontend Prerequisites

- User-facing text belongs in the locale/copy catalog.
- Do not mix camera state, hand state, local sequence state, and server confirmation state.
- Do not show a skill effect as applied before server confirmation.
- Keep debug fallback input separate from the normal play surface.
- Check compact and desktop text overflow when layout changes.

## Persistence Prerequisites

- Do not bypass the adapter protocol by handling file or database details directly in the repository.
- Changes that need migrations include apply/reset/rollback or recovery notes.
- Storage load/save failure policy must avoid silent data loss.
- Audit/history records store compact metadata only.

## QA Prerequisites

- Implemented behavior must have automated verification.
- Docs-only changes run `git diff --check` and the provider-neutral scan.
- FE changes run typecheck/test/build commands appropriate to the affected scope.
- BE changes run ruff and pytest.
- Camera/runtime changes run the smoke fixture.
- Before handoff, verify README and implementation record links.

## Blockers That Should Stop Implementation

- A request asks for skill/resource implementation without a skill domain source.
- A concrete adapter is requested before recognizer runtime selection.
- Backend behavior requires receiving or storing raw recognition data.
- FE and BE payloads are assumed differently without a contract.
- A behavior must be marked complete but cannot be verified locally.
