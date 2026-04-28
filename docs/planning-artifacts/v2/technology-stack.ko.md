# v2 기술스택 결정 기록

이 문서는 v2에서 유지하거나 새로 선택한 기술 경계를 정리합니다. v1에서 이미 선택된 스택은 유지하고, recognition runtime과 운영 토폴로지는 `done`으로 고정하며, 스킬 도메인 명세는 승인 전까지 `blocked`로 유지합니다.

## 유지하는 스택

| 영역 | 선택 | v2 방침 |
| --- | --- | --- |
| Frontend language | TypeScript | battle state, socket event, gesture token 타입 안정성을 계속 유지합니다. |
| Frontend runtime | React + Vite | 현재 workspace와 테스트 구성을 유지합니다. |
| Frontend data fetching | query/cache 기반 client adapter | REST catalog, profile, history, leaderboard 흐름에 계속 사용합니다. |
| Backend language | Python 3.13+ | 기존 API, repository, test stack을 유지합니다. |
| Backend API | ASGI 기반 REST/WebSocket app | REST와 socket event contract를 계속 분리합니다. |
| Validation | Pydantic schema | camelCase wire contract와 domain model 변환을 유지합니다. |
| Persistence | SQLAlchemy/Alembic + storage adapter | JSON 개발 adapter와 SQL adapter를 같은 protocol 뒤에 둡니다. |
| API contract | OpenAPI + JSON Schema + shared catalog fixture | FE/BE 변경 전에 contract를 먼저 업데이트합니다. |
| Frontend tests | Vitest + component tests + browser smoke | unit/component/smoke를 영향 범위에 맞춰 실행합니다. |
| Backend tests | pytest + ruff | rule path, storage adapter, socket flow를 계속 검증합니다. |

## v2 선택 상태

| 영역 | 상태 | 결정 전 조건 |
| --- | --- | --- |
| Concrete frame recognizer runtime | done | browser frame signal runtime을 기본 live recognizer runtime으로 연결했습니다. 외부 runtime dependency는 추가하지 않았습니다. |
| Skill domain source format | blocked | skill id/name/effect/cost/cooldown/gesture/resource/version 형식이 승인되어야 합니다. |
| Production storage topology | done | SQL migration smoke, failure policy, audit retention boundary가 문서화되었고 compose 의존성 기동 경계가 고정되었습니다. |
| Real two-player matchmaking policy | done | queue pairing, reconnect latest snapshot 복구, delayed/duplicate reconciliation, timeout/surrender fanout hardening이 완료되었습니다. |

## 완료된 Storage Topology 기준

- 로컬 호스트 실행은 `scripts/dev-deps.ps1`로 SQL database와 cache를 먼저 기동하고 migration을 적용합니다.
- 전체 container 실행은 `docker compose up --build`를 사용하며, API는 database health check와 migration 완료 후 시작합니다.
- 백엔드를 호스트에서 직접 실행할 때는 compose container용 database host를 사용하지 않고 localhost database URL을 사용합니다.
- JSON 개발 adapter와 SQL adapter는 같은 storage protocol 뒤에 유지합니다.
- SQL migration apply/reset/rollback smoke 절차와 storage failure/fallback policy는 구현 기록에 분리해 둡니다.

## 완료된 Recognition Runtime 기준

- 기본 live recognizer runtime은 browser frame signal runtime입니다.
- canvas downsample로 frame contrast/motion을 scalar signal로 변환하고, raw frame은 local boundary 밖으로 내보내지 않습니다.
- expected token이 안정 시간 동안 유지될 때만 `recognized` observation을 반환합니다.
- frame signal이 없거나 낮으면 `no_hand`, 안정 시간이 부족하면 `unstable`을 반환합니다.
- 기존 no-op runtime은 명시 fallback 또는 테스트 용도로만 유지합니다.
- 구현 기록은 `docs/implementation-artifacts/v2-12-browser-frame-signal-runtime.ko.md`에 있습니다.

## Recognition Runtime 교체 기준

다른 recognizer runtime으로 교체할 때 다음 조건을 확인합니다.

- 브라우저에서 실행 가능해야 합니다.
- camera stream lifecycle을 명시적으로 제어할 수 있어야 합니다.
- token, confidence, stability, reason을 adapter에서 정규화할 수 있어야 합니다.
- raw frame 또는 raw tracking stream을 backend로 보내지 않아야 합니다.
- unit test 또는 smoke fixture로 allowed/denied/error path를 검증할 수 있어야 합니다.
- 특정 외부 제공자명에 의존하는 product copy를 만들지 않아야 합니다.

## Skill/Resource 선택 기준

스킬 구현은 기술 선택 문제가 아니라 도메인 명세 문제입니다. 아래가 없으면 구현하지 않습니다.

- 승인된 skill domain source.
- gesture token과 skill effect의 mapping.
- resource key naming rule.
- missing resource fallback.
- contract migration plan.
- FE/BE cross-stack fixture test plan.

## 의존성 추가 규칙

- 새 runtime dependency는 선택 이유와 fallback을 이 문서에 먼저 기록하고, 현재 browser frame signal runtime 대비 이점과 위험을 비교합니다.
- dependency가 browser permission, camera stream, storage migration, socket behavior를 바꾸면 smoke 또는 unit test를 추가합니다.
- lock file 변경은 실제 dependency 추가가 있을 때만 포함합니다.
- docs와 user-facing copy에는 승인되지 않은 외부 제공자명 또는 서비스명을 넣지 않습니다.
