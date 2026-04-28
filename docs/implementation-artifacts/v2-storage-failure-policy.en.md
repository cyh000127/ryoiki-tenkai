# v2 Storage Failure Mode and Fallback Policy

This document is the implementation record for `V2-E2-ST03`. It defines failure modes, allowed fallback behavior, and recovery rules so storage adapter load/save failures do not turn into silent data loss.

## Purpose

- Do not continue with empty state silently after a storage adapter failure.
- Separate local development fallback from production behavior.
- Clarify the responsibilities and allowed scope of the JSON, SQL, and null adapters.

## Policy Summary

| Situation | Policy | Reason |
| --- | --- | --- |
| Storage is empty | Runtime may start with empty state | Allows first local run and test bootstrap. |
| JSON state file is missing | Treat as `None` snapshot | Required for local bootstrap. |
| JSON state file is corrupted | Surface the exception and block startup | Prevents overwriting corrupted state as empty state. |
| JSON save fails | Surface the exception | Prevents mistaking failed persistence for success. |
| SQL load fails | Surface the exception | Does not hide database or migration problems. |
| SQL save fails | Roll back the transaction and surface the exception | Prevents partial writes. |
| Null adapter is used | Allowed only for explicit tests or temporary runs | Prevents accidental persistence disablement. |

## Adapter Rules

### `JsonGameStateStorageAdapter`

- Missing file returns a `None` snapshot as local bootstrap.
- Existing file with JSON parse failure surfaces the exception.
- Save writes to a temporary file first and then replaces the target file.
- Read/write errors propagate to the caller.
- It is not a fallback for production persistence.

### `SqlGameStateStorageAdapter`

- Database query or connection errors propagate to the caller.
- Save replaces existing snapshot rows inside a transaction.
- Save rolls back and re-raises on exception.
- A database without required migrations is recorded as a blocker through the smoke procedure.

### `NullGameStateStorageAdapter`

- Load always returns `None`; save does not persist anything.
- Use only in unit tests, ephemeral local runs, or explicit smoke fixtures.
- Do not use it as an automatic fallback in production or state-preserving local runs.

## Allowed Fallback Scope

Allowed:

- Tests explicitly inject `NullGameStateStorageAdapter`.
- Migration reset smoke runs against a local disposable database.
- First bootstrap is allowed when the JSON file does not exist yet.

Disallowed:

- Automatically switching to the null adapter after load failure.
- Treating corrupted JSON state as an empty snapshot.
- Returning success after SQL save failure.
- Continuing in runtime-only mode after migration failure in a production-like run.

## Recovery Rules

### JSON Local State

1. Preserve the corrupted file.
2. Record the failed command and error message in the handoff note.
3. If local state does not need to be preserved, move the file aside and start a new bootstrap.
4. If state must be preserved, repair the JSON structure before restarting.

### SQL State

1. Run `scripts/storage-migration-smoke.ps1 -PlanOnly` to confirm target and procedure.
2. Check the migration state.
3. Record the failed revision, command, and stderr.
4. Run reset or rollback smoke only against a disposable local database.
5. Do not reset a state-preserving database without a backup/restore procedure.

## Implementation

- `JsonGameStateStorageAdapter.load` no longer treats corrupted JSON as an empty snapshot.
- `SqlGameStateStorageAdapter.save` rolls back and re-raises on exception.
- `test_json_game_state_storage_adapter_rejects_corrupted_snapshot` verifies corrupted JSON rejection.

## Verification

- `uv run ruff check BE`
- `uv run pytest BE/api/tests/unit/test_game_state_storage.py`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\storage-migration-smoke.ps1 -PlanOnly`
- `git diff --check`
- provider-neutral targeted text scan
