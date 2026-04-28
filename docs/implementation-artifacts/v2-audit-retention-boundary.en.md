# v2 Compact Audit Retention Boundary

This document is the implementation record for `V2-E2-ST04`. It clarifies which compact battle audit fields are retained after battle completion, which data is excluded, the retention horizon, and export/debug rules.

## Purpose

- Keep battle audit records limited to the minimum metadata needed for debugging and handoff.
- Explicitly keep raw frames, raw landmarks, and tracking streams out of storage snapshots and SQL tables.
- Document retained fields and the retention horizon to reduce storage growth and privacy risk.

## Current Storage Locations

| Storage Path | Content | Basis |
| --- | --- | --- |
| runtime repository | `match_audits[battle_session_id]` | compact audit list for a completed battle |
| JSON adapter | `match_audits` object | local snapshot replacement |
| SQL adapter | `match_audits` table | migration `0002_game_state_storage` |

## Retained Fields

A compact audit row retains only these fields.

| Field | Purpose | Notes |
| --- | --- | --- |
| `battle_session_id` | audit grouping key | battle-level identifier in SQL rows and the JSON object |
| `turn_number` | action order check | used for replay/debug ordering |
| `actor_player_id` | actor check | stores only the player identifier |
| `message` | compact action summary | `String(240)` boundary in the SQL schema |
| `created_at` | audit event time | timezone-aware datetime |

`match_history` is for result and rating lookup; it does not replace audit rows. It stores only `match_id`, `battle_session_id`, `player_id`, `opponent_id`, `result`, `skillset_id`, `rating_change`, `rating_after`, `ended_reason`, `turn_count`, and `played_at`.

## Excluded Data

Do not store the following data in compact audit rows, match history rows, or storage snapshots.

- camera raw frames, images, or video frames
- raw landmark lists or recognizer-specific coordinate payloads
- tracking streams, confidence time series, or per-frame stability samples
- submitted `gestureSequence` payloads
- permission prompt state, device identifiers, or browser media device labels
- original manual replay input from the frontend debug panel

The current regression test checks that audit rows do not contain `gestureSequence` or `tracking` keys.

## Retention Horizon

- v2 does not implement a TTL, pruning job, or archiving job.
- The JSON adapter replaces the target file with the current repository snapshot.
- The SQL adapter replaces rows for the current snapshot inside a transaction.
- Therefore compact audit remains for as long as the repository snapshot or SQL database is retained.
- Local disposable state removal or file movement removes the audit with that state.
- Production-like storage needs a separate story for pruning rules, migrations, and export policy before shortening retention.

## Export and Debug Rules

Allowed:

- Attach compact audit rows for a specific `battle_session_id` to a debugging handoff.
- Export only `turn_number`, `actor_player_id`, `message`, and `created_at` as text/table data.
- Check compact audit row counts during storage migration smoke or failure handoff.

Disallowed:

- Including raw frames, raw landmarks, or tracking streams in exports.
- Serializing frontend recognizer internals into audit messages.
- Making storage adapters aware of recognizer raw data to increase audit retention.
- Inventing unapproved skill/resource details inside audit messages.

## Changes That Need a Separate Story

These changes require a separate story and review.

- Adding audit fields or changing column length.
- Storing device/browser/media metadata beyond player identifiers.
- Adding TTL, pruning, export endpoint, or archive jobs.
- Storing raw recognition data or recognizer-specific payloads.
- Changing audit message format based on a skill domain source.

## Implementation Evidence

- `BE/api/src/gesture_api/repositories/game_state.py`
  - Extracts only `turn_number`, `actor_player_id`, `message`, and `created_at` from the battle log when a battle ends.
- `BE/api/src/gesture_api/models/game_state.py`
  - `MatchAuditOrm` defines only compact audit fields.
- `BE/api/migrations/versions/0002_game_state_storage_tables.py`
  - SQL table schema fixes the compact audit columns.
- `BE/api/tests/unit/test_game_flow_api.py`
  - Verifies profile/history/audit persistence after reload and exclusion of raw command payloads.

## Verification

- `git diff --check`
- provider-neutral targeted text scan
- docs review
