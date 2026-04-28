# v5 스토리

상태 값:

- `planned`: 구현 예정.
- `blocked`: 선행조건이 없어 구현하면 안 됨.
- `done`: 구현 완료.

## V5-E1: 플레이 플로우 정보구조 재정리

### V5-E1-ST01: 영구 목적지와 진행 상태 분리

- Status: planned
- Scope: 왼쪽 탭을 `홈`, `로드아웃`, `연습`, `전적` 중심으로 축소하고, `매칭 중`, `전투 중`, `결과`는 상태 화면으로 이동한다.
- Acceptance criteria: 사용자가 active battle 없이 `전투`나 `결과`를 직접 선택할 수 없다.
- Dependencies: 현재 `screenOrder`와 reducer 상태 전이 검토.
- Verification: workspace UI regression test.

### V5-E1-ST02: 홈 Primary CTA 단일화

- Status: planned
- Scope: 홈에서 사용자 상태별 primary CTA를 하나만 보여주고, 보조 CTA는 연습/로드아웃 편집 정도로 제한한다.
- Acceptance criteria: 계정 없음, 로드아웃 없음, 로드아웃 있음, 큐 대기, 전투 중, 결과 확인 가능 상태마다 다음 행동이 명확하다.
- Dependencies: player profile query, loadout configured flag, queue/battle state.
- Verification: frontend unit test.

### V5-E1-ST03: 진행 상태 배너

- Status: planned
- Scope: 큐 대기 중 또는 전투 중 사용자가 다른 목적지로 이동해도 현재 진행 상태를 잃지 않도록 상단 배너를 제공한다.
- Acceptance criteria: 큐 대기 중에는 `매칭 대기 중 · 큐 취소`, 전투 중에는 `전투 진행 중 · 전투로 돌아가기`가 보인다.
- Dependencies: queueStatus, battle status, socket status.
- Verification: frontend unit test.

## V5-E2: 연습모드 UX 재설계

### V5-E2-ST01: 연습 화면의 역할 명확화

- Status: planned
- Scope: 연습 화면 문구와 구조를 `술식 연습` 중심으로 정리하고, 레이팅/전적/매칭 로드아웃에 영향을 주지 않음을 표시한다.
- Acceptance criteria: 연습 화면에서 서버 전투 판정과 무관한 로컬 연습임을 즉시 알 수 있다.
- Dependencies: existing practice recognizer state.
- Verification: workspace UI regression test.

### V5-E2-ST02: 카메라 중심 연습 레이아웃

- Status: planned
- Scope: 카메라 프리뷰를 연습 화면의 1순위 영역으로 키우고, 진행률/목표 순서/현재 입력을 카메라 주변에 배치한다.
- Acceptance criteria: 연습 화면에서 사용자가 먼저 보는 것은 카메라와 현재 연습 상태다.
- Dependencies: browser camera permission, live recognizer status.
- Verification: visual smoke check, frontend unit test.

### V5-E2-ST03: 연습 완료 후 CTA 정리

- Status: planned
- Scope: sequence 완료 후 `다시 연습`, `로드아웃 저장`, `매칭 시작`을 제공한다.
- Acceptance criteria: 연습이 끝난 사용자가 다음에 무엇을 할지 명확하다.
- Dependencies: selected skill, session, loadout configured flag.
- Verification: frontend unit test.

### V5-E2-ST04: 연습 선택과 저장 로드아웃 분리 표시

- Status: planned
- Scope: 연습 중인 술식과 매칭에 저장된 로드아웃이 다를 수 있음을 화면에 표시한다.
- Acceptance criteria: 사용자가 연습한 술식이 곧바로 매칭 로드아웃에 반영된다고 오해하지 않는다.
- Dependencies: profile loadout, draft skill selection.
- Verification: frontend unit test.

## V5-E3: 매칭 플로우 재설계

### V5-E3-ST01: CTA 기반 매칭 진입

- Status: planned
- Scope: 매칭은 탭 목적지가 아니라 `랭크 1대1 매칭` CTA 이후의 상태 화면으로 진입한다.
- Acceptance criteria: 로드아웃이 없으면 매칭 CTA가 잠기고 원인을 표시한다.
- Dependencies: session, loadout configured flag.
- Verification: frontend unit test.

### V5-E3-ST02: 매칭 상태 단계 표시

- Status: planned
- Scope: 매칭 화면에 `플레이어 준비`, `로드아웃 확인`, `소켓 연결`, `큐 대기`, `상대 발견`, `전투 준비` 단계를 표시한다.
- Acceptance criteria: 사용자가 현재 왜 기다리는지 알 수 있다.
- Dependencies: queueStatus, socketStatus, profile state.
- Verification: frontend unit test.

### V5-E3-ST03: 매칭 중 이탈/복귀 UX

- Status: planned
- Scope: 매칭 중 다른 목적지로 이동하더라도 큐 상태를 전역 배너로 유지하고, 큐 취소를 제공한다.
- Acceptance criteria: 사용자가 큐에 남아 있는지 모르고 방치하는 상황을 막는다.
- Dependencies: queue state, socket connection lifecycle.
- Verification: frontend unit test.

### V5-E3-ST04: 전투/결과 자동 진입 보장

- Status: planned
- Scope: `battle.started` 이벤트는 전투 화면으로, 전투 종료 이벤트는 결과 화면으로 이동시킨다.
- Acceptance criteria: 전투와 결과는 서버 이벤트가 있을 때만 표시된다.
- Dependencies: battle socket event handling.
- Verification: existing socket event tests extended.

## V5-E4: 기술 리스크 정리

### V5-E4-ST01: 연습과 전투 판정 경계 문서화

- Status: planned
- Scope: 연습은 local progress only, 전투는 WebSocket submit과 서버 repository 판정이라는 경계를 문서와 테스트에 고정한다.
- Acceptance criteria: 연습 완료가 rating/history/battle state를 바꾸지 않는다.
- Dependencies: practice recognizer, game state API.
- Verification: frontend unit test, backend regression not required.

### V5-E4-ST02: 실제 손동작 판정 고도화 기준

- Status: blocked
- Scope: 현재 browser frame signal runtime을 실제 landmark 기반 손동작 분류로 교체할지 결정한다.
- Acceptance criteria: 사용할 runtime, token 기준, 검증 방식이 승인되어야 한다.
- Dependencies: 손모양 source와 runtime 선택.
- Verification: future camera smoke and classifier test.

### V5-E4-ST03: 운영형 매칭 런타임 설계

- Status: blocked
- Scope: in-process queue와 active battle runtime을 multi-process 안전한 구조로 분리한다.
- Acceptance criteria: queue/session store, reconnect ownership, timeout worker 설계가 확정된다.
- Dependencies: 운영 인프라 선택.
- Verification: future integration test.
