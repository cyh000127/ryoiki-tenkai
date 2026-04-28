# Gesture Skill Workspace

이 저장소는 브라우저 기반 손동작 배틀 MVP를 위한 프론트엔드/백엔드 워크스페이스입니다.

영문 문서는 `README.en.md`에 있습니다.

## v1 릴리스 상태

- v1 기능 MVP는 릴리스 준비 완료 상태입니다.
- 릴리스 차단 항목은 없습니다.
- v2-1 live recognizer adapter boundary 연결이 완료되었습니다.
- v2-2 camera permission smoke 자동화와 v2-3 storage adapter persistence 전환이 완료되었습니다.
- v2 planning baseline이 작성되었습니다.
- v2 smoke checklist가 작성되었습니다.
- v2 release readiness checkpoint가 작성되었습니다.
- v2 SQL migration smoke 절차가 작성되었습니다.
- v2 storage failure/fallback policy가 작성되었습니다.
- v2 compact audit retention boundary가 작성되었습니다.
- v2 recognition UI state hardening이 완료되었습니다.
- 스킬명, 스킬 효과, 손동작 리소스, 시각 자산은 별도 domain source 확정 후 진행합니다.
- 구체 frame recognizer 바인딩은 v2 follow-up 범위입니다.
- 최종 릴리스 점검 문서: `docs/implementation-artifacts/v1-release-readiness.ko.md`
- v2-1 구현 기록: `docs/implementation-artifacts/v2-1-live-recognizer-adapter.ko.md`
- v2 planning baseline: `docs/implementation-artifacts/v2-planning-baseline.ko.md`
- v2 release readiness checkpoint: `docs/implementation-artifacts/v2-release-readiness.ko.md`

## 명세 점검

- 점검 시점: `2026-04-28`
- 점검 기준 문서
  `docs/implementation-artifacts/mvp-v1-implementation-plan.ko.md`
  `docs/planning-artifacts/mvp-v1/stories.ko.md`
  `docs/planning-artifacts/mvp-v1/implementation-order.ko.md`
- 스토리 상태 집계
  `done 28`
  `partial 0`
  `planned 0`
- 현재 partial 항목 없음
- 상세 점검 문서
  `docs/implementation-artifacts/mvp-v1-spec-review.ko.md`

## 현재 상태

현재 구현은 아래 흐름까지 실제로 연결되어 있습니다.

- 게스트 플레이어 생성 또는 복구
- `skillset` / `animset` catalog 조회와 `loadout` 저장
- ranked 1v1 queue 진입, 취소, 상태 조회
- WebSocket 인증과 `battle.match_ready` / `battle.match_found` / `battle.started` handoff
- 서버 권위 전투 액션 검증, 중복 방지, 상태 반영
- practice rival 자동 턴 처리
- `HP_ZERO`, `TIMEOUT`, `SURRENDER` 종료 처리와 결과 화면 반영
- reconnect 후 최신 battle snapshot 복구
- delayed/duplicate socket event 정합성 처리
- 전적, 레이팅, leaderboard 조회
- battle result, compact action audit, rating, history의 storage adapter 영속화
- live camera adapter의 시작/중지/상태 표시와 recognized token의 normalized input boundary 연결
- no-hand, unstable-hand, recognized-token live camera UI 상태 분리
- result/history/rating persistence를 storage adapter 경계 뒤로 전환
- v2 에픽, 스토리, 구현 순서, 선행조건, 기술스택 문서화
- v2 camera/runtime/storage/matching smoke checklist 문서화
- v2 release readiness checkpoint 문서화
- SQL migration apply/reset/rollback smoke 절차 문서화
- storage failure/fallback policy 문서화와 손상된 JSON state 거부
- compact audit retention boundary 문서화와 raw recognition data 저장 제외 기준
- no-hand, unstable-hand, recognized-token UI 상태 분리

## 실행 방법

### 준비물

- `uv`
- `pnpm`
- Python `3.13+`
- Node.js

### 의존성 설치

```bash
uv sync
pnpm --dir FE/app install
cp FE/app/.env.example FE/app/.env
```

`FE/app/.env`는 선택 사항이며, 기본값은 `http://localhost:8000`입니다.

### 백엔드 실행

```bash
uv run --package gesture-api uvicorn gesture_api.main:app --app-dir BE/api/src --reload --host 0.0.0.0 --port 8000
```

### 프론트엔드 실행

```bash
pnpm --dir FE/app dev
```

브라우저에서 `http://localhost:5173`을 열면 됩니다.

## 검증 명령

현재 저장소 기준 기본 검증 명령은 아래입니다.

```bash
pnpm --dir FE/app typecheck
pnpm --dir FE/app test
pnpm --dir FE/app smoke:camera
uv run pytest BE/api/tests/unit
git diff --check
```

