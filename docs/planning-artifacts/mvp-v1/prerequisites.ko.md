# MVP v1 선행조건

이 문서는 각 주요 구현 영역을 시작하거나 병합하기 전에 충족해야 할 조건을 정리합니다.

## 전역 선행조건

- repository bootstrap command가 repository root에서 실행됩니다.
- backend와 frontend check script가 존재하고 문서화되어 있습니다.
- 새로운 runtime, framework, database, queue, recognition package, test tool을 추가하기 전에 `technology-stack.ko.md`와 `technology-stack.en.md`를 검토합니다.
- 소유권 경계가 명확합니다.
  - `BE/api`는 API contract, request handling, battle state write, persistence-facing service를 소유합니다.
  - `BE/core`는 pure domain rule과 value object를 소유합니다.
  - `BE/worker`는 API write ownership을 우회하지 않는 asynchronous processing을 소유합니다.
  - `FE/app`은 route, UI, client state, recognition adapter, socket consumer를 소유합니다.
  - `docs`는 planning, verification, handoff artifact를 소유합니다.
- planning docs는 명시적으로 승인되지 않은 외부 provider/product 이름을 피합니다.
- raw camera frame과 raw tracking stream은 backend로 전송하지 않습니다.

## 제품 선행조건

- MVP 범위는 browser-based, turn-based 1v1 battle로 제한합니다.
- server는 battle state, turn progression, action validation, timeout, surrender, result, rating, history에 대한 권위를 유지합니다.
- client recognition success는 local input evidence일 뿐 final skill activation이 아닙니다.
- MVP는 player 간 live media transport, spectator mode, social system, advanced replay, production account recovery를 제외합니다.

## 계약 선행조건

- FE consumer가 의존하기 전에 standard response/error shape가 정의되어 있어야 합니다.
- REST contract는 다음을 포함합니다.
  - player create 또는 restore.
  - profile lookup.
  - skillset catalog.
  - animset catalog.
  - loadout update.
  - queue enter, cancel, status.
  - battle snapshot lookup.
  - surrender.
  - history.
  - rating 또는 leaderboard.
- socket contract는 다음을 포함합니다.
  - connection authentication.
  - ping 또는 heartbeat.
  - match-found.
  - battle-started.
  - action submission.
  - action accepted.
  - action rejected.
  - state updated.
  - timeout.
  - surrendered.
  - battle ended.
- 모든 state-mutating command는 stable command/action identifier를 포함합니다.

## 백엔드 선행조건

- player identity model이 queue 또는 battle session ownership 전에 존재해야 합니다.
- loadout validation이 queue entry 수락 전에 존재해야 합니다.
- skill cost, cooldown, damage, gesture sequence metadata가 battle action validation 전에 존재해야 합니다.
- battle event를 client에 emit하기 전에 socket token validation이 존재해야 합니다.
- accepted action mutation 전에 idempotency strategy가 존재해야 합니다.
- rating/history feature를 완료로 보기 전에 battle result storage가 존재해야 합니다.
- timeout과 surrender rule은 구현 전에 문서화되어야 합니다.

## 프론트엔드 선행조건

- battle screen 추가 전에 route shell과 application state boundary가 존재해야 합니다.
- user-visible string 추가 전에 locale/copy catalog를 업데이트해야 합니다.
- battle UI가 socket event에 의존하기 전에 server event reducer 또는 adapter가 존재해야 합니다.
- client가 actionable state가 아닐 때 input control은 비활성화되어야 합니다.
- debug control은 normal play surface와 분리되어야 합니다.
- compact/desktop layout에서 text overflow와 UI overlap을 확인해야 합니다.

## Gesture Runtime 선행조건

- MVP gesture token name이 정의되고 stable해야 합니다.
- smoke test용 skill sequence가 최소 세 개 존재해야 합니다.
- sequence state machine은 다음을 노출해야 합니다.
  - idle 또는 waiting state.
  - progress state.
  - complete state.
  - failed state.
  - timeout state.
  - reset behavior.
- recognition adapter는 raw recognition output을 token, confidence, stability metadata로 정규화해야 합니다.
- end-to-end smoke test가 live hand input에 의존하기 전에 deterministic fallback input이 있어야 합니다.

## 영속성 선행조건

- local MVP development용 storage boundary가 선택되어야 합니다.
- match creation이 session을 쓰기 전에 battle session record shape가 알려져야 합니다.
- battle end 구현 전에 result record shape가 알려져야 합니다.
- completed result를 replay/re-read할 수 있으므로 rating update는 idempotent해야 합니다.
- history record는 compact action metadata만 저장합니다.

## QA 선행조건

- UI behavior를 신뢰하기 전에 backend rule path에 unit test가 있어야 합니다.
- frontend reducer 또는 component가 pending, accepted, rejected, opponent-turn, ended state를 테스트해야 합니다.
- socket authentication은 valid/invalid token test를 가져야 합니다.
- 새로운 user-visible MVP path가 생기면 smoke checklist를 업데이트해야 합니다.
- handoff 전에 targeted provider-name scan을 실행합니다.

## 병합 준비 선행조건

스토리를 병합하기 전에 확인합니다.

- story가 epic과 acceptance criteria에 연결되어 있습니다.
- automated test가 주요 success path와 의미 있는 failure path 하나 이상을 커버합니다.
- setup, verification, behavior가 바뀌면 README 또는 docs가 업데이트되어 있습니다.
- raw camera 또는 raw tracking upload를 도입하지 않습니다.
- deferred MVP exclusion을 약속하지 않습니다.
- local check가 통과하거나 blocker가 handoff note에 문서화되어 있습니다.

## 구현을 멈춰야 하는 blocker

- 구현하려는 feature에 합의된 battle state contract가 없습니다.
- feature를 local에서 검증할 방법이 없습니다.
- frontend feature가 아직 정의되지 않은 backend behavior를 요구합니다.
- backend feature가 client에 남아야 할 raw recognition data 수신을 요구합니다.
- story가 prerequisite story 완료 전에 rating, history, timeout, reconnect behavior에 의존합니다.
