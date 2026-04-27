# MVP v1 구현 및 검증 계획

이 문서는 v1 제품/엔지니어링 계획에서 도출한 MVP 구현 기준입니다. FE, BE, 입력 런타임 작업자가 병렬로 작업하더라도 소유권 규칙을 흐리지 않도록 저장소 계획과 QA 확인에 초점을 둡니다.

## 상세 계획 문서

- `docs/planning-artifacts/mvp-v1/technology-stack.ko.md`: 선택한 MVP 기술스택, 경계, 보류 항목, 의존성 추가 규칙.
- `docs/planning-artifacts/mvp-v1/epics.ko.md`: 에픽 수준의 결과, 경계, 스토리, 수용 신호.
- `docs/planning-artifacts/mvp-v1/stories.ko.md`: 스토리 단위 구현 항목, 상태, 범위, 의존성, 검증 메모.
- `docs/planning-artifacts/mvp-v1/implementation-order.ko.md`: 권장 구현 순서와 커밋 순서.
- `docs/planning-artifacts/mvp-v1/prerequisites.ko.md`: 제품, 계약, FE, BE, 입력 런타임, 영속성, QA, 병합 선행조건.

## 제품 기준

- 손동작 입력으로 동작하는 브라우저 기반 턴제 1v1 전투 루프를 만든다.
- 설정, 조회, 대기열 진입 흐름은 REST를 사용한다.
- 매칭 진행과 전투 이벤트의 주 채널은 WebSocket을 사용한다.
- 전투 상태, 행동 검증, 턴 진행, 최종 결과는 서버가 권위를 가진다.
- 손 인식은 클라이언트에서 실행하고, 백엔드는 정규화된 행동 메타데이터와 제스처 시퀀스만 받는다.
- 고급 연출보다 상태 정합성, 이해 가능한 입력 피드백, 반복 가능한 검증을 우선한다.

## 아키텍처 결정

### WebSocket 중심 전투 흐름

- 클라이언트는 전투 준비 상태에 들어가기 전에 인증된 WebSocket 연결을 연다.
- 매칭과 전투 화면은 상태 변경을 polling에만 의존하지 않고 이벤트 메시지를 구독한다.
- 전투 행동 제출은 안정적인 `action_id`, `battle_session_id`, `turn_number`, `gesture_sequence`를 사용한다.
- 서버는 accepted, rejected, state-updated, timeout, ended 이벤트를 단일 진실 공급원으로 보낸다.
- REST는 초기 플레이어 설정, loadout 설정, queue 명령, 전투 snapshot 조회, history, rating 조회에 남긴다.

### 서버 권위 규칙

- 서버는 match 생성, battle session 생성, turn owner, HP, mana, cooldown, timeout, surrender, win/loss, rating 변경, match history 저장을 소유한다.
- 클라이언트 인식 성공은 최종 스킬 발동으로 취급하지 않는다.
- 서버는 현재 턴, sequence 유효성, resource, cooldown, 중복 `action_id`, session 상태를 검증한 뒤 전투 변경을 적용한다.
- 중복 action 제출은 idempotent해야 하며 damage, cost, cooldown, rating, history write를 두 번 적용하지 않는다.
- reconnect 또는 지연 이벤트는 최신 서버 snapshot 기준으로 해석한다.

### 클라이언트 손 인식

- 카메라 프레임과 원시 tracking 데이터는 클라이언트에 둔다.
- 클라이언트는 손 인식 결과를 정규화된 gesture token sequence로 변환한다.
- UI는 camera ready, hand detected, current gesture, target sequence step, confidence 또는 stability, failure reason을 보여준다.
- 로컬 UI는 즉시 피드백할 수 있지만 전투 상태 변경은 서버 확인 뒤에만 반영한다.
- debug view는 개발용으로 허용하지만 일반 플레이 화면과 분리한다.

## MVP 범위

- guest 또는 simple player identity.
- 서버 승인 skillset과 presentation-set 선택.
- ranked 1v1 matchmaking entry, cancel, matched 상태.
- turn-based battle session start, action submission, timeout, surrender, end.
- skill rule에 따른 gesture sequence validation.
- HP, mana, cooldown, turn owner, battle log update.
- rating change와 match history persistence.
- 최소 result, history, leaderboard view.
- 저장소에 로컬 setup과 verification command 문서화.

## MVP 제외 범위

- 플레이어 간 실시간 영상 또는 음성 전송.
- 서버 측 camera frame analysis 또는 raw tracking 저장.
- spectator mode, team battle, party flow, guild/social system, chat.
- full replay video, cinematic battle replay, advanced 3D presentation.
- 설명하거나 반복 수행하기 어려운 복잡한 skill gesture.
- production-grade account recovery, billing, moderation, external identity integration.
- multi-region deployment, autoscaling, production observability beyond local traceability.

## 구현 스트림

### Backend

- player, loadout, matchmaking, battle snapshot, surrender, history, rating, WebSocket token 흐름의 API 계약을 확정한다.
- WebSocket session authentication, connection lifecycle, event dispatch, reconnection behavior를 구현한다.
- queue matching과 battle session creation을 구현한다.
- turn owner, gesture sequence, resource state, cooldown, duplicate action, timeout, surrender, end condition 검증을 구현한다.
- match result, rating change, audit/debug용 최소 action log를 저장한다.
- service-level rejection path와 idempotency를 focused test로 커버한다.

### Frontend

- start, loadout, queue, battle, result, history/rating, minimal settings의 playable route flow를 만든다.
- 서버 상태는 query/socket adapter에 두고, local recognition state는 feature-level input module에 둔다.
- 서버 이벤트에서 WebSocket connection status, turn status, action result, timeout, battle end state를 렌더링한다.
- clear progress와 failure state를 가진 hand recognition feedback을 렌더링한다.
- debug panel은 일반 사용자 flow와 시각적으로 분리한다.
- 기능이 생긴 뒤 launch-critical state에 대한 component/browser check를 추가한다.

### Input Runtime

- 작은 MVP gesture token set과 최소 세 개의 skill sequence를 정의한다.
- stability threshold, debounce, timeout, reset, failure reason을 가진 client-side sequence state machine을 구현한다.
- live camera 조건에 의존하지 않는 deterministic fallback 또는 test mode를 제공한다.
- false negative, false positive, timeout, permission-blocked path를 진단할 수 있는 local debug 정보를 기록한다.

### QA and Documentation

- README link를 setup과 verification entrypoint 기준으로 최신화한다.
- local, API, WebSocket, battle-loop, client-recognition, documentation check를 위한 smoke checklist를 유지한다.
- parallel worker가 deferred work에 시간을 쓰지 않도록 MVP exclusion을 명시한다.
- handoff 전에 요청된 금칙성 용어 repository scan을 실행한다.

## 수용 기준

- 로컬 개발자가 README의 setup과 verification command를 실행할 수 있다.
- 플레이어가 앱 진입, loadout 선택, matchmaking 진입, battle 진입, valid gesture sequence 제출, server-confirmed result 수신, match outcome 확인을 할 수 있다.
- invalid, duplicate, out-of-turn, insufficient-resource, cooldown, timeout, disconnect, surrender path가 서버 규칙에 의해 거부되거나 완료된다.
- 클라이언트 피드백이 camera readiness, hand detection, sequence progress, local input failure, server rejection, confirmed skill activation을 구분한다.
- match result, rating change, history가 저장되고 조회된다.
- MVP exclusion이 구현 목표, 제품 문구, 문서에 섞이지 않는다.
