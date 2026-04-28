# v2 스토리

이 문서는 v2 에픽을 구현 가능한 스토리로 나눕니다.

상태 값:

- `done`: 현재 브랜치에 구현됨.
- `planned`: 구현 가능하지만 아직 시작하지 않음.
- `blocked`: 선행 명세 또는 선택이 없어 구현하면 안 됨.
- `deferred`: v2 릴리스 밖으로 미룰 수 있음.

## V2-E1: Live Recognition Runtime Hardening

### V2-E1-ST01: live recognizer adapter boundary 연결

- Status: done
- User story: player는 live camera 입력이 normalized gesture input boundary로 들어오는 것을 볼 수 있다.
- Scope: camera start/stop/status, observation-only feedback, recognized token dispatch, debug fallback과 분리.
- Acceptance criteria: ready/blocked/unsupported/error 상태가 UI에 보인다. recognized token은 기존 sequence reducer로만 전달된다.
- Dependencies: v1 gesture sequence state machine.
- Verification: frontend unit test, camera smoke fixture.

### V2-E1-ST02: concrete frame recognizer adapter 선택 및 결합

- Status: blocked
- User story: system은 선택된 browser-compatible recognizer runtime을 adapter 뒤에 연결할 수 있다.
- Scope: package/runtime 선택, adapter implementation, confidence/stability normalization, resource cleanup.
- Acceptance criteria: 선택 근거가 technology-stack 문서에 반영된다. adapter가 raw frame을 backend로 보내지 않는다. local unit 또는 smoke test가 recognizer lifecycle을 커버한다.
- Dependencies: runtime 선택, browser support 기준.
- Verification: adapter unit test, smoke test.

### V2-E1-ST03: no-hand/unstable/recognized-token UI 상태 분리

- Status: done
- User story: player는 손이 없는 상태, 안정화 중인 상태, token 인식 상태를 구분할 수 있다.
- Scope: visual state, status copy, progress interaction, failed/reset feedback.
- Acceptance criteria: 세 상태가 같은 label로 뭉치지 않는다. sequence progress와 server rejection feedback이 분리된다.
- Dependencies: V2-E1-ST01.
- Verification: `docs/implementation-artifacts/v2-4-recognition-ui-state.ko.md`, `FE/app/tests/unit/BattleGameWorkspace.test.tsx`.

### V2-E1-ST04: recognizer restart, cleanup, permission recovery hardening

- Status: planned
- User story: player는 camera permission 또는 runtime 오류 후 앱을 새로고침하지 않고 복구를 시도할 수 있다.
- Scope: stop/start idempotency, stream cleanup, blocked/error recovery UI, unmount cleanup.
- Acceptance criteria: repeated start/stop이 중복 stream을 만들지 않는다. permission denied 후 action submission으로 넘어가지 않는다.
- Dependencies: V2-E1-ST02.
- Verification: frontend unit test, smoke test.

## V2-E2: Persistence and Runtime Operation Readiness

### V2-E2-ST01: storage adapter persistence 전환

- Status: done
- User story: backend repository는 저장 매체 세부사항 없이 profile/history/rating/audit state를 보존할 수 있다.
- Scope: storage protocol, JSON adapter, SQL adapter, null adapter, repository wiring.
- Acceptance criteria: reload 후 profile/history/audit이 유지된다. null adapter는 테스트용 ephemeral behavior를 제공한다.
- Dependencies: v1 result/history/rating model.
- Verification: backend unit tests.

### V2-E2-ST02: SQL migration apply/rollback smoke 절차 작성

- Status: done
- User story: developer는 SQL storage adapter를 사용할 때 migration 절차를 검증할 수 있다.
- Scope: migration command, local database setup note, rollback 또는 reset guidance.
- Acceptance criteria: command가 docs에 있고 실패 시 복구 절차가 보인다.
- Dependencies: V2-E2-ST01.
- Verification: `docs/implementation-artifacts/v2-sql-migration-smoke.ko.md`, `scripts/storage-migration-smoke.ps1 -PlanOnly`.

### V2-E2-ST03: storage adapter failure mode와 fallback policy 정의

- Status: done
- User story: system owner는 storage load/save 실패 시 어떤 동작을 허용할지 알 수 있다.
- Scope: startup failure, save failure, partial write, read recovery, local fallback policy.
- Acceptance criteria: silent data loss를 허용하지 않는다. local development fallback과 production behavior가 분리된다.
- Dependencies: V2-E2-ST01.
- Verification: `docs/implementation-artifacts/v2-storage-failure-policy.ko.md`, `BE/api/tests/unit/test_game_state_storage.py`.

### V2-E2-ST04: compact audit retention boundary 문서화

- Status: done
- User story: system은 어떤 전투 감사 메타데이터를 얼마나 보존할지 명확히 한다.
- Scope: retained fields, excluded recognition data, retention horizon, export/debug note.
- Acceptance criteria: raw frame, raw landmark, tracking stream은 저장 제외로 명시된다.
- Dependencies: V2-E2-ST01.
- Verification: `docs/implementation-artifacts/v2-audit-retention-boundary.ko.md`.

## V2-E3: Real Match Flow and Session Robustness

### V2-E3-ST01: two-player queue pairing rule 강화

- Status: done
- User story: 두 player는 practice rival 없이 같은 battle session으로 매칭될 수 있다.
- Scope: queue pairing, seat assignment, duplicate queue guard, loadout guard.
- Acceptance criteria: 두 player가 같은 battle id와 반대 seat를 받는다. practice rival path와 real pairing path가 테스트에서 분리된다.
- Dependencies: v1 matchmaking queue, socket handoff.
- Verification: `docs/implementation-artifacts/v2-5-two-player-queue-pairing.ko.md`, `BE/api/tests/unit/test_battle_websocket_events.py`.

