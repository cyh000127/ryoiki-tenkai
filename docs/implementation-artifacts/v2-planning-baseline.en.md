# v2 Planning Baseline Record

## Purpose

This record defines the next v2 implementation order while making it explicit that skill implementation must not start until a separate domain source is approved.

## Scope

- Define v2 epics.
- Define v2 stories and status.
- Define v2 implementation order and commit units.
- Define v2 prerequisites.
- Define v2 technology-stack keep/defer decisions.
- Split documents into Korean and English files.

## Artifacts

- `docs/planning-artifacts/v2/epics.ko.md`
- `docs/planning-artifacts/v2/epics.en.md`
- `docs/planning-artifacts/v2/stories.ko.md`
- `docs/planning-artifacts/v2/stories.en.md`
- `docs/planning-artifacts/v2/implementation-order.ko.md`
- `docs/planning-artifacts/v2/implementation-order.en.md`
- `docs/planning-artifacts/v2/prerequisites.ko.md`
- `docs/planning-artifacts/v2/prerequisites.en.md`
- `docs/planning-artifacts/v2/technology-stack.ko.md`
- `docs/planning-artifacts/v2/technology-stack.en.md`

## Skill Implementation Deferral Rule

Skill names, skill effects, hand-motion resources, visual assets, and resource keys are not implemented without a separate domain source. The v2 planning docs mark this area as `blocked` and separate the later flow for approved fixture, API contract, and frontend rendering updates.

## Verification

- `git diff --check`
- provider-neutral targeted text scan
