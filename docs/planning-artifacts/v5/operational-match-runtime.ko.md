# v5 운영형 매칭/전투 runtime 설계 초안

현재 상태: `blocked`. PostgreSQL과 Redis는 Compose에 포함되어 있지만, queue/session store, battle owner lease, timeout worker, event bus 전환은 아직 구현하지 않는다. 운영형 multi-process 배포가 필요해지는 시점에 아래 설계를 기준으로 별도 작업을 시작한다.

## 배경

현재 구현은 player, history, rating, compact audit는 PostgreSQL에 저장하지만, matchmaking queue와 active battle session은 backend 프로세스 메모리에 유지한다.

이 구조는 로컬 개발과 단일 프로세스 데모에는 충분하지만, 운영형 환경에서는 아래 문제가 생긴다.

- API 프로세스를 2개 이상 띄우면 queue가 프로세스마다 갈라진다.
- WebSocket 연결을 담당하는 프로세스와 battle state를 가진 프로세스가 달라질 수 있다.
- 프로세스 재시작 시 active battle과 timeout ownership이 사라진다.
- reconnect가 다른 프로세스로 들어오면 최신 queue/battle 상태를 안정적으로 재생하기 어렵다.

## 목표

- queue와 active battle runtime을 multi-process 안전한 구조로 분리한다.
- WebSocket gateway는 stateless에 가깝게 유지한다.
- battle 판정은 단일 owner가 수행하되 reconnect와 replay는 어느 프로세스에서든 가능하게 한다.
- PostgreSQL은 durable snapshot과 결과 저장소로 유지하고, hot runtime state는 별도 store를 사용한다.

## 권장 구조

### 1. Queue store

- Redis를 queue store로 사용한다.
- `queue:ranked_1v1` sorted set에 `player_id`와 `queued_at`을 저장한다.
- `queue:player:{player_id}` hash에 현재 queue 상태, loadout snapshot, ws presence id를 저장한다.
- idempotent enter/cancel을 위해 `queue ticket id`를 발급한다.

### 2. Matchmaker worker

- 별도 worker가 Redis queue를 읽어 pairing을 수행한다.
- pair가 성립하면 `battle_session_id`를 발급하고 battle snapshot을 생성한다.
- 생성된 battle snapshot은 PostgreSQL과 Redis battle cache에 함께 기록한다.
- pair 결과는 pub/sub 또는 stream으로 websocket gateway에 전달한다.

### 3. Battle runtime store

- Redis hash 또는 JSON document에 active battle snapshot을 저장한다.
- key 예시:
  - `battle:{battle_session_id}:snapshot`
  - `battle:{battle_session_id}:owner`
  - `battle:{battle_session_id}:deadline`
- owner key에는 lease 만료 시간을 둬서 한 runtime만 판정 책임을 갖게 한다.

### 4. Battle action 처리

- WebSocket submit은 직접 repository를 호출하지 않고 command queue로 보낸다.
- battle owner worker만 command를 consume해 순서대로 판정한다.
- 판정 후:
  - Redis battle snapshot 갱신
  - PostgreSQL snapshot/결과 반영
  - player별 event stream publish

### 5. WebSocket gateway

- WebSocket gateway는 연결 등록, 인증, event fanout만 담당한다.
- player connection은 `presence:{player_id}`에 기록한다.
- gateway는 `player:{player_id}:events` stream 또는 pub/sub channel을 구독해 이벤트를 전달한다.
- reconnect 시 gateway는 현재 queue 상태와 latest battle snapshot을 store에서 읽어 replay한다.

### 6. Timeout worker

- timeout은 각 API 프로세스가 임의로 판단하면 안 된다.
- 별도 timeout worker가 `battle:*:deadline`을 스캔하거나 sorted set을 구독해 만료를 처리한다.
- timeout worker는 owner lease를 획득한 뒤 battle 종료를 확정하고 종료 이벤트를 publish한다.

## 저장소 역할 분리

| 저장소 | 역할 |
| --- | --- |
| PostgreSQL | player profile, loadout, rating, history, compact audit, ended battle snapshot |
| Redis | queue, active battle snapshot, owner lease, deadline index, websocket presence, event fanout |

