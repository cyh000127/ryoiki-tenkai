# v2 storage failure mode와 fallback policy

이 문서는 `V2-E2-ST03`의 구현 기록입니다. storage adapter load/save 실패가 조용한 데이터 손실로 이어지지 않도록 실패 모드, fallback 허용 범위, 복구 기준을 정의합니다.

## 목적

- storage adapter 실패 시 빈 상태로 조용히 진행하지 않습니다.
- local development fallback과 production behavior를 분리합니다.
- JSON, SQL, null adapter의 책임과 허용 범위를 명확히 합니다.

## 정책 요약

| 상황 | 정책 | 이유 |
| --- | --- | --- |
| storage가 아직 비어 있음 | empty runtime state로 시작 가능 | 첫 로컬 실행과 테스트 bootstrap을 허용합니다. |
| JSON state file이 없음 | `None` snapshot으로 처리 | local bootstrap에 필요합니다. |
| JSON state file이 손상됨 | 예외를 노출하고 시작을 막음 | 손상된 저장소를 빈 상태로 덮어쓰지 않습니다. |
| JSON save 실패 | 예외를 노출 | 저장 실패를 성공으로 오인하지 않습니다. |
| SQL load 실패 | 예외를 노출 | database 또는 migration 문제를 숨기지 않습니다. |
| SQL save 실패 | transaction rollback 후 예외를 노출 | partial write를 막습니다. |
| null adapter 사용 | 명시적인 테스트/임시 실행에서만 허용 | 실수로 persistence를 끄지 않게 합니다. |

## Adapter별 기준

### `JsonGameStateStorageAdapter`

- 파일이 없으면 local bootstrap으로 보고 `None` snapshot을 반환합니다.
- 파일이 존재하지만 JSON parse에 실패하면 예외를 노출합니다.
- save는 temporary file에 먼저 기록한 뒤 replace합니다.
- read/write 오류는 호출자에게 전파합니다.
- production persistence용 fallback으로 사용하지 않습니다.

### `SqlGameStateStorageAdapter`

- database query 또는 connection 오류는 호출자에게 전파합니다.
- save는 transaction 안에서 기존 snapshot rows를 교체합니다.
- save 중 예외가 발생하면 rollback하고 예외를 다시 던집니다.
- migration이 적용되지 않은 database는 smoke 절차에서 blocker로 기록합니다.

### `NullGameStateStorageAdapter`

- load는 항상 `None`을 반환하고 save는 아무것도 저장하지 않습니다.
- unit test, ephemeral local run, 명시적 smoke fixture에서만 사용합니다.
- production 또는 보존해야 하는 local run에서 자동 fallback으로 사용하지 않습니다.

## Fallback 허용 범위

허용:

- 테스트에서 명시적으로 `NullGameStateStorageAdapter`를 주입합니다.
- local disposable database에서 migration reset smoke를 실행합니다.
- JSON 파일이 아직 없을 때 최초 bootstrap을 허용합니다.

금지:

- load failure 후 자동으로 null adapter로 전환합니다.
- 손상된 JSON state를 빈 snapshot으로 취급합니다.
- SQL save failure 후 성공 응답을 반환합니다.
- production-like run에서 migration 오류를 무시하고 runtime-only state로 진행합니다.

## 복구 기준

### JSON local state

1. 손상된 파일을 보존합니다.
2. 실패 command와 오류 메시지를 handoff note에 기록합니다.
3. 보존할 필요가 없는 local state이면 파일을 별도 위치로 이동한 뒤 새 bootstrap을 시작합니다.
4. 보존해야 하는 state이면 JSON 구조를 복구한 뒤 다시 시작합니다.

### SQL state

1. `scripts/storage-migration-smoke.ps1 -PlanOnly`로 target과 절차를 확인합니다.
2. migration 적용 상태를 확인합니다.
3. 실패 revision, command, stderr를 기록합니다.
4. disposable local database일 때만 reset 또는 rollback smoke를 실행합니다.
5. 보존해야 하는 database는 backup/restore 절차 없이는 reset하지 않습니다.

## 구현 반영

- `JsonGameStateStorageAdapter.load`는 손상된 JSON을 빈 snapshot으로 삼지 않고 예외를 노출합니다.
- `SqlGameStateStorageAdapter.save`는 예외 발생 시 rollback 후 예외를 다시 던집니다.
- `test_json_game_state_storage_adapter_rejects_corrupted_snapshot`가 손상된 JSON을 거부하는지 검증합니다.

## 검증

- `uv run ruff check BE`
- `uv run pytest BE/api/tests/unit/test_game_state_storage.py`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -PlanOnly`
- `git diff --check`
- provider-neutral targeted text scan
