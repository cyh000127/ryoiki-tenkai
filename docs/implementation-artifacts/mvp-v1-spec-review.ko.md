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
- 스토리 상태 집계
  `done 23`
  `partial 5`
  `planned 0`
- 현재 구현은 Phase 0 ~ Phase 8의 핵심 항목을 대부분 충족했습니다.
- 남은 작업은 신규 시스템 추가보다 `입력 런타임 보강`, `battle UX polish`, `smoke coverage`에 가깝습니다.

## 완료된 명세 범위

- `E1` Player Entry and Loadout
  guest 생성/복구, profile lookup, `skillset` / `animset` catalog, `loadout` 저장과 queue 진입 가드가 구현되었습니다.
- `E2` Matchmaking and Session Handoff
  queue enter/cancel/status, socket token 인증, `battle.match_ready`, `battle.match_found`, `battle.started`, reconnect snapshot 복구가 구현되었습니다.
- `E3` Server-Authoritative Battle Engine
  action validation, exact-once apply, rejection path, timeout, surrender, battle end와 outcome 기록이 구현되었습니다.
- `E6` Rating, History, and Leaderboard
  result persistence, compact action audit, rating update, history/leaderboard endpoint, client 전적/레이팅 화면이 구현되었습니다.
- `E7` Local Verification and Handoff
  README command, smoke checklist, MVP exclusion 문서가 유지되고 있습니다.

## 부분 완료 명세

### E4-ST01: MVP gesture token set과 skill sequence 정의

- 현재 상태
  기본 `skillset`에 3개 skill sequence가 들어 있고 UI/서버가 같은 sequence를 사용합니다.
- 남은 이유
  gesture token set 자체를 독립 계약이나 shared fixture로 명확히 고정한 문서/테스트가 부족합니다.

### E4-ST03: deterministic test 또는 fallback input 추가

- 현재 상태
  프론트에서 deterministic sequence 입력과 테스트용 fallback 흐름은 사용할 수 있습니다.
- 남은 이유
  live camera adapter와 debug-only fallback input의 경계가 아직 충분히 분리되어 있지 않습니다.

### E5-ST01: battle state와 action log 렌더링

- 현재 상태
  HP, mana, turn owner, turn number, battle log는 렌더링됩니다.
- 남은 이유
  deadline timer, cooldown detail, richer battle state 표현은 아직 충분하지 않습니다.

### E5-ST02: sequence progress와 submission readiness 표시

- 현재 상태
  progress, current step, confirmation status, local failure reason은 렌더링됩니다.
- 남은 이유
  compact/desktop layout polish와 local/server feedback separation을 더 다듬을 필요가 있습니다.

### E5-ST04: battle result와 next action 렌더링

- 현재 상태
  result screen, end reason, rating change, rematch, history 진입은 구현되었습니다.
- 남은 이유
  next action UX와 result presentation polish는 아직 partial 상태가 맞습니다.

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

- `E4-ST03`
  live camera recognition adapter와 fallback/debug 입력 경계를 더 분리합니다.
- `E5-ST01`, `E5-ST02`, `E5-ST04`
  battle timer/deadline, cooldown 상세, compact/mobile UX, result polish를 보강합니다.
- `E7-ST02`
  local smoke coverage를 실제 실행 기준으로 더 채웁니다.
