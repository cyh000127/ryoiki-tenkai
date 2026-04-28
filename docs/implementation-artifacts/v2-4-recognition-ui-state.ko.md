# v2-4 recognition UI state hardening 구현 기록

이 문서는 `V2-E1-ST03`의 구현 기록입니다. live camera observation에서 no-hand, unstable-hand, recognized-token 상태를 같은 문구로 뭉치지 않고 전투 입력 UI에서 분리해 보여주도록 정리했습니다.

## 목적

- player가 손 미검출, 손 안정화 중, token 인식 상태를 즉시 구분할 수 있게 합니다.
- camera/hand observation 상태를 local sequence progress와 server decision feedback에서 분리합니다.
- concrete frame recognizer runtime이 아직 선택되지 않은 상태에서도 기존 adapter boundary 안에서 안전하게 UI를 강화합니다.

## 범위

- `LiveCameraPanel`에 손 상태 전용 상태 스트립을 추가합니다.
- `no_hand`, `unstable`, `recognized` observation reason을 각각 별도 visual state로 표시합니다.
- recognized observation의 token을 live camera panel에서 별도 metric으로 표시합니다.
- 기존 input console의 sequence progress, submission readiness, server decision strip은 그대로 유지합니다.
- 구체 recognizer runtime 선택, frame recognizer 구현, restart/cleanup hardening은 이번 범위에 포함하지 않습니다.

## 구현 요약

- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
  - `LiveHandState`와 `LiveHandStateItem`을 추가했습니다.
  - `LiveCameraPanel`이 observation reason에서 손 상태를 계산하고 세 상태를 독립 항목으로 렌더링합니다.
  - 현재 observation token을 `현재 제스처` metric으로 표시합니다.
- `FE/app/src/platform/i18n/catalog.ts`
  - 손 상태 strip과 active/inactive label copy를 추가했습니다.
  - `no_hand` 관찰 상태 문구를 `손 없음`으로 명확히 했습니다.
- `FE/app/src/platform/theme/global.css`
  - 손 상태 strip의 responsive grid와 active state 색상을 추가했습니다.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - no-hand, unstable-hand, recognized-token 상태가 각각 active state로 전환되는 회귀 테스트를 추가했습니다.

## 상태 분리 기준

| Observation | UI state | Sequence progress 영향 | Server decision 영향 |
| --- | --- | --- | --- |
| `no_hand` | `손 없음` active | progress를 진행하지 않음 | 영향 없음 |
| `unstable` | `안정화` active | progress를 진행하지 않음 | 영향 없음 |
| `recognized` with token | `인식 토큰` active | 기존 normalized input boundary를 통해서만 progress 반영 | 직접 서버 판정을 우회하지 않음 |

## 검증

- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test -- BattleGameWorkspace.test.tsx`

## 남은 v2 선행조건

- `V2-E1-ST02`: concrete frame recognizer runtime 선택 및 adapter 결합.
