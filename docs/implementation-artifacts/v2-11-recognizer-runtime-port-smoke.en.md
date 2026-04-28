# v2-11 Recognizer Runtime Port Smoke Implementation Record

This document records the camera permission smoke hardening that routes the browser path through the `LiveGestureFrameRuntime` port without selecting a concrete frame recognizer runtime. Runtime binding was later completed in `docs/implementation-artifacts/v2-12-browser-frame-signal-runtime.en.md`.

## Scope

- Do not add an external runtime dependency.
- Do not select or implement the concrete frame recognizer runtime.
- Verify that the allowed camera smoke path calls `runtime.start()` and `session.stop()`.
- Verify that the permission denied path does not start a runtime session.
- Do not send raw frames, raw landmarks, or raw tracking streams to the backend.

## Implementation

- `FE/app/tests/smoke/liveCameraPermission.smoke.ts`
  - Changed the allowed camera smoke from the `frameRecognizer` shortcut to a fake `runtime` option.
  - Added `runtimeStarts`, `runtimeStops`, and `recognitionCalls` to the smoke result.
  - Verified runtime start/stop and frame recognition calls on the allowed path.
  - Verified that runtime start/stop/recognition does not occur on the denied path.

## Deferred

- Concrete runtime selection and binding for `V2-E1-ST02` were blocked at this stage and were later completed in `v2-12`.
- This smoke only verifies runtime port lifecycle; it does not verify recognizer quality or gesture accuracy.
- Skill names, skill effects, resource keys, and visual assets were not implemented.

## Verification

- `pnpm --dir FE/app smoke:camera`
- `pnpm --dir FE/app typecheck`
- `git diff --check`
- provider-neutral targeted text scan

## Next Step

1. Check `docs/implementation-artifacts/v2-12-browser-frame-signal-runtime.en.md` for the follow-up record.
2. If replacing the runtime, add a concrete runtime smoke or unit fixture separate from the fake runtime smoke.
