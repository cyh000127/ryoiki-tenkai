# MVP v1 명세 점검

이 문서는 현재 구현이 MVP v1 명세를 어디까지 충족하는지 빠르게 확인하기 위한 점검 스냅샷입니다.

## 점검 기준

- 점검 시점: `2026-04-28`
- 기준 문서
  `docs/implementation-artifacts/mvp-v1-implementation-plan.ko.md`
  `docs/planning-artifacts/mvp-v1/stories.ko.md`
  `docs/planning-artifacts/mvp-v1/implementation-order.ko.md`

## 종합 판단

- 핵심 플레이 루프는 명세 기준으로 실제 동작합니다.
  player entry -> loadout -> queue -> WebSocket handoff -> battle -> result -> history/rating -> runtime persistence
- v1 기능 MVP는 릴리스 준비 완료 상태입니다.
- 릴리스 차단 항목은 없습니다.
- 스토리 상태 집계
  `done 28`
  `partial 0`
  `planned 0`
- 현재 구현은 Phase 0 ~ Phase 8의 핵심 항목을 모두 충족했습니다.
- 현재 추적 중인 MVP 스토리는 모두 `done` 상태입니다.

## 완료된 명세 범위

- `E1` Player Entry and Loadout
  guest 생성/복구, profile lookup, `skillset` / `animset` catalog, `loadout` 저장과 queue 진입 가드가 구현되었습니다.
- `E2` Matchmaking and Session Handoff
  queue enter/cancel/status, socket token 인증, `battle.match_ready`, `battle.match_found`, `battle.started`, reconnect snapshot 복구가 구현되었습니다.
- `E3` Server-Authoritative Battle Engine
  action validation, exact-once apply, rejection path, timeout, surrender, battle end와 outcome 기록이 구현되었습니다.
- `E4-ST01` Gesture Token Contract
  normalized gesture token set과 default skill-to-sequence mapping이 shared fixture와 cross-stack test로 고정되었습니다.
- `E5-ST01` Battle Workspace State View
  HP, mana, cooldown, turn owner, deadline, selected skill status, battle log가 최신 server snapshot 기준으로 렌더링됩니다.
- `E5-ST02` Sequence Progress and Submission Readiness
  current step, remaining step, progress indicator, submission readiness, local progress state, server rejection feedback가 분리되어 렌더링됩니다.
- `E5-ST04` Battle Result and Next Action
  winner/loser, end reason, rating delta, result summary, rematch/history/home action이 결과 화면에서 렌더링됩니다.
- `E6` Rating, History, and Leaderboard
  result persistence, compact action audit, rating update, history/leaderboard endpoint, client 전적/레이팅 화면이 구현되었습니다.
- `E7` Local Verification and Handoff
  README command, smoke checklist, MVP exclusion 문서가 유지되고 있습니다.

## 부분 완료 명세

- 현재 partial 상태의 MVP 스토리는 없습니다.

## 구현된 핵심 사용자 시나리오

- 저장된 player를 복구하고 바로 loadout/queue 상태를 이어갈 수 있습니다.
- valid `loadout`이 없으면 matchmaking entry가 차단됩니다.
- queue 진입 후 WebSocket handoff로 battle workspace가 초기화됩니다.
- valid action은 서버 승인 뒤 state update가 반영됩니다.
- invalid, duplicate, out-of-turn, timeout, surrender path는 서버 권위 규칙으로 처리됩니다.
- reconnect 시 latest battle snapshot 또는 ended result state가 복구됩니다.
- completed battle은 history, rating, leaderboard에 반영되고 runtime store에 저장됩니다.

## 현재 구현 문서화 위치

- 루트 사용 문서
  `README.md`
- 구현 기준 문서
  `docs/implementation-artifacts/mvp-v1-implementation-plan.ko.md`
- 스토리 상태 원천
  `docs/planning-artifacts/mvp-v1/stories.ko.md`
- smoke checklist
  `docs/implementation-artifacts/smoke-test-checklist.ko.md`

## 다음 우선순위

- v2 또는 follow-up hardening
  live recognizer adapter 연결, 실기기 카메라 smoke 자동화, production persistence 전환, 정식 리소스 교체를 진행합니다.
