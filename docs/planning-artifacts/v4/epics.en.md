# v4 Epics

v4 adds Japanese voice startup commands to the existing home-screen entry flow. In-battle skill usage and skill/resource domain implementation remain out of scope because the approved source is still not available.

## V4-E1: Japanese Voice Startup Command

- Goal: let a user progress through app startup with Japanese voice commands.
- Scope: microphone start button, `ja-JP` recognition, command matching, success/failure states, manual fallback.
- Excluded: battle action submission, skill activation, accent or pronunciation evaluation.
- Acceptance signals:
  - A supported browser can produce a Japanese transcript after the microphone button is pressed.
  - A matching registered command routes to the next valid step for the current player state.
  - Unsupported, blocked, and failed recognition states expose manual startup.

## V4-E2: Command Customization Readiness

- Goal: leave a structure that can later support user-defined commands.
- Scope: keep the command array and matching function outside the UI component.
- Excluded: persisted custom commands and account-level command APIs.
- Acceptance signals:
  - Commands can be added or replaced without changing the UI component.
  - The matching function has unit tests.

## V4-E3: Voice Startup Release Evidence

- Goal: document the free built-in STT path, fallback behavior, and privacy boundary.
- Scope: technology stack, stories, implementation order, prerequisites, and implementation record.
- Acceptance signals:
  - Korean and English documents exist as pairs.
  - Provider-specific terms, work-specific unique phrases, and raw voice persistence are excluded by default.
