# v2-7 Delayed/Duplicate Event Reconciliation Record

This document is the implementation record for `V2-E3-ST03`. The frontend regression coverage and action result guard now prevent delayed or duplicate socket events from rolling an already-confirmed battle UI back to older state.

## Purpose

- Prevent a late duplicate reject event from changing an action that was already confirmed by a state update into rejected UI.
- Ignore same-turn snapshots with shorter battle logs or older deadlines.
- Link the existing repeated-ended reducer guarantee to the `V2-E3-ST03` evidence set so rating/history results are not applied twice.

## Scope

- A rejected `battle.action_result` updates the UI only when it matches the current pending action id/request id.
- `battle.state_updated` still consumes pending action latency only after passing the latest-snapshot guard.
- Reducer regression coverage explicitly verifies same-turn stale snapshot conditions.
- Component regression coverage verifies that a duplicate rejection after state confirmation does not overwrite confirmed UI.

## Implementation Summary

- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
  - Added a pending-action match guard for rejected `battle.action_result` handling.
  - Late reject events are ignored when there is no pending action or the action id/request id does not match.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - Added a component test for ignoring a duplicate rejection with the same action id/request id after server state confirmation.
- `FE/app/tests/unit/battleFlow.test.ts`
  - Added a reducer test for ignoring same-turn snapshots with shorter battle logs or older deadlines.

## Reconciliation Rule

| Situation | Result |
| --- | --- |
| Reject event matches the pending action | rejected UI is applied |
| Duplicate reject arrives after state update consumed the pending action | event is ignored; confirmed UI remains |
| Same turn with a shorter battle log arrives | snapshot is ignored |
| Same turn with an older deadline arrives | snapshot is ignored |
| Repeated ended event arrives | rating/history is not applied twice |

## Verification

- `pnpm --dir FE/app exec vitest run tests/unit/battleFlow.test.ts tests/unit/BattleGameWorkspace.test.tsx`
- `pnpm --dir FE/app typecheck`

## Remaining v2 Prerequisites

- `V2-E3-ST04`: stabilize timeout watcher and surrender event fanout.
- `V2-E1-ST02`: select and bind the concrete frame recognizer runtime.
- `V2-E1-ST04`: harden recognizer restart, cleanup, and permission recovery.
- `V2-E4-ST01` and later: obtain an approved skill domain source.
