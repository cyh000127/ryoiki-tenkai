# v2-10 Recognizer Runtime Port Implementation Record

This document records the internal live camera adapter port split. It does not unblock `V2-E1-ST02`; it only prepares a narrow place where a concrete frame recognizer runtime can be bound later.

## Scope

- Do not add an external runtime dependency.
- Do not select or implement the concrete frame recognizer runtime.
- Keep the existing `frameRecognizer` test option and smoke fixture compatibility.
- Separate runtime startup, per-camera session, and session stop cleanup boundaries.
- Do not send raw frames, raw landmarks, or raw tracking streams to the backend.

## Implementation

- `FE/app/src/features/gesture-session/model/liveGestureRuntime.ts`
  - Added `LiveGestureFrameRuntime`, `LiveGestureRuntimeSession`, and `LiveGestureRuntimeStartContext` types.
  - Added an adapter helper that wraps the existing frame recognizer function as a runtime session.
  - Moved the noop recognizer into a separate runtime module to isolate the future replacement point.
- `FE/app/src/features/gesture-session/model/liveGestureRecognizer.ts`
  - The browser camera lifecycle now creates a session through `runtime.start({ video })` and calls `session.stop()` during cleanup.
  - The existing `frameRecognizer` option remains supported.
  - Runtime startup failure now cleans up the camera stream and video binding before moving to `error`.
- `FE/app/tests/unit/liveGestureRecognizer.test.ts`
  - Added regression coverage for runtime session start/stop lifecycle.
  - Added regression coverage for camera resource cleanup when runtime startup fails.

## Deferred

- Concrete runtime selection and package binding for `V2-E1-ST02` remain blocked.
- Runtime candidate comparison, bundle impact, and browser support validation require separate approval.
- Skill names, skill effects, resource keys, and visual assets were not implemented.

## Verification

- `pnpm --dir FE/app exec vitest run tests/unit/liveGestureRecognizer.test.ts`
- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test`
- `pnpm --dir FE/app smoke:camera`
- `pnpm --dir FE/app build`
- `git diff --check`
- provider-neutral targeted text scan

## Next Step

1. Add a `LiveGestureFrameRuntime` implementation after the runtime choice is approved.
2. Record the selected runtime and rationale in `docs/planning-artifacts/v2/technology-stack.en.md`.
3. Add a concrete runtime smoke or unit fixture before reviewing the `V2-E1-ST02` status again.
