# v4 Technology Stack Decision

This document records the technology choices for the Japanese voice startup command. The v4 goal is free, fast, frontend-first implementation.

## Decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Speech recognition | Web Speech API-compatible browser speech recognition | Enables `ja-JP` recognition without a paid external STT service |
| Runtime location | Frontend only | Startup routing does not need server-authoritative battle validation, and this avoids server cost and key management |
| Language | `ja-JP` | Matches Japanese startup commands |
| Matching | Keyword containment matching | Keeps the MVP deterministic without natural-language intent analysis |
| Fallback | Manual startup button | Keeps the entry flow available when recognition is unsupported, blocked, or failed |
| Storage | No persistence | Audio and transcript data are not stored in backend persistence |

## Boundaries

- The startup command only routes to the next valid step: guest creation, loadout, or queue start.
- Voice startup is not connected to battle actions, skill effects, or gesture sequence validation.
- The transcript stays in frontend UI/test state and is not sent to the server.
- Work-specific unique phrases are excluded from the default command set.

## Excluded

- Accent evaluation
- Pronunciation scoring
- Emotion analysis
- Paid external STT integration
- Guaranteed fully offline STT
- Complex natural-language intent analysis

## Default Command Set

Basic commands:

- `起動して`
- `スタート`
- `始めて`
- `開始`
- `エンジンをかけて`

Generic concept commands:

- `結界展開`
- `術式起動`
- `呪力起動`
- `封印解除`
- `開門`
- `解放`
