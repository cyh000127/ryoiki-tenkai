# MVP v1 에픽

이 문서는 MVP를 구현 에픽으로 나눕니다. 각 에픽은 제품 결과, 엔지니어링 경계, 포함 스토리, 수용 신호를 설명합니다. 스토리 실행 세부사항은 `stories.ko.md`를 사용합니다.

## Epic E1: Player Entry and Loadout

### 목표

플레이어가 가벼운 identity로 앱에 진입하고, 승인된 skill/presentation preset을 확인한 뒤 valid battle loadout을 저장합니다.

### 제품 결과

- full account system 없이 시작할 수 있습니다.
- client가 local session에서 player profile을 복구할 수 있습니다.
- matchmaking 전에 선택한 skillset과 presentation set이 서버에서 승인됩니다.

### 엔지니어링 경계

- Backend는 player profile, token issuance, preset catalog, loadout validation을 소유합니다.
- Frontend는 start, restore, preset selection, loadout confirmation screen을 소유합니다.
- Storage는 MVP loop에 필요한 최소 profile/loadout state만 보관합니다.

### 스토리

- E1-ST01: lightweight player identity 생성 또는 복구.
- E1-ST02: approved skillset과 presentation-set catalog 제공.
- E1-ST03: player loadout 저장과 검증.

### 수용 신호

- profile lookup이 identifier, nickname, rating, record, current loadout을 반환합니다.
- invalid preset identifier는 standard error shape로 거부됩니다.
- battle entry UI는 valid loadout이 없으면 matchmaking을 막습니다.

## Epic E2: Matchmaking and Session Handoff

### 목표

loadout을 갖춘 player를 ranked 1v1 matchmaking에 넣고 battle session을 만든 뒤 server event로 battle screen에 인계합니다.

### 제품 결과

- player가 queue 진입, 취소, 상태 확인을 할 수 있습니다.
- matched pair가 initial state를 가진 battle session을 받습니다.
- client는 match handoff에서 server event를 source of truth로 취급합니다.

### 엔지니어링 경계

- Backend는 queue membership, match creation, battle session creation, socket event emission을 소유합니다.
- Frontend는 queue status rendering과 battle workspace 전환을 소유합니다.

### 스토리

- E2-ST01: matchmaking queue 진입, 취소, 조회.
- E2-ST02: player session용 socket connection 인증.
- E2-ST03: match-found와 battle-started event 발행.
- E2-ST04: reconnect 후 battle snapshot 복구.

### 수용 신호

- queue command는 반복 호출에도 idempotent합니다.
- invalid socket token은 battle event stream이 열리기 전에 거부됩니다.
- match handoff는 battle session id, player seat, turn owner, deadline, HP, mana, cooldown, visible status를 포함합니다.

## Epic E3: Server-Authoritative Battle Engine

### 목표

모든 battle action을 backend에서 판정해 client gesture recognition이 battle state를 직접 바꾸지 못하게 합니다.

### 제품 결과

- valid gesture action이 HP, mana, cooldown, battle log, turn owner에 영향을 줍니다.
- invalid, duplicate, out-of-turn, timeout, surrender path가 예측 가능하게 처리됩니다.
- final battle result가 result/history view에서 조회됩니다.

### 엔지니어링 경계

- Backend는 battle rule validation, action idempotency, state mutation, turn progression, timeout, surrender, end condition, result recording을 소유합니다.
- Frontend는 local input feedback을 소유하고 server confirmation 전에는 skill effect를 적용된 것으로 보여주지 않습니다.

### 스토리

- E3-ST01: submitted battle action 검증.
- E3-ST02: accepted action을 정확히 한 번 적용.
- E3-ST03: invalid, duplicate, out-of-turn, insufficient-resource, cooldown-blocked action 거부.
- E3-ST04: timeout과 surrender path 해결.
- E3-ST05: battle 종료와 outcome 기록.

### 수용 신호

- duplicate action identifier가 damage, cost, cooldown, rating, history write를 중복하지 않습니다.
- server rejection은 client feedback에 쓸 수 있는 reason code를 포함합니다.
- battle end가 final state를 emit하고 result를 저장합니다.

## Epic E4: Client Gesture Input Runtime

### 목표

local hand recognition output을 battle action으로 제출 가능한 안정적인 gesture token sequence로 변환합니다.

### 제품 결과

- player가 camera readiness, hand detection, current gesture, sequence progress, failure reason을 볼 수 있습니다.
- live camera 조건 없이도 local test mode로 skill submission을 반복 검증할 수 있습니다.
- raw camera frame과 raw tracking data는 client에 남습니다.

