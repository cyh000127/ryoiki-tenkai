# v2-1 Live Recognizer Adapter Implementation Record

## Purpose

As the first post-v1 follow-up, the browser-camera live recognizer adapter is now connected to the existing normalized gesture input boundary.

## Scope

- Wrap browser camera permission, start, stop, unsupported, blocked, and error states behind one adapter API.
- Keep observed camera state separate from confirmed gesture tokens.
- Send only confirmed tokens as normalized `live_camera` input into the battle flow.
- Do not send camera frames or raw tracking streams to the backend.
- Keep the concrete frame recognizer replaceable behind the adapter.

## Implementation Summary

- `FE/app/src/features/gesture-session/model/liveGestureRecognizer.ts`
  - Added `createBrowserLiveGestureRecognizer`.
  - Added `LiveGestureObservation`, `LiveGestureRecognizerStatus`, and `LiveGestureFrameRecognizer` boundaries.
  - When no frame recognizer is installed, the safe no-op recognizer reports a no-hand state.
- `FE/app/src/features/gesture-session/model/gestureInput.ts`
  - Added `createLiveCameraInput` for normalized live camera tokens.
- `FE/app/src/features/battle-flow/model/battleFlow.ts`
  - Added the `receiveGestureObservation` action so camera observation does not advance sequence progress.
- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
  - Added the live camera panel to the battle screen.
  - Recognized tokens enter gesture input only on the player's turn and outside server confirmation lock.
  - Other observations update camera-ready, hand-detected, confidence, and stability display only.

## Verification

- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test`

## Remaining v2 Prerequisites

- Automate real-device browser camera allowed/denied smoke scenarios.
- Select the concrete frame recognizer package or runtime binding.
- Move to production persistence.
- Replace final skill/resource assets.
