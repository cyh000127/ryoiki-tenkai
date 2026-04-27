# MVP v1 스토리

이 문서는 MVP 에픽을 스토리 크기의 구현 단위로 나눕니다. 상태 값은 다음과 같습니다.

- `done`: 현재 스캐폴드에 구현됨.
- `partial`: 기반은 있으나 MVP 스토리가 완성되지는 않음.
- `planned`: 아직 구현되지 않음.

## E1: Player Entry and Loadout

### E1-ST01: lightweight player identity 생성 또는 복구

- Status: partial
- User story: player는 full account system 없이 battle loop에 들어가기 위해 lightweight local identity를 생성하거나 복구할 수 있다.
- Scope: player identifier/display name 생성, REST/socket setup에 쓸 session token 발급, stored local state에서 profile 복구.
- Acceptance criteria: profile lookup이 player id, nickname, rating, record, current loadout을 반환한다. local state가 없거나 만료되면 broken screen 대신 new start flow로 간다. 외부 identity provider가 필요하지 않다.
- Dependencies: player profile storage model, standard error response shape.
- Verification: backend create/lookup test, frontend restored player rendering test.

### E1-ST02: approved skillset과 animset catalog 제공

- Status: partial
- User story: player는 battle에 선택 가능한 approved skillset과 animset preset을 볼 수 있다.
- Scope: skill id/name/cost/cooldown/gesture sequence 반환, UI에 필요한 animset metadata 반환, MVP catalog를 deterministic하게 유지.
- Acceptance criteria: catalog endpoint가 stable `skillset_id`와 `animset_id`를 반환한다. skill sequence metadata가 normalized gesture token을 사용한다. invalid `skillset_id` 또는 `animset_id`는 loadout update에서 수락되지 않는다.
- Dependencies: MVP gesture token set, skill rule model.
- Verification: catalog payload contract test, selectable skillset과 animset frontend rendering test.

### E1-ST03: player loadout 저장과 검증

- Status: partial
- User story: player는 matchmaking 전에 battle-ready configuration을 저장할 수 있다.
- Scope: skillset과 animset selection 검증, current loadout 저장, profile/battle setup view에 loadout 노출.
- Acceptance criteria: valid loadout이 저장되고 profile lookup에 반환된다. invalid loadout은 standard validation error를 반환한다. valid loadout 없이는 matchmaking entry가 차단된다.
- Dependencies: E1-ST02 approved catalog.
- Verification: backend validation test, frontend battle-entry guard test.

## E2: Matchmaking and Session Handoff

### E2-ST01: matchmaking queue 진입, 취소, 조회

- Status: partial
- User story: loadout을 갖춘 player는 ranked 1v1 queue에 들어가거나 취소하고 상태를 확인할 수 있다.
- Scope: queue entry command, queue cancel command, queue status lookup, repeated command idempotency.
- Acceptance criteria: repeated enter가 duplicate queue entry를 만들지 않는다. repeated cancel 후 player는 queue 밖에 있다. queue status는 waiting/matched/idle을 명확히 반환한다.
- Dependencies: E1-ST03 valid loadout.
- Verification: backend repeated command service test, frontend queue-state rendering test.

### E2-ST02: socket connection 인증

- Status: done
- User story: system은 battle event를 보내기 전에 player socket connection을 검증할 수 있다.
- Scope: player용 socket token 발급 또는 검증, invalid token 거부, connection을 player id에 binding.
- Acceptance criteria: valid token은 socket session을 연다. invalid token은 event processing 전에 close된다. socket message는 authenticated player와 연결된다.
- Dependencies: E1-ST01 player session.
- Verification: valid/invalid token backend socket test.

### E2-ST03: match-found와 battle-started event 발행

- Status: partial
- User story: queue에 있는 player는 polling-only behavior 없이 battle로 이동시키는 server event를 받는다.
- Scope: match-found event emit, battle session creation, full initial state를 가진 battle-started event emit.
- Acceptance criteria: event payload가 battle session id, player seat, initial stat, turn owner, deadline, visible status를 포함한다. client가 event data로 battle workspace에 전환한다. duplicate event가 active session을 중복 생성하지 않는다.
- Dependencies: E2-ST01 queue membership, E3 battle state model.
- Verification: socket contract test, frontend event reducer test.

