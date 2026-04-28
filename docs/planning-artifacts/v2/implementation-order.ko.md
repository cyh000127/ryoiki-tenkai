# v2 구현 순서

이 문서는 v2를 어떤 순서로 구현할지 정의합니다. 스킬 구현은 별도 도메인 명세가 확정될 때까지 시작하지 않습니다.

## Phase 0: Scope Guard

### 목적

v2에서 이미 완료된 hardening과 앞으로 할 작업을 분리하고, 임의 스킬 구현을 막습니다.

### 작업

1. v1 readiness와 v2 implementation record를 확인합니다.
2. 스킬명, 스킬 효과, 손동작 리소스, 시각 자산은 domain source가 없으면 구현하지 않습니다.
3. 새 runtime 또는 storage 선택은 technology-stack 문서에 먼저 기록합니다.
4. docs와 product copy에서 승인되지 않은 외부 제공자명과 서비스명을 피합니다.

### 종료 기준

- README가 v2 planning baseline을 연결합니다.
- 스킬 구현 보류 조건이 stories/prerequisites에 기록됩니다.
- 변경 범위가 docs, FE, BE, storage 중 어디에 속하는지 명확합니다.

## Phase 1: Planning Baseline

### 목적

v2 에픽, 스토리, 구현 순서, 선행조건, 기술스택을 한국어/영어 문서로 고정합니다.

### 작업

1. `epics.ko.md`와 `epics.en.md`를 작성합니다.
2. `stories.ko.md`와 `stories.en.md`에 status와 blocker를 기록합니다.
3. `implementation-order.ko.md`와 `implementation-order.en.md`를 작성합니다.
4. `prerequisites.ko.md`와 `prerequisites.en.md`를 작성합니다.
5. `technology-stack.ko.md`와 `technology-stack.en.md`에 v2 선택/보류 사항을 기록합니다.

### 종료 기준

- v2 planning docs가 README에서 찾을 수 있습니다.
- skill/resource 구현은 blocked 상태로 남습니다.
- 문서가 서로 같은 범위와 상태를 말합니다.

## Phase 2: Recognition Runtime Binding

### 목적

live recognizer adapter를 concrete frame recognizer runtime과 결합합니다.

### 작업

1. browser support, bundle size, lifecycle, testing strategy를 기준으로 runtime을 선택합니다.
2. adapter가 token, confidence, stability, reason을 normalized shape로 반환하게 합니다.
3. stop/start/unmount cleanup을 구현합니다.
4. raw frame과 raw tracking data를 backend로 보내지 않는지 검증합니다.

### 종료 기준

- selected runtime과 이유가 technology-stack 문서에 있습니다.
- adapter lifecycle test가 있습니다.
- camera permission smoke가 계속 통과합니다.

## Phase 3: Recognition UX Hardening

### 목적

인식 상태를 player가 이해할 수 있게 만들고 battle submission과 혼동하지 않게 합니다.

### 작업

1. no-hand, unstable-hand, recognized-token 상태를 분리해 렌더링합니다.
2. sequence reset/timeout/failure feedback을 점검합니다.
3. local success와 server confirmation copy를 분리합니다.
4. compact/desktop layout에서 text overflow를 확인합니다.

### 종료 기준

- camera state, hand state, server decision state가 서로 다른 UI 영역으로 보입니다.
- recognized sequence가 서버 확정 전 skill effect처럼 보이지 않습니다.
- frontend component test가 주요 state를 커버합니다.

## Phase 4: Persistence and Runtime Operations

### 목적

storage adapter를 운영 가능한 절차로 보강합니다.

### 작업

1. SQL migration apply/rollback smoke 절차를 작성합니다.
2. storage load/save failure policy를 정의합니다.
3. compact audit retention boundary를 문서화합니다.
4. result/history/rating reload test를 유지합니다.

### 종료 기준

- migration과 recovery command가 문서화됩니다.
- silent data loss를 허용하지 않는 정책이 있습니다.
- raw recognition data 저장 제외가 명확합니다.

## Phase 5: Real Match Flow Hardening

### 목적

practice rival 중심 loop에서 실제 두 플레이어 매칭 loop로 확장합니다.

### 작업

1. two-player queue pairing을 구현합니다.
2. seat assignment와 battle session ownership을 테스트합니다.
3. socket reconnect와 stale event suppression을 보강합니다.
4. timeout/surrender fanout을 회귀 테스트합니다.

### 종료 기준

- 두 player가 같은 battle session을 공유합니다.
- reconnect 후 최신 snapshot이 유지됩니다.
- battle end write가 중복되지 않습니다.

## Phase 6: Skill and Resource Implementation

### 목적

도메인 명세가 승인된 뒤에만 skill/resource 구현을 시작합니다.

### 작업

1. skill domain source format을 확정합니다.
2. approved catalog fixture를 업데이트합니다.
3. API contract와 frontend type을 확장합니다.
4. loadout/resource rendering을 연결합니다.

### 종료 기준

- domain source가 문서화되어 있습니다.
- fixture, backend catalog, frontend default가 일치합니다.
- 승인되지 않은 스킬명, 효과, resource key를 만들지 않았습니다.

## Phase 7: v2 Release Readiness

### 목적

완료된 v2 범위와 보류 범위를 분리해 release decision을 준비합니다.

### 작업

1. backend/frontend/check-boundary 검증을 실행합니다.
2. camera smoke와 storage reload smoke를 실행합니다.
3. two-player match 또는 blocker를 기록합니다.
4. provider-neutral scan을 실행합니다.
5. v2 readiness 문서를 작성합니다.

### 종료 기준

- release blocker와 follow-up이 분리되어 있습니다.
- README와 implementation records가 최신입니다.
- 검증 결과가 handoff note에 남아 있습니다.

## 권장 커밋 단위

1. v2 planning baseline.
2. recognizer runtime binding.
3. recognition UX hardening.
4. persistence operation docs or checks.
5. real match flow hardening.
6. approved skill/resource migration after domain source.
7. v2 release readiness refresh.
