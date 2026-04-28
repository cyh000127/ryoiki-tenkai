# v2-1 라이브 인식 어댑터 구현 기록

## 목적

v1 이후 첫 번째 후속 작업으로, 브라우저 카메라 기반 라이브 인식 어댑터를 기존 normalized gesture input boundary에 연결했습니다.

## 범위

- 브라우저 카메라 권한 요청, 시작, 중지, 지원 불가, 권한 차단, 오류 상태를 하나의 adapter API로 감쌉니다.
- adapter가 관찰한 상태와 확정된 gesture token을 분리합니다.
- 확정 token만 `live_camera` source의 normalized input으로 battle flow에 전달합니다.
- 카메라 프레임과 raw tracking stream은 backend로 보내지 않습니다.
- 구체 frame recognizer는 adapter 뒤에서 교체할 수 있게 유지합니다.

## 구현 요약

- `FE/app/src/features/gesture-session/model/liveGestureRecognizer.ts`
  - `createBrowserLiveGestureRecognizer`를 추가했습니다.
  - `LiveGestureObservation`, `LiveGestureRecognizerStatus`, `LiveGestureFrameRecognizer` 경계를 추가했습니다.
  - frame recognizer가 없을 때는 안전한 no-op recognizer가 손 미검출 상태를 보고합니다.
- `FE/app/src/features/gesture-session/model/gestureInput.ts`
  - `createLiveCameraInput`으로 live camera token을 정규화합니다.
- `FE/app/src/features/battle-flow/model/battleFlow.ts`
  - `receiveGestureObservation` action을 추가해 카메라 관찰 상태가 sequence step을 진행시키지 않도록 했습니다.
- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
  - battle 화면에 live camera panel을 추가했습니다.
  - adapter의 recognized token은 내 턴이고 서버 확정 대기 중이 아닐 때만 gesture input으로 들어갑니다.
  - 그 외 관찰은 camera ready, hand detected, confidence, stability 표시만 갱신합니다.

## 검증

- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test`

## 후속 상태

- 카메라 권한 허용/거부 smoke 자동화는 `docs/implementation-artifacts/v2-2-camera-permission-smoke.ko.md`에서 완료했습니다.
- storage adapter persistence 전환은 `docs/implementation-artifacts/v2-3-storage-adapter-persistence.ko.md`에서 완료했습니다.
- 남은 선행조건은 구체 frame recognizer 바인딩과 정식 skill/resource 교체입니다.