PowerShell 보조 스크립트도 유지하고 있습니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\bootstrap.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\check-boundaries.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\backend-check.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\frontend-check.ps1
```

## 완료된 작업

- lightweight guest identity 생성/복구와 profile lookup
- `skillset`, `animset` catalog API와 `loadout` 저장/검증
- matchmaking queue 진입, 취소, 상태 조회의 idempotent 처리
- WebSocket token 인증과 battle handoff
- 서버 권위 전투 규칙
  액션 검증, exact-once 적용, duplicate/out-of-turn/invalid gesture/insufficient mana/cooldown 거부
- practice rival 자동 턴 처리
- `battle.state_updated`, `battle.timeout`, `battle.surrendered`, `battle.ended` 이벤트 발행
- 프론트 battle workspace의 실제 REST/WS 연동
  pending, rejected, confirmed, timeout, surrender, result 화면 반영
- live camera 입력 surface와 debug fallback 입력 panel 분리
  deterministic sequence replay와 manual token 입력을 debug 전용 경계로 유지
- live recognizer adapter를 battle 화면에 연결
  camera observation-only feedback과 recognized token dispatch를 분리
- battle deadline countdown, fighter cooldown detail, selected skill 상태 표시
- sequence progress, submission readiness, local input 상태와 server rejection feedback 분리 표시
- winner/loser, 종료 사유, rating delta, rematch/history/home을 포함한 결과 화면
- shared gesture token fixture와 FE/BE cross-stack contract test
- reconnect 시 latest active battle snapshot 복구와 ended battle 결과 상태 복원
- delayed/duplicate socket event를 최신 battle state 기준으로 정리해 UI rollback과 중복 결과 반영 방지
- server-backed 전적/레이팅/leaderboard 화면과 loading/empty/error 상태 렌더링
- battle result, compact action audit, rating, history를 백엔드 storage adapter 경계로 영속화
- v2 planning baseline 작성과 스킬 구현 blocked 조건 문서화
- v2 smoke checklist 작성과 implemented/planned/blocked 항목 분리
- v2 release readiness checkpoint 작성과 full v2 release blocker 분리
- SQL migration smoke script와 절차 문서화
- storage failure/fallback policy 작성과 JSON 손상 파일 거부 테스트
- compact audit retention boundary 작성과 retained/excluded field 기준 정리
- recognition UI state hardening과 no-hand/unstable/recognized 상태 회귀 테스트

## 남은 작업

- v1 릴리스 차단 작업 없음
- v2 또는 follow-up 범위
  구체 frame recognizer 바인딩, recognizer restart/cleanup hardening, real two-player match hardening, 스킬 domain source 확정 후 skill/resource 구현

## 경계

- `FE/app`: 브라우저 앱, 라우트 셸, 손동작 제어 UI, 생성 API 클라이언트 경계.
- `BE/api`: 명령, 세션, 매핑, 감사 상태의 표준 쓰기 소유자.
- `BE/core`: 공유 도메인 값 객체와 순수 규칙.
- `BE/worker`: API 쓰기 소유권을 우회하지 않는 지연 또는 비동기 처리.
- `BE/api/contracts`: 표준 와이어 계약 원천.
- `scripts`: 저장소 소유 설정 및 검증 진입점.
- `infra/runtime`: 로컬 런타임 토폴로지 메모.
- `ops`: 운영 설정 자리.

## 용어 기준

- `skillset`: 서버가 승인한 전투 규칙과 gesture sequence 프리셋.
- `animset`: 서버가 승인한 시각 연출 프리셋.
- `loadout`: queue entry 전에 저장하는 `skillset + animset` 조합.

## MVP 계획과 QA

### 한국어 문서

- `docs/implementation-artifacts/mvp-v1-implementation-plan.ko.md`: WebSocket 흐름, 서버 권위 규칙, 클라이언트 손 인식, 제외 범위를 포함한 MVP 구현 기준.
- `docs/implementation-artifacts/mvp-v1-spec-review.ko.md`: 현재 구현과 스토리 명세를 대조한 점검 문서.
- `docs/implementation-artifacts/v1-release-readiness.ko.md`: v1 릴리스 준비 완료 판정과 검증 근거.
- `docs/implementation-artifacts/v2-1-live-recognizer-adapter.ko.md`: live recognizer adapter 연결 구현 기록.
- `docs/implementation-artifacts/v2-2-camera-permission-smoke.ko.md`: 카메라 권한 smoke 자동화 구현 기록.
- `docs/implementation-artifacts/v2-4-recognition-ui-state.ko.md`: recognition UI state hardening 구현 기록.
- `docs/implementation-artifacts/v2-3-storage-adapter-persistence.ko.md`: storage adapter persistence 구현 기록.
- `docs/implementation-artifacts/v2-planning-baseline.ko.md`: v2 planning baseline 구현 기록.
- `docs/implementation-artifacts/v2-smoke-checklist.ko.md`: v2 smoke checklist와 blocked 항목.
- `docs/implementation-artifacts/v2-release-readiness.ko.md`: v2 checkpoint 판정과 full v2 release blocker.
- `docs/implementation-artifacts/v2-sql-migration-smoke.ko.md`: SQL migration apply/reset/rollback smoke 절차.
- `docs/implementation-artifacts/v2-storage-failure-policy.ko.md`: storage failure mode와 fallback policy.
- `docs/implementation-artifacts/v2-audit-retention-boundary.ko.md`: compact audit retention boundary.
- `docs/planning-artifacts/v2/technology-stack.ko.md`: v2에서 유지/보류할 기술스택 결정.
- `docs/planning-artifacts/v2/epics.ko.md`: v2 에픽, 경계, 수용 신호.
- `docs/planning-artifacts/v2/stories.ko.md`: v2 스토리 상태와 blocked 조건.
- `docs/planning-artifacts/v2/implementation-order.ko.md`: v2 구현 순서와 커밋 단위.
- `docs/planning-artifacts/v2/prerequisites.ko.md`: v2 선행조건과 구현 중단 조건.
- `docs/planning-artifacts/mvp-v1/technology-stack.ko.md`: 선택한 MVP 기술스택, 경계, 보류 항목, 의존성 추가 규칙.
- `docs/planning-artifacts/mvp-v1/epics.ko.md`: MVP 구현 계획을 에픽 단위로 분리한 문서.
- `docs/planning-artifacts/mvp-v1/stories.ko.md`: 스토리 단위 구현 항목, 상태, 범위, 의존성, 검증 메모.
- `docs/planning-artifacts/mvp-v1/implementation-order.ko.md`: MVP 권장 구현 순서와 커밋 순서.
- `docs/planning-artifacts/mvp-v1/prerequisites.ko.md`: 제품, 계약, FE, BE, 입력 런타임, 영속성, QA 선행조건.
- `docs/implementation-artifacts/smoke-test-checklist.ko.md`: 저장소, 런타임, REST, WebSocket, 전투, 클라이언트 인식, E2E 검증 체크리스트.

### English Documents

- `README.en.md`
- `docs/implementation-artifacts/mvp-v1-implementation-plan.en.md`
- `docs/implementation-artifacts/mvp-v1-spec-review.en.md`
- `docs/implementation-artifacts/v1-release-readiness.en.md`
- `docs/implementation-artifacts/v2-1-live-recognizer-adapter.en.md`
- `docs/implementation-artifacts/v2-2-camera-permission-smoke.en.md`
- `docs/implementation-artifacts/v2-4-recognition-ui-state.en.md`
- `docs/implementation-artifacts/v2-3-storage-adapter-persistence.en.md`
- `docs/implementation-artifacts/v2-planning-baseline.en.md`
- `docs/implementation-artifacts/v2-smoke-checklist.en.md`
- `docs/implementation-artifacts/v2-release-readiness.en.md`
- `docs/implementation-artifacts/v2-sql-migration-smoke.en.md`
- `docs/implementation-artifacts/v2-storage-failure-policy.en.md`
- `docs/implementation-artifacts/v2-audit-retention-boundary.en.md`
- `docs/planning-artifacts/v2/technology-stack.en.md`
- `docs/planning-artifacts/v2/epics.en.md`
- `docs/planning-artifacts/v2/stories.en.md`
- `docs/planning-artifacts/v2/implementation-order.en.md`
- `docs/planning-artifacts/v2/prerequisites.en.md`
- `docs/planning-artifacts/mvp-v1/technology-stack.en.md`
- `docs/planning-artifacts/mvp-v1/epics.en.md`
- `docs/planning-artifacts/mvp-v1/stories.en.md`
- `docs/planning-artifacts/mvp-v1/implementation-order.en.md`
- `docs/planning-artifacts/mvp-v1/prerequisites.en.md`
- `docs/implementation-artifacts/smoke-test-checklist.en.md`

## 스캐폴드 정책

- 문서와 제품 문구에서 외부 제공자 세부사항을 제외합니다.
- 카메라 프레임과 원시 랜드마크 스트림은 기본적으로 클라이언트에 둡니다.
- 확인된 명령 메타데이터만 백엔드로 보냅니다.
- 사용자에게 보이는 문구는 프론트엔드 로케일 카탈로그에 둡니다.
- 클라이언트 코드를 생성하거나 소비하기 전에 계약을 먼저 확장합니다.
