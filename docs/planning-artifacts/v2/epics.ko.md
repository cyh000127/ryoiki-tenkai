# v2 에픽

이 문서는 v1 릴리스 이후의 v2 작업을 에픽 단위로 정리합니다. 스킬명, 스킬 효과, 손동작 리소스, 시각 자산은 별도 도메인 명세가 확정되기 전까지 구현하지 않습니다.

## Epic V2-E1: Live Recognition Runtime Hardening

### 목표

브라우저 입력 adapter를 실제 프레임 기반 recognizer와 안정적으로 결합하고, 인식 상태를 전투 입력으로 안전하게 전달합니다.

### 제품 결과

- 카메라 시작, 중지, 권한 차단, 미지원, 오류 상태가 명확하게 보입니다.
- no-hand, unstable-hand, recognized-gesture 상태가 전투 입력 상태와 분리됩니다.
- local recognition success는 서버 확정 전까지 스킬 효과로 표시되지 않습니다.

### 엔지니어링 경계

- Frontend는 camera/runtime adapter, token normalization, sequence state machine, smoke fixture를 소유합니다.
- Backend는 normalized gesture sequence와 action metadata만 받습니다.
- raw frame, raw landmark, tracking stream은 backend로 전송하지 않습니다.

### 스토리

- V2-E1-ST01: live recognizer adapter boundary 연결.
- V2-E1-ST02: concrete frame recognizer adapter 선택 및 결합.
- V2-E1-ST03: no-hand, unstable-hand, recognized-token UI 상태 분리.
- V2-E1-ST04: recognizer restart, cleanup, permission recovery hardening.

### 수용 신호

- camera permission allowed/denied smoke가 자동화되어 있습니다.
- recognizer가 stop 또는 component unmount 시 stream resource를 정리합니다.
- recognized token dispatch가 server-authoritative submission rule을 우회하지 않습니다.

## Epic V2-E2: Persistence and Runtime Operation Readiness

### 목표

v1 runtime persistence를 adapter 경계 뒤에 두고, 운영 환경으로 이동할 때 필요한 storage, migration, recovery 절차를 명확히 합니다.

### 제품 결과

- result, history, rating, compact action audit이 storage adapter 뒤에서 유지됩니다.
- JSON 개발 저장소와 SQL 호환 저장소를 같은 repository contract로 사용할 수 있습니다.
- reset, reload, migration failure를 검증 가능한 절차로 다룹니다.

### 엔지니어링 경계

- Backend repository는 runtime state와 battle rule을 소유하되 storage media 세부사항을 직접 알지 않습니다.
- Storage adapter는 persistence snapshot load/save와 SQL transaction boundary를 소유합니다.
- Docs는 migration, local recovery, rollback note를 소유합니다.

### 스토리

- V2-E2-ST01: storage adapter persistence 전환.
- V2-E2-ST02: SQL migration apply/rollback smoke 절차 작성.
- V2-E2-ST03: storage adapter failure mode와 fallback policy 정의.
- V2-E2-ST04: compact audit retention boundary 문서화.

### 수용 신호

- repository reload 후 profile, history, audit snapshot이 보존됩니다.
- storage adapter test가 JSON, SQL, null adapter를 모두 커버합니다.
- raw recognition data가 history/audit에 저장되지 않습니다.

## Epic V2-E3: Real Match Flow and Session Robustness

### 목표

practice rival 중심의 v1 loop를 실제 플레이어 매칭 운영에 가깝게 고도화합니다.

### 제품 결과

- 두 플레이어가 queue에 들어가 하나의 battle session으로 안정적으로 연결됩니다.
- reconnect, duplicate event, delayed event, ended battle replay가 일관되게 처리됩니다.
- timeout과 surrender가 socket 연결 상태와 무관하게 최종 상태를 남깁니다.

### 엔지니어링 경계

- Backend는 queue matching, battle session ownership, socket fanout, timeout resolution을 소유합니다.
- Frontend는 socket reconnect UX, latest snapshot reconciliation, result routing을 소유합니다.
- Worker는 API write ownership을 우회하지 않는 보조 작업만 맡습니다.

### 스토리

- V2-E3-ST01: two-player queue pairing rule 강화.
- V2-E3-ST02: socket reconnect와 latest snapshot 재동기화 hardening.
- V2-E3-ST03: delayed/duplicate event reconciliation 회귀 테스트 확대.
- V2-E3-ST04: timeout watcher와 surrender event fanout 안정화.

### 수용 신호

- 두 플레이어가 같은 battle id, 서로 반대 seat, 동일 turn state를 받습니다.
- reconnect 후 UI가 stale snapshot으로 rollback되지 않습니다.
- battle end event는 rating/history write를 중복하지 않습니다.

## Epic V2-E4: Skill and Resource Domain Intake

### 목표

스킬을 임의로 만들지 않고, 별도 도메인 명세가 확정된 뒤 계약과 구현으로 옮길 수 있는 intake 절차를 준비합니다.

### 제품 결과

- 스킬명, 효과, 비용, 쿨다운, gesture sequence, resource key의 입력 형식이 합의됩니다.
- 확정 전에는 placeholder를 정식 스킬로 오해하지 않게 표시합니다.
- 확정 후에는 shared catalog fixture, API response, frontend render가 같은 source를 사용합니다.

### 엔지니어링 경계

- Product/domain owner는 skill design source를 제공합니다.
- Backend는 approved skill catalog validation과 server-authoritative battle rule을 구현합니다.
- Frontend는 approved catalog를 표시하고 미승인 resource를 임의 생성하지 않습니다.

### 스토리

- V2-E4-ST01: skill domain source format 정의.
- V2-E4-ST02: approved skill catalog fixture migration.
- V2-E4-ST03: skill/resource metadata API contract 확장.
- V2-E4-ST04: frontend loadout/resource rendering 연결.

### 수용 신호

- 스킬 변경은 별도 source와 contract diff로 추적됩니다.
- gesture token과 skill effect가 서로 독립적으로 검증됩니다.
- 승인되지 않은 스킬명, 효과, 이미지, 손동작 리소스는 구현하지 않습니다.

## Epic V2-E5: QA, Release, and Handoff

### 목표

v2 변경을 반복 가능한 검증 단위로 묶고, 릴리스 전에 남은 위험을 문서화합니다.

### 제품 결과

- 브라우저 카메라 smoke, backend rule tests, frontend state tests, boundary checks가 release gate에 포함됩니다.
- docs는 한국어/영어로 같은 내용을 제공합니다.
- 외부 제공자명이나 승인되지 않은 서비스명을 문서와 제품 문구에 넣지 않습니다.

### 엔지니어링 경계

- Tests는 구현된 behavior를 자동 검증합니다.
- Docs는 계획, 선행조건, implementation record, known gap을 소유합니다.
- Release note는 완료된 항목과 보류 항목을 분리합니다.

### 스토리

- V2-E5-ST01: v2 planning baseline 작성.
- V2-E5-ST02: v2 smoke checklist 갱신.
- V2-E5-ST03: release readiness 재점검.
- V2-E5-ST04: provider-neutral text scan 유지.

### 수용 신호

- README가 v2 planning docs와 implementation records를 연결합니다.
- 스킬 구현 보류 사유가 명확히 기록됩니다.
- handoff 전 검증 명령과 scan 결과를 남깁니다.
