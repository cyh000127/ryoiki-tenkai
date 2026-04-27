# MVP v1 구현 순서

이 문서는 권장 빌드 순서를 정의합니다. presentation polish보다 안정적인 계약, 서버 권위 전투 규칙, 반복 가능한 로컬 검증을 먼저 둡니다.

## Phase 0: Repository Baseline

### 목적

기능 작업이 확장되기 전에 workspace를 실행 가능한 상태로 유지합니다.

### 작업

1. bootstrap, backend check, frontend check, boundary check를 확인합니다.
2. README entrypoint를 최신으로 유지합니다.
3. 구현 의존성을 추가하기 전에 선택한 기술스택을 문서화합니다.
4. docs와 user-facing copy에서 provider-neutral naming을 유지합니다.

### 종료 기준

- repository setup command가 문서화되어 있습니다.
- automated check가 repository root에서 실행됩니다.
- 새 작업의 owning directory가 명확합니다.
- technology stack 변경이 `technology-stack.ko.md`와 `technology-stack.en.md`에 반영되어 있습니다.

## Phase 1: Contracts and Domain Fixtures

### 목적

화면을 동작에 연결하기 전에 FE, BE, input runtime이 공유하는 payload와 domain fixture를 정의합니다.

### 작업

1. player, loadout, catalog, queue, battle snapshot, battle event, action submission, result, history, rating contract를 정의합니다.
2. MVP gesture token과 skill sequence를 정의합니다.
3. 필수 payload field와 rejection shape에 대한 contract test를 추가합니다.

### 종료 기준

- REST와 socket event payload가 MVP story에 필요한 범위를 커버합니다.
- skill sequence가 deterministic하고 testable합니다.
- feature consumer가 의존하기 전에 contract change가 검토됩니다.

## Phase 2: Player Entry and Loadout

### 목적

player가 battle-ready state에 도달하게 합니다.

### 작업

1. lightweight player create/restore flow를 구현하거나 보강합니다.
2. approved skillset과 animset catalog를 구현합니다.
3. loadout save와 validation을 구현합니다.
4. start와 loadout screen을 렌더링합니다.

### 종료 기준

- player가 profile을 생성하거나 복구할 수 있습니다.
- queue entry 전에 valid loadout이 필요합니다.
- invalid catalog selection은 backend에서 거부됩니다.

## Phase 3: Socket Session and Matchmaking

### 목적

battle-ready player를 queue에 넣고 server event를 통해 battle session으로 이동합니다.

### 작업

1. socket token validation과 connection lifecycle을 구현합니다.
2. queue enter, cancel, status behavior를 구현합니다.
3. match creation과 battle session creation을 구현합니다.
4. match-found와 battle-started event를 emit합니다.
5. queue state를 렌더링하고 battle workspace로 전환합니다.

### 종료 기준

- valid socket session이 event를 수신합니다.
- invalid socket session은 거부됩니다.
- queue state가 idempotent합니다.
- battle-started event가 client battle workspace를 초기화합니다.

## Phase 4: Battle Engine Core

### 목적

backend를 battle state change의 단일 권위자로 만듭니다.

### 작업

1. battle action payload를 검증합니다.
2. accepted action을 정확히 한 번 적용합니다.
3. invalid, duplicate, out-of-turn, insufficient-resource, cooldown-blocked action을 거부합니다.
4. accepted, rejected, state-updated event를 emit합니다.
5. 각 rule path에 unit test를 추가합니다.

### 종료 기준

- client submission은 backend confirmation 없이 state를 변경하지 않습니다.
- duplicate action id가 state change를 중복하지 않습니다.
- rejection reason code가 stable하고 client에서 mapping됩니다.

## Phase 5: Client Gesture Runtime

### 목적

local hand recognition output을 stable gesture sequence로 만들고 completed sequence만 제출합니다.

### 작업

1. gesture sequence state machine을 구현하거나 완성합니다.
2. live hand input용 recognition adapter boundary를 추가합니다.
3. local smoke test용 deterministic fallback input을 추가합니다.
4. completed sequence를 battle action submission에 연결합니다.
5. raw camera와 raw tracking data를 local에 유지합니다.

### 종료 기준

- sequence state가 progress, complete, failure, timeout, reset path를 커버합니다.
- fallback input이 known valid sequence를 제출할 수 있습니다.
- completed local sequence가 하나의 pending server action을 만듭니다.

## Phase 6: Battle Workspace UX

### 목적

normal/failure path에서 playable loop를 이해 가능하고 견고하게 만듭니다.

### 작업

1. HP, mana, cooldown, turn owner, timer, battle log를 렌더링합니다.
2. sequence progress와 local failure reason을 렌더링합니다.
3. pending, accepted, rejected, opponent turn, timeout, surrender, ended state를 렌더링합니다.
4. compact/desktop layout에서 text overflow와 UI overlap을 확인합니다.

### 종료 기준

- player's actionable state가 아니면 input이 비활성화됩니다.
- server rejection이 skill effect를 시각적으로 적용하지 않습니다.
- battle end가 result view로 이어집니다.

## Phase 7: Persistence, Rating, and History

### 목적

completed battle을 기록하고 competitive progress를 노출합니다.

### 작업

1. battle result와 compact action audit을 저장합니다.
2. battle end 후 rating update를 한 번 적용합니다.
3. history와 rating lookup endpoint를 노출합니다.
4. result, history, rating view를 렌더링합니다.

### 종료 기준

- completed battle이 result resolution 후 조회됩니다.
- rating delta가 deterministic하고 idempotent합니다.
- history가 raw camera와 raw tracking data를 제외합니다.

## Phase 8: Reconnect, Timeout, and Surrender Hardening

### 목적

end-to-end handoff 전에 battle-loop의 가장 큰 위험을 줄입니다.

### 작업

1. active battle snapshot restore를 구현합니다.
2. reconnect 후 socket session을 reattach합니다.
3. turn timeout을 해결합니다.
4. surrender를 해결합니다.
5. delayed event를 latest server snapshot과 대조합니다.

### 종료 기준

- reconnect가 latest battle state를 복구합니다.
- timeout과 surrender가 battle을 stuck 상태로 남기지 않습니다.
- ended battle이 추가 action을 거부합니다.

## Phase 9: End-to-End Smoke and Handoff

### 목적

clean start부터 recorded match outcome까지 MVP loop를 검증합니다.

### 작업

1. automated backend/frontend check를 실행합니다.
2. local runtime smoke check를 실행합니다.
3. valid battle action path 하나를 완료합니다.
4. invalid action path 하나를 완료합니다.
5. battle을 종료하고 result, rating, history를 확인합니다.
6. blocker를 follow-up work로 문서화합니다.

### 종료 기준

- smoke checklist가 완료되었거나 blocker가 문서화되었습니다.
- README와 planning link가 최신입니다.
- deferred feature가 MVP acceptance criteria에 섞이지 않습니다.

## 권장 커밋 순서

1. Contracts and fixtures.
2. Player and loadout API.
3. Matchmaking and socket session.
4. Battle engine validation and mutation.
5. Client gesture sequence runtime.
6. Battle workspace event handling and feedback.
7. Result, rating, and history persistence.
8. Reconnect, timeout, and surrender hardening.
9. Smoke checklist and documentation refresh.
