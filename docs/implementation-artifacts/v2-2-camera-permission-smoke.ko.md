# v2-2 카메라 권한 smoke 자동화 구현 기록

## 목적

브라우저 카메라 권한 허용/거부 경로를 반복 가능한 자동 smoke 명령으로 검증합니다.

## 범위

- live recognizer adapter를 실제 브라우저 컨텍스트에서 import해 `getUserMedia` 허용 경로를 확인합니다.
- 권한 허용 시 `ready` 상태와 `live_camera` normalized input 생성을 확인합니다.
- 권한 거부 시 `blocked` 상태가 나오고 gesture input이 생성되지 않는지 확인합니다.
- battle workspace UI에서 `권한 차단` 상태가 표시되고 action submission으로 들어가지 않는지 단위 테스트로 고정합니다.
- 기본 smoke는 fake camera device를 사용합니다. 실제 장치로 확인할 때는 `LIVE_CAMERA_SMOKE_REAL_DEVICE=true`를 사용할 수 있습니다.

## 실행 명령

```bash
pnpm --dir FE/app smoke:camera
```

브라우저 런타임이 없는 로컬 환경에서는 최초 1회만 아래 명령으로 런타임을 설치합니다.

```bash
pnpm --dir FE/app exec playwright install chromium
```

## 구현 요약

- `FE/app/playwright.camera-smoke.config.ts`
  - camera smoke 전용 browser runner 설정을 추가했습니다.
  - `LIVE_CAMERA_SMOKE_REAL_DEVICE=true`일 때 fake device 대신 실제 장치 권한 경로를 사용할 수 있습니다.
- `FE/app/tests/smoke/liveCameraPermission.smoke.ts`
  - 권한 허용 smoke와 권한 거부 smoke를 분리했습니다.
- `FE/app/tests/smoke/live-camera-fixture.html`
  - 앱 API 흐름과 분리된 최소 브라우저 fixture를 추가했습니다.
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`
  - 권한 차단 UI 상태가 action submission으로 이어지지 않음을 테스트했습니다.

## 검증

- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test -- tests/unit/BattleGameWorkspace.test.tsx`
- `pnpm --dir FE/app smoke:camera`

## 남은 v2 선행조건

- 구체 frame recognizer 패키지 또는 런타임 바인딩 선택.
- production persistence 전환.
- 정식 skill/resource 교체.
