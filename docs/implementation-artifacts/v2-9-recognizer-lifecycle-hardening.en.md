# v2-9 Recognizer Lifecycle Hardening Record

This document is the implementation record for `V2-E1-ST04`. Concrete frame recognizer runtime selection remains in `V2-E1-ST02`; this unit locks stop/start, unmount cleanup, and permission recovery inside the current browser camera adapter boundary.

## Purpose

- Prevent a late camera stream from moving the recognizer back to `ready` when the player stops or leaves the screen before permission resolves.
- Allow the same adapter instance to retry after permission is denied and recover to `ready`.
- Verify that the battle workspace cleans up the live recognizer on unmount.

## Scope

- Do not implement the concrete frame recognizer runtime or skill/resource mapping.
- Do not send raw frames or raw tracking streams to the backend.
- Use an adapter lifecycle version to ignore stale async start results.
- Stop late-acquired stream tracks immediately when a pending start is canceled.

## Implementation Summary

- `FE/app/src/features/gesture-session/model/liveGestureRecognizer.ts`
  - Assigns a lifecycle version to each `start()` call and advances it on `stop()`.
  - Prevents stale start results from creating intervals or switching to `ready` after stream/play resolves.
  - Stops stale stream tracks immediately.
- `FE/app/tests/unit/liveGestureRecognizer.test.ts`
  - Verifies a pending start stopped before permission resolves does not revive to `ready`.
  - Verifies retry after permission denied can recover to `ready`.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - Verifies the battle workspace calls live recognizer `stop()` on unmount.

## Lifecycle Rule

| Situation | Result |
| --- | --- |
| `stop()` during `start()` | late stream is ignored, track is stopped, `stopped` remains |
| Retry after permission denied | `blocked` can transition through new `starting`/`ready` |
| Battle workspace unmount | socket close and live recognizer cleanup run |
| Concrete runtime not selected | no-op frame recognizer fallback remains |

## Verification

- `pnpm --dir FE/app exec vitest run tests/unit/liveGestureRecognizer.test.ts tests/unit/BattleGameWorkspace.test.tsx`
- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test`
- `pnpm --dir FE/app smoke:camera`
- `pnpm --dir FE/app build`

## Remaining v2 Prerequisites

- `V2-E1-ST02`: select and bind the concrete frame recognizer runtime.
- `V2-E4-ST01` and later: obtain an approved skill domain source.
