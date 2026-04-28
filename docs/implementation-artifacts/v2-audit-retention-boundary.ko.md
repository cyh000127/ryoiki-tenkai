# v2 compact audit retention boundary

이 문서는 `V2-E2-ST04`의 구현 기록입니다. 전투 종료 후 저장되는 compact audit의 보존 필드, 제외 데이터, 보존 기간, export/debug 기준을 명확히 합니다.

## 목적

- 전투 감사 기록이 debugging과 handoff에 필요한 최소 metadata만 저장하도록 경계를 고정합니다.
- raw frame, raw landmark, tracking stream이 storage snapshot이나 SQL table에 들어가지 않도록 명시합니다.
- 저장소 증가와 privacy risk를 줄이기 위해 retained field와 retention horizon을 문서화합니다.

## 현재 저장 위치

| 저장 경로 | 내용 | 기준 |
| --- | --- | --- |
| runtime repository | `match_audits[battle_session_id]` | 완료된 battle의 compact audit list |
| JSON adapter | `match_audits` object | local snapshot 교체 저장 |
| SQL adapter | `match_audits` table | migration `0002_game_state_storage` 기준 |

## Retained Fields

Compact audit row는 아래 필드만 보존합니다.

| 필드 | 목적 | 비고 |
| --- | --- | --- |
| `battle_session_id` | audit grouping key | SQL row와 JSON object의 전투 단위 식별자 |
| `turn_number` | action order 확인 | replay/debug 순서 판단용 |
| `actor_player_id` | actor 확인 | player 식별자만 저장 |
| `message` | compact action summary | SQL schema 기준 `String(240)` 경계 |
| `created_at` | audit event time | timezone-aware datetime |

`match_history`는 결과/레이팅 조회용이며 audit row를 대체하지 않습니다. `match_history`에는 `match_id`, `battle_session_id`, `player_id`, `opponent_id`, `result`, `skillset_id`, `rating_change`, `rating_after`, `ended_reason`, `turn_count`, `played_at`만 저장합니다.

## Excluded Data

아래 데이터는 compact audit, match history, storage snapshot에 저장하지 않습니다.

- camera raw frame, image, video frame
- raw landmark list, recognizer-specific coordinate payload
- tracking stream, confidence time series, per-frame stability sample
- submitted `gestureSequence` payload
- permission prompt 상태, device identifier, browser media device label
- frontend debug panel의 manual replay 입력 원본

현재 회귀 테스트는 audit row에 `gestureSequence`와 `tracking` key가 저장되지 않는지 확인합니다.

## Retention Horizon

- 현재 v2에서는 별도 TTL, pruning job, archiving job을 구현하지 않습니다.
- JSON adapter는 현재 repository snapshot 전체를 target file에 교체 저장합니다.
- SQL adapter는 현재 snapshot 기준 rows를 transaction 안에서 교체 저장합니다.
- 따라서 compact audit은 repository snapshot 또는 SQL database가 보존되는 동안 유지됩니다.
- local disposable state는 reset하거나 파일을 이동하면 audit도 함께 제거됩니다.
- production-like storage에서 retention 기간을 줄이려면 별도 story로 pruning rule, migration, export policy를 먼저 정의해야 합니다.

## Export와 Debug 기준

허용:

- 특정 `battle_session_id`의 compact audit row를 debugging handoff에 첨부합니다.
- `turn_number`, `actor_player_id`, `message`, `created_at`만 포함한 text/table export를 만듭니다.
- storage migration smoke 또는 failure handoff에서 compact audit row count를 확인합니다.

금지:

- raw frame, raw landmark, tracking stream을 export에 포함합니다.
- frontend recognizer 내부 payload를 audit message에 직렬화합니다.
- audit retention을 늘리기 위해 storage adapter가 recognizer raw data를 알게 만듭니다.
- 승인되지 않은 skill/resource 세부사항을 audit message에 새로 만들어 넣습니다.

## 변경이 필요한 경우

아래 변경은 별도 story와 review가 필요합니다.

- audit field 추가 또는 column length 변경
- player 식별자 외 device/browser/media metadata 저장
- TTL, pruning, export endpoint, archive job 추가
- raw recognition data 또는 recognizer-specific payload 저장
- audit message format을 skill domain source에 맞춰 변경

## 구현 근거

- `BE/api/src/gesture_api/repositories/game_state.py`
  - 전투 종료 시 battle log에서 `turn_number`, `actor_player_id`, `message`, `created_at`만 추출합니다.
- `BE/api/src/gesture_api/models/game_state.py`
  - `MatchAuditOrm`은 compact audit field만 정의합니다.
- `BE/api/migrations/versions/0002_game_state_storage_tables.py`
  - SQL table schema가 compact audit columns를 고정합니다.
- `BE/api/tests/unit/test_game_flow_api.py`
  - reload 후 profile/history/audit 보존과 raw command payload 제외를 검증합니다.

## 검증

- `git diff --check`
- provider-neutral targeted text scan
- docs review
