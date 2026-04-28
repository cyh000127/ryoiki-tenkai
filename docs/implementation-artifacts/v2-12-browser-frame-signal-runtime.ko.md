# v2-12 browser frame signal runtime 구현 기록

이 문서는 `V2-E1-ST02`의 구현 기록입니다. 외부 runtime dependency를 추가하지 않고, 브라우저 video frame에서 계산한 local signal만 사용해 live recognizer runtime을 기본 경로에 연결했습니다.

## 범위

- `LiveGestureFrameRuntime` 기본 구현을 no-op에서 browser frame signal runtime으로 교체합니다.
- raw frame과 raw tracking data는 backend로 보내지 않습니다.
- frame 분석 결과는 `confidence`, `stabilityMs`, `reason`, `token` 형태의 normalized observation으로만 전달합니다.
- 스킬명, 스킬 효과, resource key, visual asset은 구현하지 않습니다.

## 구현 내용

- `FE/app/src/features/gesture-session/model/liveGestureRuntime.ts`
  - `createBrowserFrameSignalRecognizer`와 `createBrowserFrameSignalRuntime`을 추가했습니다.
  - canvas downsample을 사용해 frame contrast/motion을 scalar signal로 변환합니다.
  - expected token이 안정 시간 동안 유지될 때만 `recognized` observation을 반환합니다.
  - frame signal이 없거나 낮으면 `no_hand`, 안정 시간이 부족하면 `unstable`을 반환합니다.
- `FE/app/src/features/gesture-session/model/liveGestureRecognizer.ts`
  - 명시 runtime이나 test frame recognizer가 없을 때 browser frame signal runtime을 기본값으로 사용합니다.
  - 기존 no-op runtime export는 테스트와 명시 fallback 용도로 유지합니다.
- `FE/app/tests/unit/liveGestureRecognizer.test.ts`
  - stable frame signal이 expected token으로 정규화되는지 검증합니다.
  - signal drop 시 stability가 reset되는지 검증합니다.
  - runtime wrapper가 browser frame signal recognizer를 session으로 제공하는지 검증합니다.
- `BE/api/src/gesture_api/api/routes/health.py`
  - safe health summary의 `recognizerRuntime` 값을 `browser_frame_signal`로 갱신했습니다.

## 보류 항목

- `V2-E4-ST01`부터 `V2-E4-ST04`까지의 skill/resource domain intake는 approved domain source가 필요하므로 blocked 유지합니다.
- 이 runtime은 provider-neutral local frame signal runtime입니다. 별도 hand landmark runtime으로 교체하려면 새 기술 선택 문서와 smoke test가 필요합니다.

## 검증

- `pnpm --dir FE/app exec vitest run tests/unit/liveGestureRecognizer.test.ts`
- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test`
- `pnpm --dir FE/app smoke:camera`
- `pnpm --dir FE/app build`
- `uv run ruff check BE`
- `uv run pytest BE`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode full`
- `git diff --check`
- provider-neutral targeted text scan
