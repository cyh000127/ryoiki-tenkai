# v2-10 recognizer runtime port 구현 기록

이 문서는 `V2-E1-ST02`의 blocker를 해제하지 않고, concrete frame recognizer runtime을 나중에 붙일 수 있도록 현재 live camera adapter 내부 port를 분리한 기록입니다.

## 범위

- 외부 runtime dependency를 추가하지 않습니다.
- concrete frame recognizer runtime을 선택하거나 구현하지 않습니다.
- 기존 `frameRecognizer` 테스트 옵션과 smoke fixture 호환성을 유지합니다.
- runtime startup, per-camera session, session stop cleanup 경계를 분리합니다.
- raw frame, raw landmark, raw tracking stream은 backend로 보내지 않습니다.

## 구현 내용

- `FE/app/src/features/gesture-session/model/liveGestureRuntime.ts`
  - `LiveGestureFrameRuntime`, `LiveGestureRuntimeSession`, `LiveGestureRuntimeStartContext` 타입을 추가했습니다.
  - 기존 frame recognizer 함수를 runtime session으로 감싸는 adapter helper를 추가했습니다.
  - noop recognizer를 별도 runtime module로 이동해 concrete runtime 교체 지점을 분리했습니다.
- `FE/app/src/features/gesture-session/model/liveGestureRecognizer.ts`
  - browser camera lifecycle에서 `runtime.start({ video })`가 session을 만들고, cleanup에서 `session.stop()`을 호출하도록 변경했습니다.
  - 기존 `frameRecognizer` option은 계속 지원합니다.
  - runtime startup 실패 시 camera stream과 video binding을 정리하고 `error` 상태로 전환합니다.
- `FE/app/tests/unit/liveGestureRecognizer.test.ts`
  - runtime session start/stop lifecycle 회귀 테스트를 추가했습니다.
  - runtime startup 실패 시 camera resource cleanup 회귀 테스트를 추가했습니다.

## 보류 항목

- `V2-E1-ST02`의 concrete runtime 선택과 package binding은 아직 blocked입니다.
- runtime 후보 비교, bundle 영향, browser support 검증은 별도 승인 후 진행합니다.
- 스킬명, 스킬 효과, resource key, visual asset은 구현하지 않았습니다.

## 검증

- `pnpm --dir FE/app exec vitest run tests/unit/liveGestureRecognizer.test.ts`
- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test`
- `pnpm --dir FE/app smoke:camera`
- `pnpm --dir FE/app build`
- `git diff --check`
- provider-neutral targeted text scan

## 다음 단계

1. runtime 선택이 승인되면 `LiveGestureFrameRuntime` 구현체를 추가합니다.
2. selected runtime과 선택 근거를 `docs/planning-artifacts/v2/technology-stack.ko.md`에 기록합니다.
3. concrete runtime smoke 또는 unit fixture를 추가한 뒤 `V2-E1-ST02` 상태를 재검토합니다.
