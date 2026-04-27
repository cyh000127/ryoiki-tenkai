# MVP v1 기술스택

이 문서는 MVP v1의 기술스택 결정 기록입니다. 새로운 런타임, 프레임워크, 데이터베이스, 큐, 인식 패키지, 테스트 도구를 도입하기 전에 먼저 갱신해야 합니다.

## 결정 원칙

- MVP 스토리를 막는 기능 공백이 없으면 현재 저장소 스택을 우선합니다.
- 전투 상태는 서버 권위로 유지하고, 클라이언트 인식은 입력 근거로만 사용합니다.
- 원시 camera frame과 raw tracking stream은 클라이언트에 둡니다.
- MVP 로컬 개발에서는 외부 인프라 제공자에 종속되지 않습니다.
- FE, BE, 입력 런타임, QA가 병렬 작업해도 로컬 smoke test가 가능한 작은 스택을 유지합니다.
- 새 의존성은 명확한 경계 뒤에 추가하고 최소 하나의 focused test를 둡니다.

## 확정 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프론트엔드 언어 | TypeScript | 전투 이벤트, gesture token, UI 상태 전이에 강한 계약을 제공합니다. |
| 프론트엔드 런타임 | React | 현재 앱 스캐폴드가 이미 사용 중이고 전투 UI에 충분합니다. |
| 프론트엔드 빌드 도구 | Vite | 현재 개발/프로덕션 스크립트가 사용 중입니다. |
| 프론트엔드 라우팅 | React Router | 현재 route shell 의존성입니다. |
| 서버 상태 클라이언트 | React Query | REST 설정 흐름, profile lookup, catalog, history, rating read에 적합합니다. |
| 클라이언트 상태 | feature-level reducer와 순수 state machine | global state framework 없이 battle flow와 gesture sequence logic을 테스트 가능하게 유지합니다. |
| 스타일링 | repository theme primitive 기반 plain CSS | 현재 UI 범위가 작아 component framework를 아직 추가하지 않습니다. |
| 입력 인식 경계 | browser camera input과 client-side hand-landmark adapter | camera data를 local에 두고 구체 인식 패키지를 하나의 adapter 뒤에서 교체할 수 있습니다. |
| 제스처 해석 | TypeScript sequence state machine | 이미 구현/테스트되어 stability, debounce, timeout, reset, failure reason을 처리합니다. |
| 백엔드 언어 | Python 3.13 | 현재 workspace와 lint 설정의 target입니다. |
| 백엔드 웹 런타임 | FastAPI on ASGI | 현재 API 스캐폴드가 REST와 WebSocket을 한 프로세스에서 지원합니다. |
| 백엔드 schema validation | Pydantic models | 현재 API schema와 settings에서 사용 중입니다. |
| 백엔드 도메인 구조 | API package와 pure core package | API 쓰기 소유권을 유지하면서 순수 규칙을 재사용합니다. |
| 관계형 저장소 | PostgreSQL-compatible SQL database | player, loadout, battle result, rating, history 영속화에 필요합니다. |
| 데이터베이스 접근 | SQLAlchemy와 Alembic migration | 현재 model, session boundary, migration setup이 존재합니다. |
| cache/queue 지원 | Redis-compatible key-value cache | queue membership, short-lived socket/session state, idempotency key에 적합합니다. |
| API 계약 | REST는 OpenAPI, async event는 JSON Schema | 현재 contract directory가 이미 이 형식을 사용합니다. |
| 실시간 채널 | WebSocket | polling-only 없이 matchmaking과 battle event를 전달하는 데 필요합니다. |
| 백엔드 패키지 관리 | uv workspace | 현재 Python workspace가 이 방식으로 구성되어 있습니다. |
| 프론트엔드 패키지 관리 | pnpm workspace | 현재 frontend script와 lockfile이 사용 중입니다. |
| 로컬 런타임 | container compose | 현재 web, API, database, cache service를 함께 시작합니다. |
| 백엔드 테스트 | pytest, httpx, ruff | 현재 backend check 경로입니다. |
| 프론트엔드 테스트 | Vitest, Testing Library, jsdom, TypeScript check | 현재 frontend check 경로입니다. |

## 입력 런타임 결정

MVP는 UI나 전투 로직을 특정 손 인식 패키지에 직접 결합하지 않습니다. live recognizer는 다음 경계 뒤에 둡니다.

- adapter는 browser camera input을 읽습니다.
- adapter는 정규화된 gesture observation을 내보냅니다.
  - `token`
  - `confidence`
  - `stability_ms`
  - `hand_detected`
  - `reason`
