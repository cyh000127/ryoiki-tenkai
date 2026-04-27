# Gesture Skill Workspace

이 저장소는 브라우저 기반 손동작 배틀 MVP를 위한 프론트엔드/백엔드 워크스페이스입니다.

영문 문서는 `README.en.md`에 있습니다.

## 현재 상태

현재 구현은 아래 흐름까지 실제로 연결되어 있습니다.

- 게스트 플레이어 생성 또는 복구
- `skillset` / `animset` catalog 조회와 `loadout` 저장
- ranked 1v1 queue 진입, 취소, 상태 조회
- WebSocket 인증과 `battle.match_ready` / `battle.match_found` / `battle.started` handoff
- 서버 권위 전투 액션 검증, 중복 방지, 상태 반영
- practice rival 자동 턴 처리
- `HP_ZERO`, `TIMEOUT`, `SURRENDER` 종료 처리와 결과 화면 반영

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
- 종료 사유 표시와 rematch 진입 흐름
- reconnect 시 latest active battle snapshot 복구와 ended battle 결과 상태 복원
- delayed/duplicate socket event를 최신 battle state 기준으로 정리해 UI rollback과 중복 결과 반영 방지

## 남은 작업

- live camera recognition adapter와 deterministic fallback input 경계 강화
- battle timer/deadline, cooldown 상세, compact/mobile UI polish
- 결과, 전적, 레이팅, leaderboard의 실제 영속화
- client history/rating/leaderboard 화면 완성
- end-to-end smoke coverage 추가

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

- `skillset`: 제스처 시퀀스, cost, cooldown 같은 전투 규칙이 포함된 서버 승인 스킬 프리셋.
- `animset`: 플레이어가 선택하는 서버 승인 시각 연출 프리셋.
- `loadout`: queue entry 전에 저장하는 `skillset + animset` 조합.

## MVP 계획과 QA

### 한국어 문서

- `docs/implementation-artifacts/mvp-v1-implementation-plan.ko.md`: WebSocket 흐름, 서버 권위 규칙, 클라이언트 손 인식, 제외 범위를 포함한 MVP 구현 기준.
- `docs/planning-artifacts/mvp-v1/technology-stack.ko.md`: 선택한 MVP 기술스택, 경계, 보류 항목, 의존성 추가 규칙.
- `docs/planning-artifacts/mvp-v1/epics.ko.md`: MVP 구현 계획을 에픽 단위로 분리한 문서.
- `docs/planning-artifacts/mvp-v1/stories.ko.md`: 스토리 단위 구현 항목, 상태, 범위, 의존성, 검증 메모.
- `docs/planning-artifacts/mvp-v1/implementation-order.ko.md`: MVP 권장 구현 순서와 커밋 순서.
- `docs/planning-artifacts/mvp-v1/prerequisites.ko.md`: 제품, 계약, FE, BE, 입력 런타임, 영속성, QA 선행조건.
- `docs/implementation-artifacts/smoke-test-checklist.ko.md`: 저장소, 런타임, REST, WebSocket, 전투, 클라이언트 인식, E2E 검증 체크리스트.

### English Documents

- `README.en.md`
- `docs/implementation-artifacts/mvp-v1-implementation-plan.en.md`
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
