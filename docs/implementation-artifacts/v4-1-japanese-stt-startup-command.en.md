# v4-1 Japanese Voice Startup Command Implementation Record

## Purpose

Add a free, fast Japanese voice startup command to the home screen. Voice commands are entry commands for app startup and stay separate from battle skill activation and gesture sequence validation.

## Decisions

- Use Web Speech API-compatible browser speech recognition.
- Set the language to `ja-JP`.
- Match commands through normalized keyword containment.
- On success, reuse the existing guest creation, loadout navigation, and matchmaking handlers.
- Provide manual startup fallback for unsupported, blocked, and failed recognition states.
- Do not send or store transcripts or audio on the server.

## Included Scope

- Basic Japanese commands and generic concept commands.
- Separate `idle`, `listening`, `matched`, `rejected`, `unsupported`, `blocked`, and `error` states.
- Home-screen voice startup panel.
- Transcript and matched-command display.
- Manual startup fallback.
- Model unit tests and workspace UI regression tests.

## Excluded Scope

- Accent evaluation
- Pronunciation scoring
- Voice emotion analysis
- Paid external STT integration
- Guaranteed fully offline STT
- In-battle skill activation
- User-level command persistence

## Command Policy

The default command set starts with:

- `起動して`
- `スタート`
- `始めて`
- `開始`
- `エンジンをかけて`
- `結界展開`
- `術式起動`
- `呪力起動`
- `封印解除`
- `開門`
- `解放`

Work-specific unique phrases are excluded from the default set. If needed later, they should be added only after product policy and copy review.

## Completion Criteria

- A user can press the voice startup button on the home screen.
- Japanese recognition output is displayed.
- A registered command contained in the transcript triggers startup success.
- Startup success routes to guest creation, loadout, or matchmaking based on the current player state.
- Manual startup remains available when recognition fails or is unsupported.
- No paid external STT is used.

## Verification Results

| Check | Status | Notes |
| --- | --- | --- |
| `pnpm --dir FE/app typecheck` | PASS | TypeScript compile check |
| `pnpm --dir FE/app test` | PASS | FE 54 tests |
| `pnpm --dir FE/app build` | PASS | production build |
| `git diff --check` | PASS | no whitespace errors |
| provider-neutral scan | PASS | no forbidden provider/service terms |
