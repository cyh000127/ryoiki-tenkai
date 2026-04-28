# v3-2 health runtime summary 구현 기록

이 문서는 `V3-E2-ST01`과 `V3-E2-ST02`의 구현 기록입니다. backend health 응답에 secret을 노출하지 않는 runtime summary를 추가하고 contract/test를 갱신했습니다.

## 구현 내용

- `BE/api/src/gesture_api/api/schemas/health.py`
  - `HealthRuntimeSummary` schema를 추가했습니다.
  - `HealthResponse`가 `runtime` summary를 포함하도록 확장했습니다.
- `BE/api/src/gesture_api/api/routes/health.py`
  - app environment, database configured 여부, state storage mode, persistence policy, recognition data boundary, recognizer runtime, blocked domain source 상태를 반환합니다.
  - database URL, credential, raw recognition data는 반환하지 않습니다.
- `BE/api/contracts/openapi/admin-api.json`
  - `HealthRuntimeSummary` schema와 `HealthResponse.runtime` contract를 추가했습니다.
- `BE/api/tests/unit/test_health_api.py`
  - health 응답 shape와 safe summary 값을 고정했습니다.
  - database URL 또는 credential fragment가 응답에 노출되지 않는지 확인합니다.
- `BE/api/tests/unit/test_contract_files.py`
  - OpenAPI health contract required field를 확인합니다.

## 보류 항목

- health endpoint는 readiness check를 대체하지 않습니다. 상세 검증은 `scripts/v3-handoff-check.ps1`이 담당합니다.
- skill/resource 구현은 approved domain source 전까지 계속 blocked입니다.

## 검증

- `uv run ruff check BE`
- `uv run pytest BE/api/tests/unit/test_health_api.py BE/api/tests/unit/test_contract_files.py`
- `uv run pytest BE`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode fast`

## 다음 단계

1. v3 smoke checklist에 health summary 확인을 추가합니다.
2. v3 release readiness에 health contract 검증 결과를 기록합니다.
