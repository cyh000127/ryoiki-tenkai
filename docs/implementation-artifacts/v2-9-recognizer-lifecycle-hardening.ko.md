# v2-9 recognizer lifecycle hardening 구현 기록

이 문서는 `V2-E1-ST04`의 구현 기록입니다. concrete frame recognizer runtime 선택은 계속 `V2-E1-ST02`에 남겨두고, 현재 브라우저 카메라 adapter 경계 안에서 stop/start, unmount cleanup, permission recovery 동작을 회귀 테스트로 고정했습니다.

## 목적

- camera permission 요청이 아직 끝나기 전에 player가 stop 또는 화면 이탈을 수행해도 늦게 도착한 stream이 다시 `ready` 상태를 만들지 않게 합니다.
- permission denied 이후 같은 adapter instance가 다시 start를 시도해 `ready` 상태로 복구될 수 있게 합니다.
- battle workspace unmount 시 live recognizer가 반드시 정리되도록 검증합니다.

## 범위

- concrete frame recognizer runtime이나 skill/resource mapping은 구현하지 않습니다.
- raw frame 또는 raw tracking stream을 backend로 보내지 않습니다.
- adapter lifecycle version을 사용해 stale async start 결과를 무시합니다.
- pending start 취소 시 뒤늦게 획득된 stream track을 즉시 stop합니다.

## 구현 요약

- `FE/app/src/features/gesture-session/model/liveGestureRecognizer.ts`
  - `start()` 호출마다 lifecycle version을 부여하고 `stop()`이 version을 갱신하도록 했습니다.
  - stale start 결과가 stream/play 이후에 도착해도 interval 생성과 `ready` 전환을 막습니다.
  - stale stream은 track을 즉시 stop합니다.
- `FE/app/tests/unit/liveGestureRecognizer.test.ts`
  - permission resolve 전에 stop한 pending start가 `ready`로 되살아나지 않는지 검증합니다.
  - permission denied 후 재시도해서 `ready` 상태로 복구되는지 검증합니다.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - battle workspace unmount 시 live recognizer `stop()`이 호출되는지 검증합니다.

## Lifecycle Rule

| 상황 | 결과 |
| --- | --- |
| `start()` 중 `stop()` 호출 | 늦은 stream 결과 무시, track stop, `stopped` 유지 |
| permission denied 이후 재시도 | `blocked` 이후 새 `starting`/`ready` 전환 허용 |
| battle workspace unmount | socket close와 live recognizer cleanup 수행 |
| concrete runtime 미선택 | no-op frame recognizer fallback 유지 |

## 검증

- `pnpm --dir FE/app exec vitest run tests/unit/liveGestureRecognizer.test.ts tests/unit/BattleGameWorkspace.test.tsx`
- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test`
- `pnpm --dir FE/app smoke:camera`
- `pnpm --dir FE/app build`

## 남은 v2 선행조건

- `V2-E1-ST02`: concrete frame recognizer runtime 선택 및 adapter 결합.
- `V2-E4-ST01` 이후: approved skill domain source 확보.
