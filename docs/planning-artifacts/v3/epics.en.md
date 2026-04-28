# v3 Epics

This document defines v3 as release and handoff stabilization scope. Skill/resource implementation stays outside v3 until a separate domain source is approved. Recognizer runtime binding was later completed in v2-12.

## Epic V3-E1: Handoff Verification Automation

Create a repeatable verification entrypoint so frontend, backend, compose, and documentation scans can be checked together.

### Acceptance Signals

- A local developer can run v3 handoff verification through one script.
- Fast verification and full verification are separated.
- The provider-neutral text scan and boundary check are included in the same verification flow.
- Failed commands are clearly visible.

### Stories

- V3-E1-ST01: Write the unified handoff verification script.
- V3-E1-ST02: Document script usage and failure handling.

## Epic V3-E2: Runtime Health and Diagnostics

Make runtime state that matters before operation clearer through the API and documentation.

### Acceptance Signals

- The health endpoint separates application status from runtime dependency policy.
- Storage mode and database URL details are not exposed; only a safe summary is returned.
- FE/BE contract changes are locked by tests.

### Stories

- V3-E2-ST01: Add a safe runtime summary to the backend health response.
- V3-E2-ST02: Refresh the health response contract and tests.

## Epic V3-E3: Release Evidence and Handoff

Separate the completed v3 scope from still-blocked scope so the next worker does not repeat the same decision work.

### Acceptance Signals

- The v3 smoke checklist separates implemented checks and blocked items.
- The v3 release readiness document separates full feature release readiness from handoff readiness.
- README links make v3 documents discoverable.

### Stories

- V3-E3-ST01: Write the v3 smoke checklist.
- V3-E3-ST02: Write the v3 release readiness document.
- V3-E3-ST03: Add v3 links to README and v1/v2 handoff documents.

## Epic V3-E4: Blocker Carryover Guard

Keep unapproved domain decisions from being mistaken for implementation scope.

### Acceptance Signals

- Skill/resource implementation remains blocked until an approved skill domain source exists.
- Documentation and product copy contain no unapproved external provider or service names.

### Stories

- V3-E4-ST01: Record v2 blocker carryover in v3 readiness.
- V3-E4-ST02: Include the provider-neutral scan in the v3 release gate.