### 엔지니어링 경계

- Frontend는 recognition adapter, gesture token normalization, sequence state machine, debug state, fallback input을 소유합니다.
- Backend는 normalized action metadata와 gesture sequence만 받습니다.

### 스토리

- E4-ST01: MVP gesture token set과 skill sequence 정의.
- E4-ST02: stability, debounce, timeout, reset, failure reason을 가진 sequence state machine 구현.
- E4-ST03: deterministic smoke check용 test 또는 fallback input mode 추가.
- E4-ST04: recognized sequence를 battle action submission에 연결.

### 수용 신호

- no-hand, unstable-hand, recognized-gesture, sequence-complete, sequence-failed state가 구분됩니다.
- local sequence success는 backend confirmation 전까지 skill effect를 적용하지 않습니다.
- success, wrong token, timeout, reset, duplicate stability path를 unit test가 커버합니다.

## Epic E5: Battle Workspace UI

### 목표

turn ownership, input progress, server confirmation, battle outcome을 이해할 수 있는 playable battle workspace를 제공합니다.

### 제품 결과

- player가 자신의 턴과 필요한 입력을 알 수 있습니다.
- pending, accepted, rejected, opponent turn, timeout, surrender, end state가 보입니다.
- normal play와 debug information이 분리됩니다.

### 엔지니어링 경계

- Frontend는 route composition, battle state projection, action form, recognition feedback, event handling, result screen, local copy를 소유합니다.
- Backend contract는 UI가 렌더링하는 event와 snapshot payload를 정의합니다.

### 스토리

- E5-ST01: battle state, player stat, turn state, action log 렌더링.
- E5-ST02: local sequence progress와 submission readiness 표시.
- E5-ST03: pending server confirmation과 rejected action reason 표시.
- E5-ST04: battle result와 next action 렌더링.

### 수용 신호

- player turn이 아니거나 submission pending이면 input이 비활성화됩니다.
- rejected action은 visible battle state를 바꾸지 않고 reason을 보여줍니다.
- result view는 winner, rating delta, end reason, continue action을 보여줍니다.

## Epic E6: Rating, History, and Leaderboard

### 목표

완료된 전투 이후 경쟁 진행도를 볼 수 있도록 최소 상태를 저장합니다.

### 제품 결과

- completed battle 후 rating이 변경됩니다.
- match history가 completed battle을 반영합니다.
- 간단한 leaderboard 또는 rating view가 active player를 정렬할 수 있습니다.

### 엔지니어링 경계

- Backend는 result persistence, rating update, history lookup, leaderboard lookup을 소유합니다.
- Frontend는 result, history, rating view를 소유합니다.

### 스토리

- E6-ST01: battle result와 compact action audit 저장.
- E6-ST02: battle end 후 rating update 적용.
- E6-ST03: match history와 rating view 제공.
- E6-ST04: client에서 history와 rating 렌더링.

### 수용 신호

- completed match가 result resolution 후 history에 나타납니다.
- rating delta는 repeated result read에도 안정적입니다.
- history는 raw camera frame 또는 raw tracking stream을 저장하지 않습니다.

## Epic E7: Local Verification and Handoff

### 목표

local setup, check, smoke test, MVP exclusion을 명확히 하여 병렬 구현을 안전하게 지속합니다.

### 제품 결과

- developer가 repository docs만 보고 bootstrap, check, MVP loop verification을 수행할 수 있습니다.
- deferred work가 보이고 current implementation scope로 섞이지 않습니다.
- handoff가 FE, BE, socket, battle, input-runtime path의 깨짐을 잡을 수 있습니다.

### 엔지니어링 경계

- repository docs는 setup, planning artifact, smoke checklist, exclusion tracking을 소유합니다.
- FE/BE test는 구현된 behavior의 automated verification을 소유합니다.

### 스토리

- E7-ST01: setup과 verification command 유지.
- E7-ST02: local handoff용 smoke checklist 유지.
- E7-ST03: MVP exclusion과 follow-up candidate 추적.
- E7-ST04: provider-neutral documentation과 copy 유지.

### 수용 신호

- README가 active MVP plan, epics, stories, implementation order, prerequisites, smoke checklist를 연결합니다.
- smoke checklist가 source change 없이 blocker를 기록할 수 있습니다.
- documentation이 external provider 또는 product-specific naming을 피합니다.