- sequence state machine은 정규화된 observation만 소비합니다.
- battle submission layer는 완료된 gesture token sequence만 받습니다.
- smoke test와 local debugging을 위해 fallback input을 유지합니다.

이 결정은 raw camera frame과 raw tracking stream을 클라이언트에 둔다는 MVP 규칙과 맞습니다.

## 백엔드 런타임 결정

MVP에서는 하나의 API process가 REST와 WebSocket 동작을 맡습니다. 측정 가능한 필요가 생길 때만 런타임을 분리합니다.

### API process 소유

- player와 profile command.
- loadout validation.
- queue command.
- WebSocket authentication과 event dispatch.
- battle action validation과 mutation.
- result, rating, history write.

### worker package 소유

- API 쓰기 소유권을 우회하지 않는 delayed/asynchronous processing.
- API가 authoritative state를 commit한 뒤 실행하는 follow-up job.

worker package는 MVP v1에서 두 번째 battle-state writer가 되면 안 됩니다.

## 영속성 결정

durable state는 relational storage에 둡니다.

- player profile.
- loadout.
- battle session.
- battle result.
- compact action audit.
- rating.
- match history.

short-lived operational state는 cache storage에 둡니다.

- queue membership.
- socket presence.
- temporary idempotency key.
- heartbeat 또는 reconnect metadata.

process restart 이후에도 product state로 살아야 하는 값은 relational storage에 둡니다.

## 프론트엔드 아키텍처 결정

현재 layered frontend shape를 유지합니다.

- `app`: provider와 app-level composition.
- `router`: route definition.
- `pages`: route-level screen.
- `widgets`: battle workspace 같은 큰 UI surface.
- `features`: state machine과 user-flow logic.
- `entities`: shared domain model.
- `platform`: API client, theme, localization, reusable UI primitive.
- `generated`: generated API client boundary.

반복 패턴이 실제 스토리에서 필요하지 않다면 새로운 frontend architecture layer를 추가하지 않습니다.

## 테스트 전략

### 스토리 인수인계 전 필수

- accepted/rejected battle action path에 대한 backend rule test.
- gesture와 battle-flow transition에 대한 frontend state-machine test.
- pending, accepted, rejected, opponent-turn, ended battle state에 대한 component test.
- REST 또는 async payload 변경 시 contract test.
- user-visible path 변경 시 local smoke checklist update.

### MVP 인수인계 전 필수

- backend check 통과.
- frontend typecheck, test, build 통과.
- container compose configuration 검증.
- deterministic fallback-input path로 valid action submission 1회 완료.
- invalid action path 1회를 server state mutation 없이 검증.

## 보류한 선택

다음은 MVP stack에 포함하지 않습니다.

- server-side camera frame processing.
- player 간 live media transport.
- 별도 realtime gateway process.
- general-purpose message broker.
- full account and identity platform.
- frontend component framework.
- server-rendered frontend framework.
- mobile-native runtime.
- advanced 3D rendering.
- production observability platform.

## 의존성 추가 규칙

의존성을 추가하기 전에 확인합니다.

- 현재 stack으로 target story를 완료할 수 없는가.
- dependency가 repository-owned interface 뒤에 격리되는가.
- raw camera frame 또는 raw tracking stream을 backend로 보내도록 요구하지 않는가.
- 외부 managed infrastructure 없이 local development에서 실행 가능한가.
- integration point를 커버하는 unit, component, contract test가 있는가.
- setup 또는 verification이 바뀌면 README나 planning docs가 업데이트되는가.

## 버전 정책

- 특정 스토리가 요구하지 않으면 현재 major version을 유지합니다.
- runtime family upgrade는 한 커밋에 하나씩 진행합니다.
- upgrade 후 관련 package check를 실행합니다.
- rule 구현에 필요한 경우가 아니라면 dependency upgrade와 battle-rule change를 섞지 않습니다.

## 에픽 매핑

| 에픽 | 주요 스택 영역 |
| --- | --- |
| E1 Player Entry and Loadout | FastAPI, Pydantic, SQLAlchemy, React, React Query |
| E2 Matchmaking and Session Handoff | FastAPI, WebSocket, cache, React, feature reducer |
| E3 Server-Authoritative Battle Engine | Python domain rule, SQLAlchemy, WebSocket event, pytest |
| E4 Client Gesture Input Runtime | Browser camera adapter, TypeScript state machine, Vitest |
| E5 Battle Workspace UI | React, Router, feature reducer, CSS theme primitive |
| E6 Rating, History, and Leaderboard | relational storage, SQLAlchemy, React Query |
| E7 Local Verification and Handoff | uv, pnpm, pytest, Vitest, ruff, container compose |
