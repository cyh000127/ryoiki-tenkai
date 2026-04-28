# v3 에픽

이 문서는 v3를 릴리스/인수인계 안정화 범위로 정의합니다. skill/resource 구현은 별도 domain source가 확정될 때까지 v3 범위에 포함하지 않습니다. recognizer runtime binding은 이후 v2-12에서 완료되었습니다.

## Epic V3-E1: Handoff Verification Automation

반복 실행 가능한 검증 진입점을 만들어, 프론트엔드/백엔드/compose/docs scan을 한 번에 확인할 수 있게 합니다.

### 수용 신호

- 로컬 개발자는 단일 스크립트로 v3 handoff 검증을 실행할 수 있습니다.
- 빠른 검증과 전체 검증을 분리할 수 있습니다.
- provider-neutral text scan과 boundary check가 같은 검증 흐름에 포함됩니다.
- 실패한 command가 명확히 표시됩니다.

### Stories

- V3-E1-ST01: 통합 handoff 검증 스크립트 작성.
- V3-E1-ST02: 검증 스크립트 사용법과 실패 대응 문서화.

## Epic V3-E2: Runtime Health and Diagnostics

운영 전 확인해야 할 runtime 상태를 API와 문서에서 더 명확히 보여줍니다.

### 수용 신호

- health endpoint가 application status와 runtime dependency policy를 구분합니다.
- storage mode와 database URL 세부값은 노출하지 않고, 안전한 summary만 제공합니다.
- FE/BE 계약 변경은 테스트로 고정됩니다.

### Stories

- V3-E2-ST01: backend health response에 safe runtime summary 추가.
- V3-E2-ST02: health response contract와 테스트 갱신.

## Epic V3-E3: Release Evidence and Handoff

v3에서 완료된 범위와 여전히 blocked인 범위를 분리해, 다음 작업자가 같은 판단을 반복하지 않게 합니다.

### 수용 신호

- v3 smoke checklist가 구현된 검증과 blocked 항목을 분리합니다.
- v3 release readiness가 full feature release 여부와 handoff 가능 여부를 분리합니다.
- README에서 v3 문서를 찾을 수 있습니다.

### Stories

- V3-E3-ST01: v3 smoke checklist 작성.
- V3-E3-ST02: v3 release readiness 작성.
- V3-E3-ST03: README와 v1/v2 handoff 문서에 v3 링크 추가.

## Epic V3-E4: Blocker Carryover Guard

승인되지 않은 domain 결정을 구현으로 착각하지 않도록 blocker를 유지합니다.

### 수용 신호

- approved skill domain source 전까지 skill/resource 구현은 blocked로 남습니다.
- 문서와 product copy는 승인되지 않은 외부 제공자명 또는 서비스명을 포함하지 않습니다.

### Stories

- V3-E4-ST01: v2 blocker carryover를 v3 readiness에 명시.
- V3-E4-ST02: provider-neutral scan을 v3 release gate에 포함.
