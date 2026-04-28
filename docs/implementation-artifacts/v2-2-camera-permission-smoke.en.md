# v2-2 Camera Permission Smoke Automation Record

## Purpose

Browser camera permission allowed/denied paths are now covered by a repeatable automated smoke command.

## Scope

- Import the live recognizer adapter in a real browser context and verify the `getUserMedia` allowed path.
- Confirm that allowed permission emits `ready` status and creates normalized `live_camera` input.
- Confirm that denied permission emits `blocked` status and creates no gesture input.
- Lock the battle workspace UI so `blocked` status is visible and does not enter action submission.
- The default smoke path uses a fake camera device. Set `LIVE_CAMERA_SMOKE_REAL_DEVICE=true` to run against an actual device path.

## Command

```bash
pnpm --dir FE/app smoke:camera
```

If the local browser runtime is missing, install it once:

```bash
pnpm --dir FE/app exec playwright install chromium
```

## Implementation Summary

- `FE/app/playwright.camera-smoke.config.ts`
  - Added the browser runner configuration dedicated to camera smoke checks.
  - `LIVE_CAMERA_SMOKE_REAL_DEVICE=true` switches from fake-device smoke to actual-device permission flow.
- `FE/app/tests/smoke/liveCameraPermission.smoke.ts`
  - Added separate allowed-permission and denied-permission smoke checks.
- `FE/app/tests/smoke/live-camera-fixture.html`
  - Added a minimal browser fixture separated from the app API flow.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - Added coverage that blocked permission UI does not enter action submission.

## Verification

- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test -- tests/unit/BattleGameWorkspace.test.tsx`
- `pnpm --dir FE/app smoke:camera`

## Remaining v2 Prerequisites

- Select the concrete frame recognizer package or runtime binding.
- Move to production persistence.
- Replace final skill/resource assets.
