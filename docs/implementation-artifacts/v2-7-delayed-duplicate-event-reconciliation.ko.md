# v2-7 delayed/duplicate event reconciliation 구현 기록

이 문서는 `V2-E3-ST03`의 구현 기록입니다. 늦게 도착한 socket event나 중복 event가 이미 확정된 전투 UI를 과거 상태로 되돌리지 않도록 프론트 회귀 테스트와 action result 처리 guard를 보강했습니다.

## 목적

- state update로 이미 확정된 action이 뒤늦은 duplicate reject event 때문에 rejected UI로 바뀌지 않게 합니다.
- 같은 turn의 더 짧은 battle log 또는 더 오래된 deadline snapshot을 무시합니다.
- repeated ended event가 rating/history 결과를 중복 반영하지 않는 기존 reducer 보장을 `V2-E3-ST03` 근거로 연결합니다.

## 범위

- `battle.action_result`의 rejected event는 현재 pending action id/request id와 일치할 때만 UI에 반영합니다.
- `battle.state_updated`는 기존처럼 최신 snapshot guard를 통과한 경우에만 pending action latency를 소비합니다.
- reducer 회귀 테스트는 same-turn stale snapshot 조건을 명시적으로 검증합니다.
- component 회귀 테스트는 state confirmation 이후 도착한 duplicate rejection이 confirmed UI를 덮어쓰지 않는지 검증합니다.

## 구현 요약

- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
  - rejected `battle.action_result` 처리에 pending action match guard를 추가했습니다.
  - pending action이 없거나 action id/request id가 다르면 늦은 reject event를 무시합니다.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - server state confirmation 후 같은 action id/request id로 들어온 duplicate rejection을 무시하는 component test를 추가했습니다.
- `FE/app/tests/unit/battleFlow.test.ts`
  - 같은 turn에서 더 짧은 battle log나 더 오래된 deadline snapshot을 stale state로 간주하는 reducer test를 추가했습니다.

## Reconciliation Rule

| 상황 | 결과 |
| --- | --- |
| pending action과 일치하는 reject event | rejected UI 반영 |
| state update로 pending action이 이미 소비된 뒤 duplicate reject 도착 | event 무시, confirmed UI 유지 |
| 같은 turn이지만 battle log가 더 짧은 snapshot 도착 | snapshot 무시 |
| 같은 turn이지만 deadline이 더 오래된 snapshot 도착 | snapshot 무시 |
| repeated ended event 도착 | rating/history 중복 반영 없음 |

## 검증

- `pnpm --dir FE/app exec vitest run tests/unit/battleFlow.test.ts tests/unit/BattleGameWorkspace.test.tsx`
- `pnpm --dir FE/app typecheck`

## 남은 v2 선행조건

- `V2-E1-ST02`: concrete frame recognizer runtime 선택 및 adapter 결합.
- `V2-E1-ST04`: recognizer restart, cleanup, permission recovery hardening.
- `V2-E4-ST01` 이후: approved skill domain source 확보.
