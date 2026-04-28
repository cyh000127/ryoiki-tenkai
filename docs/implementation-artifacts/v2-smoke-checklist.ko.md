# v2 스모크 체크리스트

이 문서는 v2 작업의 로컬 인수인계 검증에 사용합니다. 스킬명, 스킬 효과, 손동작 리소스, 시각 자산은 별도 domain source가 승인되기 전까지 검증 대상이 아니라 blocked 항목으로 둡니다.

## 스냅샷

- 작성일: `2026-04-28`
- 기준 브랜치: `main`
- 기준 문서:
  - `docs/planning-artifacts/v2/epics.ko.md`
  - `docs/planning-artifacts/v2/stories.ko.md`
  - `docs/planning-artifacts/v2/implementation-order.ko.md`
  - `docs/planning-artifacts/v2/prerequisites.ko.md`
  - `docs/planning-artifacts/v2/technology-stack.ko.md`
- 관련 v1 체크리스트: `docs/implementation-artifacts/smoke-test-checklist.ko.md`

## 상태 표기

- `[x]`: 현재 구현 또는 문서 기준으로 검증 가능.
- `[ ]`: v2 planned 항목이며 아직 구현 또는 검증 절차가 남아 있음.
- `Blocked`: 선행 결정 또는 domain source가 없어서 실행하면 안 되는 항목.

## 변경 유형별 기본 검증

### Docs-only 변경

- [x] `git diff --check`
- [x] provider-neutral targeted text scan
- [x] README, implementation record, planning docs link가 모두 최신인지 확인한다.

### Frontend 변경

- [x] `pnpm --dir FE/app typecheck`
- [x] `pnpm --dir FE/app test -- BattleGameWorkspace.test.tsx`
- [x] `pnpm --dir FE/app smoke:camera`
- [x] `pnpm --dir FE/app build`
- [x] camera state, hand state, local sequence state, server confirmation state가 서로 섞이지 않는지 확인한다.
  - 근거: `docs/implementation-artifacts/v2-4-recognition-ui-state.ko.md`

### Backend 변경

- [ ] `uv run ruff check BE`
- [ ] `uv run pytest BE`
- [ ] REST 또는 socket payload 변경 시 contract test를 확인한다.
- [ ] state-mutating command가 stable action/request id를 유지하는지 확인한다.

### Storage 변경

- [x] storage adapter unit test가 JSON, SQL, null adapter path를 커버한다.
  - 근거: `BE/api/tests/unit/test_game_state_storage.py`
- [x] repository reload 후 profile, history, rating, compact audit이 유지되는지 확인한다.
  - 근거: `BE/api/tests/unit/test_game_flow_api.py`
- [x] SQL migration apply/reset 또는 rollback smoke 절차를 실행하거나 blocker를 기록한다.
  - 근거: `docs/implementation-artifacts/v2-sql-migration-smoke.ko.md`, `scripts/storage-migration-smoke.ps1`
- [x] storage failure policy가 silent data loss를 허용하지 않는지 확인한다.
  - 근거: `docs/implementation-artifacts/v2-storage-failure-policy.ko.md`

### Match/Socket 변경

- [ ] two-player queue pairing smoke 또는 backend socket test를 실행한다.
- [ ] reconnect 후 latest snapshot이 유지되는지 확인한다.
- [ ] delayed/duplicate event가 UI를 stale state로 되돌리지 않는지 확인한다.
- [ ] timeout/surrender/ended event ordering이 안정적인지 확인한다.

## v2 Recognition Runtime

- [x] live recognizer adapter boundary가 battle input boundary에 연결되어 있다.
  - 근거: `docs/implementation-artifacts/v2-1-live-recognizer-adapter.ko.md`
- [x] camera permission allowed/denied smoke 명령이 있다.
  - 근거: `docs/implementation-artifacts/v2-2-camera-permission-smoke.ko.md`
- [x] 권한 거부 상태는 action submission으로 들어가지 않는다.
  - 근거: `pnpm --dir FE/app smoke:camera`
- [x] no-hand, unstable-hand, recognized-token 상태가 시각적으로 분리되어 있다.
  - 근거: `docs/implementation-artifacts/v2-4-recognition-ui-state.ko.md`
