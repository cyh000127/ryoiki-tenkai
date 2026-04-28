# v2-4 Recognition UI State Hardening Record

This document is the implementation record for `V2-E1-ST03`. It separates no-hand, unstable-hand, and recognized-token states in the battle input UI instead of collapsing live camera observations into one label.

## Purpose

- Let the player distinguish missing hand, stabilizing hand, and recognized token states immediately.
- Keep camera/hand observation state separate from local sequence progress and server decision feedback.
- Harden the UI inside the existing adapter boundary without selecting a concrete frame recognizer runtime yet.

## Scope

- Add a dedicated hand-state strip to `LiveCameraPanel`.
- Render `no_hand`, `unstable`, and `recognized` observation reasons as separate visual states.
- Show the recognized observation token as a dedicated live camera metric.
- Keep the existing input console sequence progress, submission readiness, and server decision strip unchanged.
- Do not select a concrete recognizer runtime, implement a frame recognizer, or harden restart/cleanup in this unit.

## Implementation Summary

- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
  - Added `LiveHandState` and `LiveHandStateItem`.
  - `LiveCameraPanel` now derives hand state from observation reason and renders the three states independently.
  - Current observation token is displayed through the `Current gesture` metric.
- `FE/app/src/platform/i18n/catalog.ts`
  - Added copy for the hand-state strip and active/inactive labels.
  - Clarified the `no_hand` observation label as missing hand.
- `FE/app/src/platform/theme/global.css`
  - Added the responsive hand-state grid and active state styling.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - Added a regression test that verifies active transitions for no-hand, unstable-hand, and recognized-token states.

## State Separation Rules

| Observation | UI State | Sequence Progress Impact | Server Decision Impact |
| --- | --- | --- | --- |
| `no_hand` | no-hand active | does not advance progress | no impact |
| `unstable` | unstable active | does not advance progress | no impact |
| `recognized` with token | recognized token active | advances only through the existing normalized input boundary | does not bypass server decision |

## Verification

- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test -- BattleGameWorkspace.test.tsx`

## Remaining v2 Prerequisites

- `V2-E1-ST02`: select and bind the concrete frame recognizer runtime.
- `V2-E1-ST04`: harden recognizer restart, cleanup, and permission recovery.
