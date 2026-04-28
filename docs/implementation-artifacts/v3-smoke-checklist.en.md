# v3 Smoke Checklist

Use this document for local verification of the v3 handoff stabilization scope. Concrete frame recognizer runtime selection and skill/resource implementation remain blocked until approved.

## Snapshot

- Date: `2026-04-28`
- Baseline branch: `main`
- Source documents:
  - `docs/planning-artifacts/v3/epics.en.md`
  - `docs/planning-artifacts/v3/stories.en.md`
  - `docs/planning-artifacts/v3/implementation-order.en.md`
  - `docs/planning-artifacts/v3/prerequisites.en.md`
  - `docs/planning-artifacts/v3/technology-stack.en.md`

## Baseline Verification

- [x] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -PlanOnly`
  - Evidence: `docs/implementation-artifacts/v3-1-handoff-check.en.md`
- [x] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode fast`
  - Evidence: `docs/implementation-artifacts/v3-1-handoff-check.en.md`, `docs/implementation-artifacts/v3-2-health-runtime-summary.en.md`
- [x] `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode full`
  - Evidence: `docs/implementation-artifacts/v3-release-readiness.en.md`

## Failure Triage Order

1. Run `-PlanOnly` first to confirm the execution order and commands.
2. If `-Mode fast` fails, rerun the printed failed command by itself and isolate whether the failure is in frontend, backend, boundary, compose, or text scan scope.
3. If only `-Mode full` fails, narrow the issue to camera smoke or production build, then check runtime port smoke and build output first.
4. If the provider-neutral scan fails, check whether new docs or product copy added external provider details outside lock/generated output.

## Frontend

- [x] Typecheck passes.
- [x] Unit/component tests pass.
- [x] Camera smoke verifies the fake runtime port lifecycle.
- [x] Production build passes.

## Backend

- [x] Lint passes.
- [x] Unit tests pass.
- [x] `/healthz` returns a safe runtime summary.
- [x] Health response does not expose database URLs, credentials, or raw recognition data.
- [x] OpenAPI health contract includes the runtime summary.

## Runtime And Handoff

- [x] Boundary check passes.
- [x] Compose config is valid.
- [x] Provider-neutral targeted text scan passes.
- [x] v3 readiness separates blocked domain/runtime scope.

## Blocked Carryover

- Blocked: concrete frame recognizer runtime selection and binding.
  - Blocker: runtime selection approval is required.
  - Related story: `V2-E1-ST02`.
- Blocked: skill/resource domain intake.
  - Blocker: an approved skill domain source is required.
  - Related stories: `V2-E4-ST01` through `V2-E4-ST04`.
