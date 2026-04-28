# v2-11 recognizer runtime port smoke 구현 기록

이 문서는 concrete frame recognizer runtime 선택 없이, 기존 camera permission smoke가 `LiveGestureFrameRuntime` port를 실제 브라우저 경로에서 통과하도록 보강한 기록입니다. 이후 `docs/implementation-artifacts/v2-12-browser-frame-signal-runtime.ko.md`에서 runtime binding이 완료되었습니다.

## 범위

- 외부 runtime dependency를 추가하지 않습니다.
- concrete frame recognizer runtime을 선택하거나 구현하지 않습니다.
- smoke fixture의 allowed camera path가 `runtime.start()`와 `session.stop()` 호출을 검증합니다.
- permission denied path에서는 runtime session이 시작되지 않는지 검증합니다.
- raw frame, raw landmark, raw tracking stream은 backend로 보내지 않습니다.

## 구현 내용

- `FE/app/tests/smoke/liveCameraPermission.smoke.ts`
  - allowed camera smoke가 `frameRecognizer` shortcut 대신 fake `runtime` option을 사용하도록 변경했습니다.
  - `runtimeStarts`, `runtimeStops`, `recognitionCalls` 관측값을 결과에 포함했습니다.
  - allowed path에서 runtime start/stop과 frame recognition 호출을 검증합니다.
  - denied path에서 runtime start/stop/recognition이 발생하지 않는지 검증합니다.

## 보류 항목

- `V2-E1-ST02`의 concrete runtime 선택과 binding은 이 단계에서는 blocked였고, 이후 `v2-12`에서 완료되었습니다.
- 이 smoke는 runtime port lifecycle만 검증하며, 실제 recognizer 품질이나 gesture accuracy를 검증하지 않습니다.
- 스킬명, 스킬 효과, resource key, visual asset은 구현하지 않았습니다.

## 검증

- `pnpm --dir FE/app smoke:camera`
- `pnpm --dir FE/app typecheck`
- `git diff --check`
- provider-neutral targeted text scan

## 다음 단계

1. 후속 기록은 `docs/implementation-artifacts/v2-12-browser-frame-signal-runtime.ko.md`를 확인합니다.
2. 다른 runtime으로 교체하려면 fake runtime smoke와 별개로 concrete runtime smoke 또는 unit fixture를 추가합니다.