### E2-ST04: reconnect 후 battle snapshot 복구

- Status: planned
- User story: player는 reconnect 후 latest battle state를 볼 수 있다.
- Scope: active battle snapshot lookup, socket session reattach, delayed/missed event를 latest snapshot 기준으로 resolve.
- Acceptance criteria: reconnected client가 latest HP, mana, cooldown, turn number, turn owner를 렌더링한다. submitted action id는 reconnect 후에도 idempotent하다. ended battle은 result state로 복구된다.
- Dependencies: E3-ST02 idempotent action application, E6-ST01 result persistence.
- Verification: backend snapshot test, frontend reconnect-state test.

## E3: Server-Authoritative Battle Engine

### E3-ST01: submitted battle action 검증

- Status: done
- User story: backend는 battle state를 변경하기 전에 action submission을 검증한다.
- Scope: battle session id, player id, turn number, action id, skill id, gesture sequence 검증, accepted/rejected event 반환.
- Acceptance criteria: wrong turn, wrong sequence, missing battle, ended battle은 거부된다. valid action은 state update 전에 accepted event를 받는다. rejection reason은 UI feedback에 충분히 구체적이다.
- Dependencies: E1-ST02 skill sequence metadata, E2-ST02 authenticated socket.
- Verification: accepted/rejected submission backend unit test.

### E3-ST02: accepted action을 정확히 한 번 적용

- Status: partial
- User story: backend는 valid battle action을 한 번만 적용해 state consistency를 유지한다.
- Scope: action id deduplication, damage/resource cost/cooldown/battle log/turn progression 적용, mutation 후 state update event emit.
- Acceptance criteria: duplicate action id는 duplicate mutation 없이 stable result를 반환한다. state update는 changed HP, mana, cooldown, log entry, turn owner, next deadline을 포함한다. replayed accepted action이 rating/history write를 중복하지 않는다.
- Dependencies: E3-ST01 validation, battle state storage.
- Verification: backend idempotency test.

### E3-ST03: invalid battle action path 거부

- Status: partial
- User story: backend는 battle rule 위반 action을 state change 없이 거부한다.
- Scope: out-of-turn action, invalid gesture sequence, insufficient mana, active cooldown, ended battle action.
- Acceptance criteria: rejected action이 reason code를 emit하고 snapshot은 unchanged다. client가 reason code를 localized copy에 mapping할 수 있다. rejection path가 focused test로 커버된다.
- Dependencies: E3-ST01 validation, skill cost/cooldown model.
- Verification: backend rejection-path test, frontend rejection rendering test.

### E3-ST04: timeout과 surrender path 해결

- Status: planned
- User story: system은 멈춘 턴이나 포기를 처리해 battle이 멈추지 않게 한다.
- Scope: turn timeout rule, surrender command, timeout/surrender/resulting state event emission.
- Acceptance criteria: timeout은 documented rule에 따라 turn을 넘기거나 battle을 끝낸다. surrender는 battle을 즉시 종료하고 winner를 정확히 기록한다. result는 한 번만 기록된다.
- Dependencies: battle clock model, E6-ST01 result persistence.
- Verification: backend timeout/surrender test.

### E3-ST05: battle 종료와 outcome 기록

- Status: planned
- User story: backend는 win/loss condition이 충족되면 battle을 종료하고 outcome을 기록한다.
- Scope: HP depletion end condition, final event emission, result write.
- Acceptance criteria: battle end가 winner, loser, reason, final stat, rating delta placeholder/value를 emit한다. ended battle은 이후 action을 거부한다. result는 history/result view에서 조회된다.
- Dependencies: E6-ST01 result persistence.
- Verification: backend end-condition test.

## E4: Client Gesture Input Runtime

### E4-ST01: MVP gesture token set과 skill sequence 정의

