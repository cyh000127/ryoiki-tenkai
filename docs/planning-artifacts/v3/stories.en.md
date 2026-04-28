# v3 Stories

Status values:

- `done`: implemented on the current branch.
- `planned`: implementable but not started.
- `blocked`: must not start until a prerequisite source or decision exists.
- `deferred`: can be moved outside v3.

## V3-E1: Handoff Verification Automation

### V3-E1-ST01: Write the unified handoff verification script

- Status: done
- Scope: PowerShell entrypoint for frontend typecheck/test/smoke/build, backend lint/test, boundary check, compose config, and provider-neutral scan.
- Acceptance criteria: fast/full modes exist and failed commands are clearly printed.
- Dependencies: existing npm, uv, compose, and check-boundaries commands.
- Verification: `docs/implementation-artifacts/v3-1-handoff-check.en.md`, script fast mode, script plan mode.

### V3-E1-ST02: Document script usage and failure handling

- Status: done
- Scope: record the command and failure triage order in README, smoke checklist, and readiness documents.
- Acceptance criteria: developers can find the V3 verification path as one command.
- Dependencies: V3-E1-ST01.
- Verification: `docs/implementation-artifacts/v3-smoke-checklist.en.md`, `docs/implementation-artifacts/v3-release-readiness.en.md`, README link review.

## V3-E2: Runtime Health and Diagnostics

### V3-E2-ST01: Add a safe runtime summary to the backend health response

- Status: done
- Scope: add application status, storage mode summary, persistence policy, and runtime blocker summary to the health response.
- Acceptance criteria: database URLs, credentials, and raw recognition data are not returned.
- Dependencies: existing health route and settings.
- Verification: `docs/implementation-artifacts/v3-2-health-runtime-summary.en.md`, backend unit test.

### V3-E2-ST02: Refresh the health response contract and tests

- Status: done
- Scope: update schema, tests, and docs to lock the health contract.
- Acceptance criteria: API response shape is fixed by tests.
- Dependencies: V3-E2-ST01.
- Verification: `docs/implementation-artifacts/v3-2-health-runtime-summary.en.md`, backend test, contract review.

## V3-E3: Release Evidence and Handoff

### V3-E3-ST01: Write the v3 smoke checklist

- Status: done
- Scope: v3 verification commands, runtime health, compose, provider-neutral scan, and blocked items.
- Acceptance criteria: implemented and blocked items are separated.
- Dependencies: V3-E1, V3-E2.
- Verification: `docs/implementation-artifacts/v3-smoke-checklist.en.md`, v3 handoff check.

### V3-E3-ST02: Write the v3 release readiness document

- Status: done
- Scope: v3 checkpoint decision, full feature blockers, and verification evidence.
- Acceptance criteria: handoff readiness and full feature release blockers are separated.
- Dependencies: V3-E3-ST01.
- Verification: `docs/implementation-artifacts/v3-release-readiness.en.md`, v3 handoff check.

### V3-E3-ST03: Add v3 links to README and handoff documents

- Status: done
- Scope: add v3 result links to Korean and English README plus v1/v2 readiness documents.
- Acceptance criteria: a new worker can find v3 documents from README.
- Dependencies: V3-E3-ST01, V3-E3-ST02.
- Verification: README link review.

## V3-E4: Blocker Carryover Guard

### V3-E4-ST01: Record v2 blocker carryover in v3 readiness

- Status: done
- Scope: record the missing concrete runtime choice and missing skill/resource domain source as v3 blocker carryover.
- Acceptance criteria: blocked items are not marked as implemented.
- Dependencies: v2 readiness.
- Verification: `docs/implementation-artifacts/v3-release-readiness.en.md`, `docs/implementation-artifacts/v3-smoke-checklist.en.md`.

### V3-E4-ST02: Include the provider-neutral scan in the v3 release gate

- Status: done
- Scope: include the scan command in the script and readiness document.
- Acceptance criteria: scan results outside lock/generated output are recorded as PASS.
- Dependencies: V3-E1-ST01.
- Verification: `scripts/v3-handoff-check.ps1`, `docs/implementation-artifacts/v3-release-readiness.en.md`, provider-neutral targeted text scan.
