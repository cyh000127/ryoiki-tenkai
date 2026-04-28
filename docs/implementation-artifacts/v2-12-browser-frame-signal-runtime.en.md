# v2-12 Browser Frame Signal Runtime Implementation Record

This document records `V2-E1-ST02`. The default live recognizer runtime now uses local browser video-frame signals without adding an external runtime dependency.

## Scope

- Replace the default `LiveGestureFrameRuntime` path from no-op to the browser frame signal runtime.
- Do not send raw frames or raw tracking data to the backend.
- Expose frame analysis only as normalized observations with `confidence`, `stabilityMs`, `reason`, and `token`.
- Do not implement skill names, skill effects, resource keys, or visual assets.

## Implementation

- `FE/app/src/features/gesture-session/model/liveGestureRuntime.ts`
  - Added `createBrowserFrameSignalRecognizer` and `createBrowserFrameSignalRuntime`.
  - Uses canvas downsampling to convert frame contrast/motion into a scalar signal.
  - Returns `recognized` only when the expected token remains stable for the configured window.
  - Returns `no_hand` when frame signal is missing or low, and `unstable` while the signal is not stable enough.
- `FE/app/src/features/gesture-session/model/liveGestureRecognizer.ts`
  - Uses the browser frame signal runtime by default when no explicit runtime or test frame recognizer is supplied.
  - Keeps the existing no-op runtime export for tests and explicit fallback use.
- `FE/app/tests/unit/liveGestureRecognizer.test.ts`
  - Verifies stable frame signal normalization into the expected token.
  - Verifies stability reset after signal drop.
  - Verifies that the runtime wrapper exposes the browser frame signal recognizer as a session.
- `BE/api/src/gesture_api/api/routes/health.py`
  - Updates the safe health summary `recognizerRuntime` value to `browser_frame_signal`.

## Deferred

- `V2-E4-ST01` through `V2-E4-ST04` remain blocked until an approved skill/resource domain source exists.
- This runtime is a provider-neutral local frame signal runtime. Replacing it with a separate hand landmark runtime requires a new technology decision and smoke test.

## Verification

- `pnpm --dir FE/app exec vitest run tests/unit/liveGestureRecognizer.test.ts`
- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test`
- `pnpm --dir FE/app smoke:camera`
- `pnpm --dir FE/app build`
- `uv run ruff check BE`
- `uv run pytest BE`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode full`
- `git diff --check`
- provider-neutral targeted text scan