- Status: partial
- User story: battle loop 설계자는 설명하고 테스트하기 쉬운 작은 gesture token set과 skill sequence를 정의할 수 있다.
- Scope: token model, skill-to-sequence mapping, frontend/backend shared expectation.
- Acceptance criteria: 최소 세 개의 MVP skill sequence가 존재한다. 각 sequence는 normalized token을 사용한다. sequence metadata가 UI guidance에 보인다.
- Dependencies: E1-ST02 catalog shape.
- Verification: contract test 또는 shared fixture test.

### E4-ST02: gesture sequence state machine 구현

- Status: done
- User story: player는 noisy single-frame result 대신 stable sequence progress를 받는다.
- Scope: stability threshold, debounce, timeout, reset, failure reason state.
- Acceptance criteria: correct sequence가 complete state에 도달한다. wrong token은 failure state를 만든다. timeout은 predictable하게 reset 또는 fail한다. duplicate stable token이 step을 잘못 건너뛰지 않는다.
- Dependencies: E4-ST01 token set.
- Verification: success, wrong token, timeout, reset, stability frontend unit test.

### E4-ST03: deterministic test 또는 fallback input 추가

- Status: partial
- User story: developer는 live camera 조건 없이 battle submission을 테스트할 수 있다.
- Scope: manual gesture token input, test mode sequence submission, normal play와 분리된 debug state.
- Acceptance criteria: known valid sequence가 local smoke test에서 제출 가능하다. fallback input은 backend validation을 우회하지 않는다. debug control이 normal game control과 혼동되지 않는다.
- Dependencies: E4-ST02 sequence state machine, E5-ST02 sequence progress UI.
- Verification: frontend interaction test.

### E4-ST04: recognized sequence를 battle action submission에 연결

- Status: planned
- User story: player는 valid local sequence 완료 시 backend confirmation을 위한 battle action을 제출한다.
- Scope: complete sequence를 action payload로 변환, battle session id/turn number/skill id/action id/gesture sequence 포함, accepted/rejected server response 대기.
- Acceptance criteria: completion이 하나의 pending action submission을 만든다. UI는 server confirmation을 기다린다. failed local sequence는 submit하지 않는다.
- Dependencies: E2-ST02 authenticated socket, E3-ST01 action validation, E5-ST03 pending/rejection UI.
- Verification: frontend reducer/component test, socket integration test.

## E5: Battle Workspace UI

### E5-ST01: battle state와 action log 렌더링

- Status: partial
- User story: player는 현재 battle state를 빠르게 이해할 수 있다.
- Scope: player/opponent HP, mana/cooldown, turn owner/deadline, recent battle log.
- Acceptance criteria: state가 latest server snapshot 또는 event를 반영한다. opponent turn에서는 player action input이 비활성화된다. battle log가 accepted action과 주요 event를 보여준다.
- Dependencies: E2-ST03 battle-started event, E3-ST02 state update event.
- Verification: frontend component test.

### E5-ST02: sequence progress와 submission readiness 표시

- Status: partial
- User story: player는 기대되는 gesture step과 제출 준비 여부를 볼 수 있다.
- Scope: current step, remaining steps, progress indicator, local failure reason.
- Acceptance criteria: UI가 waiting, progressing, complete, failed, reset state를 구분한다. local feedback과 server rejection feedback이 분리된다. compact/desktop layout에서 text가 맞는다.
- Dependencies: E4-ST02 state machine.
- Verification: frontend component test.

### E5-ST03: pending confirmation과 rejected action reason 표시

- Status: done
- User story: player는 제출한 action이 pending, accepted, rejected 중 어디에 있는지 안다.
- Scope: pending state, accepted state, rejected state/reason, pending 중 input lock.
- Acceptance criteria: pending 동안 submit button 또는 input이 disabled다. accepted action은 server event에서 visible battle state를 진행한다. rejected action은 battle state를 바꾸지 않고 reason을 보여준다.
- Dependencies: E3-ST01 action validation.
- Verification: frontend battle flow test.

### E5-ST04: battle result와 next action 렌더링

