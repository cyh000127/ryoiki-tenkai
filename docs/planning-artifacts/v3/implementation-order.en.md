# v3 Implementation Order

v3 packages the current implementation for easier verification and handoff without unblocking blocked domain/runtime work.

## Phase 0: Scope Guard

1. Check blocked items in v2 readiness.
2. Do not invent a concrete frame recognizer runtime or skill/resource implementation.
3. Record the rationale in the technology-stack documents before adding a new dependency.
4. Keep the provider-neutral scan.

## Phase 1: Planning Baseline

1. Write v3 epics/stories/implementation-order/prerequisites/technology-stack documents.
2. Link v3 planning documents from README.
3. Separate planned, done, and blocked v3 status.

## Phase 2: Handoff Verification Automation

1. Write `scripts/v3-handoff-check.ps1`.
2. Provide fast, full, and plan-only modes.
3. Combine FE, BE, compose, boundary, and provider-neutral scan checks in one flow.

## Phase 3: Runtime Health and Diagnostics

1. Add a safe runtime summary to the backend health schema.
2. Do not expose database URLs, credentials, or raw recognition data.
3. Update backend unit tests and contract tests.

## Phase 4: Release Evidence

1. Write the v3 smoke checklist.
2. Write the v3 release readiness document.
3. Add v3 links to README and v1/v2 readiness.
4. Run full verification and record results in readiness.

## Recommended Commit Units

1. v3 planning baseline.
2. v3 handoff verification script.
3. runtime health summary.
4. v3 smoke checklist and readiness.
5. v3 final README/handoff update.