### V2-E3-ST02: socket reconnect와 latest snapshot 재동기화 hardening

- Status: done
- User story: player는 socket reconnect 후 최신 battle state를 잃지 않는다.
- Scope: reconnect replay, ended battle result recovery, stale event suppression.
- Acceptance criteria: reconnect가 최신 turn/hp/mana/cooldown을 복구한다. ended battle은 result screen으로 복구된다.
- Dependencies: V2-E3-ST01.
- Verification: `docs/implementation-artifacts/v2-6-socket-reconnect-resync.ko.md`, `BE/api/tests/unit/test_battle_websocket_events.py`, `FE/app/tests/unit/battleFlow.test.ts`, `FE/app/tests/unit/BattleGameWorkspace.test.tsx`.

### V2-E3-ST03: delayed/duplicate event reconciliation 회귀 테스트 확대

- Status: done
- User story: delayed socket event가 UI를 과거 상태로 되돌리지 않는다.
- Scope: stale turn check, duplicate action event handling, ended event idempotency.
- Acceptance criteria: stale snapshot은 무시된다. repeated ended event가 rating/history UI를 중복 반영하지 않는다.
- Dependencies: v1 event reducer.
- Verification: `docs/implementation-artifacts/v2-7-delayed-duplicate-event-reconciliation.ko.md`, `FE/app/tests/unit/battleFlow.test.ts`, `FE/app/tests/unit/BattleGameWorkspace.test.tsx`.

### V2-E3-ST04: timeout watcher와 surrender event fanout 안정화

- Status: planned
- User story: battle은 timeout 또는 surrender 후 모든 참여자에게 같은 최종 상태를 전달한다.
- Scope: timeout watcher lifecycle, event ordering, disconnected player handling.
- Acceptance criteria: timeout/surrender/ended event 순서가 안정적이다. disconnected player도 next lookup에서 ended state를 받는다.
- Dependencies: v1 timeout and surrender rules.
- Verification: backend socket test.

## V2-E4: Skill and Resource Domain Intake

### V2-E4-ST01: skill domain source format 정의

- Status: blocked
- User story: domain owner는 구현팀에 전달할 스킬 명세 형식을 합의할 수 있다.
- Scope: skill id, display name, effect, cost, cooldown, gesture sequence, resource keys, versioning.
- Acceptance criteria: source format이 문서화되기 전에는 스킬 구현을 시작하지 않는다.
- Dependencies: product/domain decision.
- Verification: docs review.

### V2-E4-ST02: approved skill catalog fixture migration

- Status: blocked
- User story: approved skill source가 shared fixture와 backend catalog에 반영된다.
- Scope: fixture update, backend catalog update, FE default catalog update, cross-stack test.
- Acceptance criteria: fixture, API, frontend default가 같은 내용을 가진다.
- Dependencies: V2-E4-ST01.
- Verification: contract test, frontend fixture test.

### V2-E4-ST03: skill/resource metadata API contract 확장

- Status: blocked
- User story: frontend는 approved resource metadata를 API에서 받을 수 있다.
- Scope: OpenAPI schema, skill resource fields, animset resource fields, backward compatibility policy.
- Acceptance criteria: contract diff가 review되고 frontend type이 업데이트된다.
- Dependencies: V2-E4-ST01.
- Verification: backend contract test, frontend typecheck.

### V2-E4-ST04: frontend loadout/resource rendering 연결

- Status: blocked
- User story: player는 approved skill/resource metadata를 loadout 화면에서 볼 수 있다.
- Scope: skill/resource labels, visual asset loading, missing resource fallback, layout test.
- Acceptance criteria: 승인되지 않은 이름이나 이미지를 임의로 만들지 않는다.
- Dependencies: V2-E4-ST02, V2-E4-ST03.
- Verification: frontend component test.

## V2-E5: QA, Release, and Handoff

### V2-E5-ST01: v2 planning baseline 작성

- Status: done
- User story: team은 v2의 구현 순서, 선행조건, 보류 사유를 같은 기준으로 볼 수 있다.
- Scope: epics, stories, implementation order, prerequisites, technology stack docs in Korean and English.
- Acceptance criteria: README와 readiness 문서가 v2 planning docs를 연결한다.
- Dependencies: v1 release readiness.
- Verification: docs review, text scan.

### V2-E5-ST02: v2 smoke checklist 갱신

- Status: done
- User story: team은 v2에서 추가된 camera/runtime/storage/matching risk를 smoke checklist로 검증할 수 있다.
- Scope: runtime smoke, camera states, storage reload, two-player queue, reconnect, result/history.
- Acceptance criteria: implemented item과 blocked item이 분리된다.
- Dependencies: V2-E5-ST01.
- Verification: `docs/implementation-artifacts/v2-smoke-checklist.ko.md`, docs review, text scan.

### V2-E5-ST03: release readiness 재점검

- Status: done
- User story: release owner는 v2 완료/보류 범위를 기준으로 릴리스 가능성을 판단할 수 있다.
- Scope: gate table, verification evidence, known gap, blocker list.
- Acceptance criteria: blocking item과 follow-up item이 분리된다.
- Dependencies: current v2 implementation set.
- Verification: `docs/implementation-artifacts/v2-release-readiness.ko.md`, docs review, text scan.

### V2-E5-ST04: provider-neutral text scan 유지

- Status: done
- User story: handoff 전에 승인되지 않은 외부 제공자명이나 서비스명이 들어가지 않았는지 확인한다.
- Scope: docs, source copy, comments, contracts.
- Acceptance criteria: targeted scan이 lock/generated output을 제외하고 매칭을 반환하지 않는다.
- Dependencies: repository scan command.
- Verification: `docs/implementation-artifacts/v2-release-readiness.ko.md`, text scan.