- Status: planned
- User story: player는 battle 종료 후 match outcome과 다음 행동을 볼 수 있다.
- Scope: winner/loser, end reason, rating delta, rematch 또는 return action.
- Acceptance criteria: final battle event 후 result screen이 보인다. rating delta가 backend result와 일치한다. player는 queue 또는 history로 돌아갈 수 있다.
- Dependencies: E3-ST05 battle end, E6-ST02 rating update.
- Verification: frontend result rendering test.

## E6: Rating, History, and Leaderboard

### E6-ST01: battle result와 compact action audit 저장

- Status: planned
- User story: backend는 completed battle result와 compact action audit을 저장할 수 있다.
- Scope: battle result record, compact action log, player별 retrieval.
- Acceptance criteria: result가 한 번만 기록된다. action audit은 raw camera와 raw tracking data를 제외한다. history lookup이 recent completed battle을 반환한다.
- Dependencies: E3-ST05 battle end, storage migration 또는 repository implementation.
- Verification: backend persistence test.

### E6-ST02: battle end 후 rating update 적용

- Status: planned
- User story: player는 completed ranked battle 후 rating 변화를 받는다.
- Scope: rating calculation, rating delta storage, profile/result exposure.
- Acceptance criteria: winner/loser가 deterministic delta를 받는다. result re-read가 rating을 다시 적용하지 않는다. profile rating이 latest completed battle을 반영한다.
- Dependencies: E6-ST01 result persistence.
- Verification: backend rating test.

### E6-ST03: match history와 rating view 제공

- Status: planned
- User story: player는 recent match와 rating position을 검토할 수 있다.
- Scope: history endpoint, rating/leaderboard endpoint, MVP용 pagination 또는 small fixed list.
- Acceptance criteria: history가 recent match summary를 반환한다. rating view가 rankable entry 또는 current player rating context를 반환한다. empty state가 명확하다.
- Dependencies: E6-ST01, E6-ST02.
- Verification: backend API test.

### E6-ST04: client에서 history와 rating 렌더링

- Status: planned
- User story: player는 client에서 recent match result와 rating change를 볼 수 있다.
- Scope: result list, rating summary, empty state.
- Acceptance criteria: completed match가 battle end 후 표시된다. rating delta가 result view와 일관된다. loading, empty, error state가 보인다.
- Dependencies: E6-ST03 endpoints.
- Verification: frontend component test.

## E7: Local Verification and Handoff

### E7-ST01: setup과 verification command 유지

- Status: done
- User story: developer는 문서화된 command로 repository check를 실행할 수 있다.
- Scope: bootstrap command, boundary check, backend check, frontend check.
- Acceptance criteria: README가 current command를 나열한다. command는 repository root에서 실행된다. failed check는 actionable하다.
- Dependencies: repository scripts.
- Verification: handoff 중 manual command execution.

### E7-ST02: smoke checklist 유지

- Status: done
- User story: developer는 launch-critical path를 smoke checklist로 검증할 수 있다.
- Scope: repository/runtime/REST/socket/battle/client recognition/end-to-end loop check.
- Acceptance criteria: checklist가 implemented/planned MVP surface를 커버한다. source code 변경 없이 blocker를 기록할 수 있다. checklist가 provider-neutral하다.
- Dependencies: MVP plan.
- Verification: documentation review.

### E7-ST03: MVP exclusion과 follow-up candidate 추적

- Status: done
- User story: team은 MVP에서 제외된 것을 알고 구현을 집중할 수 있다.
- Scope: exclusion list, deferred feature list, follow-up candidate note.
- Acceptance criteria: exclusion이 planning docs에서 보인다. deferred work가 MVP acceptance criteria로 취급되지 않는다. product copy가 excluded behavior를 약속하지 않는다.
- Dependencies: MVP baseline.
- Verification: documentation review.

### E7-ST04: provider-neutral documentation과 copy 유지

- Status: done
- User story: team은 승인되지 않은 specific provider/product name을 code comment, docs, user-facing copy에서 피한다.
- Scope: documentation wording, frontend copy, local naming, handoff check.
- Acceptance criteria: planning docs가 가능한 generic technology category를 사용한다. user-facing copy가 external provider name을 피한다. repository scan을 handoff 전에 실행할 수 있다.
- Dependencies: documentation policy.
- Verification: targeted text scan.
