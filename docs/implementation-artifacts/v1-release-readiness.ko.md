# v1 릴리스 준비 완료 점검

이 문서는 v1 릴리스 가능 여부를 판단하기 위한 최종 점검 기록입니다.

## 판정

- 판정일: `2026-04-28`
- 판정: v1 기능 MVP 릴리스 준비 완료
- 릴리스 차단 항목: 없음
- 기준 브랜치: `main`

## 완료 근거

- MVP v1 story 28개가 모두 `done` 상태입니다.
- 핵심 플레이 루프가 구현되어 있습니다.
  player entry -> loadout -> queue -> WebSocket handoff -> battle -> result -> history/rating -> storage adapter persistence
- 백엔드와 프론트엔드 테스트가 핵심 성공/실패 경로를 커버합니다.
- 서버 권위 전투 규칙이 action validation, exact-once mutation, rejection, timeout, surrender, battle end까지 처리합니다.
- 프론트엔드가 pending, rejected, confirmed, timeout, surrender, result, reconnect, history/rating 상태를 렌더링합니다.
- shared gesture token fixture와 cross-stack contract test가 기본 skill sequence를 고정합니다.

## 릴리스 게이트

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| Story coverage | PASS | `docs/planning-artifacts/mvp-v1/stories.ko.md` 기준 `done 28`, `partial 0`, `planned 0` |
| Backend lint | PASS | `uv run ruff check BE` |
| Backend tests | PASS | `uv run pytest BE` |
| Frontend typecheck | PASS | `pnpm --dir FE/app typecheck` |
| Frontend tests | PASS | `pnpm --dir FE/app test` |
| Frontend build | PASS | `pnpm --dir FE/app build` |
| Boundary check | PASS | `scripts\check-boundaries.ps1` |
| Runtime config | PASS | `docker compose -f docker-compose.yml config --quiet` |
| Whitespace check | PASS | `git diff --check` |
| Provider-neutral docs scan | PASS | targeted repository scan |

## v1 릴리스 범위

- lightweight guest identity 생성/복구.
- profile lookup.
- `skillset` / `animset` catalog.
- `loadout` 저장과 queue 진입 가드.
- ranked 1v1 queue enter/cancel/status.
- WebSocket token 인증과 battle handoff.
- practice rival 기반 playable battle loop.
- 서버 권위 skill action validation과 mutation.
- invalid, duplicate, out-of-turn, insufficient mana, cooldown rejection.
- `HP_ZERO`, `TIMEOUT`, `SURRENDER` battle end.
- reconnect snapshot restore.
- delayed/duplicate socket event reconciliation.
- result, history, rating, leaderboard view.
- storage adapter 기반 result/history/rating persistence.
- debug fallback input을 통한 deterministic local smoke path.

## v1에서 의도적으로 보류한 항목

아래 항목은 v1 릴리스 차단 요소가 아니며 v2 또는 follow-up에서 다룹니다.

- 실제 손 인식 패키지와 adapter의 완전 결합.
- 실기기 카메라 권한 허용/거부 수동 QA 자동화.
- 정식 스킬명, 스킬 이미지, 손동작 리소스 교체.
- storage adapter 기반 production persistence 전환.
- 실제 사용자 간 매칭 운영 고도화.
- 배포/관측/운영 자동화.

## 릴리스 후 우선순위

1. [x] live recognizer adapter를 현재 normalized gesture input boundary에 연결합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-1-live-recognizer-adapter.ko.md`
2. [x] 실기기 브라우저 카메라 smoke 시나리오를 자동화합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-2-camera-permission-smoke.ko.md`
3. [x] runtime store persistence를 정식 storage adapter로 교체합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-3-storage-adapter-persistence.ko.md`
4. [ ] 스킬명, 시각 자산, 손동작 리소스를 별도 소스로 교체합니다.
   - 보류 사유: 별도 skill domain source 확정 전까지 임의 구현하지 않습니다.
5. [x] v2 기획 문서를 작성합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-planning-baseline.ko.md`
6. [x] v2 smoke checklist를 갱신합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-smoke-checklist.ko.md`
7. [x] v2 release readiness를 재점검합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-release-readiness.ko.md`
8. [x] provider-neutral scan 결과를 readiness 문서에 기록합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-release-readiness.ko.md`
9. [x] SQL migration smoke 절차를 작성합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-sql-migration-smoke.ko.md`
10. [x] storage failure mode와 fallback policy를 정의합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-storage-failure-policy.ko.md`
11. [x] compact audit retention boundary를 문서화합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-audit-retention-boundary.ko.md`
12. [x] no-hand, unstable-hand, recognized-token UI 상태를 분리합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-4-recognition-ui-state.ko.md`
13. [x] two-player queue pairing rule을 강화합니다.
   - 구현 기록: `docs/implementation-artifacts/v2-5-two-player-queue-pairing.ko.md`