- [ ] stop/start/unmount cleanup과 permission recovery가 회귀 테스트로 고정되어 있다.
  - 계획 story: `V2-E1-ST04`
- Blocked: concrete frame recognizer adapter lifecycle smoke.
  - blocker: recognizer runtime 선택이 아직 확정되지 않음.
  - 관련 story: `V2-E1-ST02`

## v2 Persistence

- [x] result, history, rating, compact audit persistence가 storage adapter 경계 뒤에 있다.
  - 근거: `docs/implementation-artifacts/v2-3-storage-adapter-persistence.ko.md`
- [x] JSON, SQL, null adapter 동작을 backend unit test로 검증한다.
  - 근거: `BE/api/tests/unit/test_game_state_storage.py`
- [x] SQL migration apply/reset 또는 rollback smoke 절차가 문서화되어 있다.
  - 근거: `docs/implementation-artifacts/v2-sql-migration-smoke.ko.md`
- [x] storage adapter failure mode와 fallback policy가 문서화되어 있다.
  - 근거: `docs/implementation-artifacts/v2-storage-failure-policy.ko.md`
- [x] compact audit retention boundary가 문서화되어 있다.
  - 근거: `docs/implementation-artifacts/v2-audit-retention-boundary.ko.md`

## v2 Real Match Flow

- [ ] two-player queue pairing rule이 practice rival path와 분리되어 검증된다.
  - 계획 story: `V2-E3-ST01`
- [ ] 두 player가 같은 battle id, 반대 seat, 동일 turn state를 받는다.
  - 계획 story: `V2-E3-ST01`
- [ ] reconnect가 two-player battle에서 latest snapshot을 복구한다.
  - 계획 story: `V2-E3-ST02`
- [ ] delayed/duplicate event reconciliation 회귀 테스트가 확대되어 있다.
  - 계획 story: `V2-E3-ST03`
- [ ] timeout watcher와 surrender event fanout이 disconnected player path를 포함한다.
  - 계획 story: `V2-E3-ST04`

## Skill and Resource Intake

- Blocked: skill domain source format 정의.
  - blocker: approved domain source가 아직 없음.
  - 관련 story: `V2-E4-ST01`
- Blocked: approved skill catalog fixture migration.
  - blocker: source format과 approved catalog가 먼저 필요함.
  - 관련 story: `V2-E4-ST02`
- Blocked: skill/resource metadata API contract 확장.
  - blocker: skill id/name/effect/cost/cooldown/gesture/resource/version 형식이 필요함.
  - 관련 story: `V2-E4-ST03`
- Blocked: frontend loadout/resource rendering 연결.
  - blocker: approved fixture와 API contract가 먼저 필요함.
  - 관련 story: `V2-E4-ST04`

## Release Handoff

- [x] v2 planning baseline이 한국어/영어 문서로 작성되어 있다.
  - 근거: `docs/implementation-artifacts/v2-planning-baseline.ko.md`
- [x] v2 smoke checklist가 한국어/영어 문서로 작성되어 있다.
  - 근거: 이 문서와 `docs/implementation-artifacts/v2-smoke-checklist.en.md`
- [x] v2 release readiness 문서가 완료/보류/blocked 범위를 분리한다.
  - 근거: `docs/implementation-artifacts/v2-release-readiness.ko.md`
- [x] provider-neutral text scan 결과가 handoff note 또는 readiness 문서에 기록되어 있다.
  - 근거: `docs/implementation-artifacts/v2-release-readiness.ko.md`

## 최소 handoff 명령

Docs-only 변경:

```powershell
git diff --check
```

저장소에서 합의한 provider-neutral targeted text scan을 실행하고, 무시 대상 파일 외 매칭이 없는지 확인합니다.

FE/BE 변경을 포함한 v2 handoff:

```powershell
uv run ruff check BE
uv run pytest BE
pnpm --dir FE/app typecheck
pnpm --dir FE/app test
pnpm --dir FE/app smoke:camera
pnpm --dir FE/app build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\check-boundaries.ps1
docker compose -f docker-compose.yml config --quiet
git diff --check
```