## 필요한 경계

현재 `game_state_repository`는 queue, active battle, persistence를 한 객체에서 모두 처리한다. 운영형으로 옮기려면 아래 port로 나누는 편이 안전하다.

- `QueueStorePort`
- `BattleRuntimeStorePort`
- `BattleCommandBusPort`
- `BattleEventBusPort`
- `BattleSnapshotRepository`

이후 API route와 websocket handler는 위 port를 호출하고, in-memory 구현은 local/dev adapter로만 남긴다.

## 단계별 구현 순서

운영형 전환은 한 번에 바꾸지 않고, 먼저 경계만 분리한 뒤 저장소를 교체한다. 현재 코드의 사용자 플로우를 깨지 않으려면 아래 순서를 지킨다.

### 작업 1. Runtime 경계 분리

- API/websocket에서 in-memory repository 직접 호출 지점을 port 기반 service로 감싼다.
- local adapter는 기존 in-memory 구현을 재사용한다.
- 이 단계에서는 동작 변경 없이 구조만 분리한다.
- 완료 기준:
  - API route와 websocket handler가 구체 repository 대신 service/port를 호출한다.
  - 현재 단일 프로세스 테스트가 그대로 통과한다.
  - Redis adapter는 아직 붙이지 않는다.

권장 커밋 수:
1. `refactor(backend): queue and battle runtime ports 분리`
2. `refactor(api): websocket and game routes를 runtime service로 연결`

### 작업 2. Queue를 Redis로 이동

- queue enter/status/cancel을 Redis adapter로 이전한다.
- pairing은 별도 matchmaker worker가 수행한다.
- `battle.match_ready`와 `battle.match_found` 발행을 event bus로 이동한다.
- 완료 기준:
  - 동일 player의 queue enter/cancel이 idempotent하게 동작한다.
  - 두 API 프로세스가 같은 Redis queue를 본다.
  - reconnect가 queue 상태를 Redis에서 복구한다.

권장 커밋 수:
1. `feat(backend): redis queue store 추가`
2. `feat(worker): ranked pairer worker 추가`
3. `feat(api): queue status and event replay를 redis 기반으로 전환`

### 작업 3. Active battle runtime과 timeout ownership 이동

- active battle snapshot을 Redis + PostgreSQL snapshot 조합으로 이동한다.
- submit action은 battle owner worker만 처리한다.
- timeout worker와 reconnect replay를 event stream 기준으로 전환한다.
- 완료 기준:
  - battle owner lease가 하나의 worker에만 부여된다.
  - submit action은 command queue를 통해 순서대로 처리된다.
  - timeout, surrender, ended result가 event stream으로 fanout된다.

권장 커밋 수:
1. `feat(runtime): active battle store and owner lease 추가`
2. `feat(worker): battle action processor and timeout worker 추가`
3. `feat(websocket): reconnect snapshot replay와 event fanout 전환`

## 구현 시 주의점

- raw camera frame이나 landmark를 backend runtime 저장소로 보내지 않는다.
- queue 진입 시 player의 loadout snapshot을 함께 저장해 mid-match loadout drift를 막는다.
- reconnect replay는 `latest snapshot + unread events` 조합으로 설계하면 stale state를 줄이기 쉽다.
- battle owner lease는 짧게 두고 heartbeat로 연장해야 zombie owner를 줄일 수 있다.
- rating/history 확정은 ended battle 시점에만 PostgreSQL commit으로 닫는다.

## 이번 v5 범위 밖

- 완전한 spectator/event sourcing 시스템
- cross-region websocket fanout
- raw gesture verification backend
- classifier 학습 데이터 파이프라인

## 다음 구현 착수 조건

- 운영 환경에서 API 프로세스를 2개 이상 띄울 계획이 확정된다.
- Redis를 runtime store로 사용할지, managed queue/event bus를 쓸지 결정된다.
- timeout worker를 어느 프로세스/컨테이너에서 운영할지 정한다.
- battle snapshot을 PostgreSQL에 어느 주기로 저장할지 정한다.
