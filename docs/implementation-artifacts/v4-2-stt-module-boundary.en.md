# v4-2 STT Module Boundary Implementation Record

## Purpose

Separate the browser STT lifecycle from the Japanese startup command model into a shared transcript recognizer port. The future flow targets `STT command recognized -> hand-motion recognition activated -> approved skill domain validates the result`, not pronunciation or accent scoring.

## Implementation

- Added `FE/app/src/shared/speech/browserSpeechRecognition.ts`.
- Moved browser speech recognition constructor lookup, start/stop, transcript extraction, permission-denied/error status mapping into the shared module.
- Kept `startupVoiceCommand` focused on `ja-JP` command normalization and keyword matching.
- Added unit tests for the shared STT module.

## Preserved Boundaries

- STT only recognizes the trigger phrase.
- Pronunciation scoring, accent scoring, and emotion analysis are not implemented.
- Hand-motion sequences and skill effect validation wait until the approved skill domain source is ready.
- Transcripts and audio are not sent to or stored on the server.

## Verification Results

| Check | Status | Notes |
| --- | --- | --- |
| `pnpm --dir FE/app typecheck` | PASS | TypeScript compile check |
| `pnpm --dir FE/app test` | PASS | FE unit regression |
| `pnpm --dir FE/app build` | PASS | production build |
| `git diff --check` | PASS | no whitespace errors |
| provider-neutral scan | PASS | no forbidden provider/service terms |
