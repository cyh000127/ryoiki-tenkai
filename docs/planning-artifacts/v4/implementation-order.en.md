# v4 Implementation Order

## 1. Command Model

- Split the `ja-JP` speech recognition wrapper into a feature model.
- Add the default command array and normalization function.
- Lock keyword containment matching with unit tests.

## 2. Home-Screen Integration

- Add a voice startup panel to the home screen.
- Separate status values: `idle`, `listening`, `matched`, `rejected`, `unsupported`, `blocked`, and `error`.
- Reuse existing handlers on success.
  - No session: create guest
  - Missing loadout: open loadout
  - Ready player: start matchmaking

## 3. Fallback and Error Handling

- Display unsupported and blocked states.
- Always provide a manual startup button.
- Keep transcript and matched command in UI state only.

## 4. Documents and Verification

- Add v4 planning documents and implementation records in Korean and English.
- Link v4 status from the README.
- Run frontend typecheck, unit tests, and production build.

## Commit Unit

- Suggested commit: `feat(frontend): 일본어 음성 시동 명령 추가`
- Scope: docs, frontend model, home UI, and tests.
- Reason: track one coherent feature while keeping push count low.
