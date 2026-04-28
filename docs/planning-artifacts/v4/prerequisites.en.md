# v4 Prerequisites

## Product Conditions

- Japanese startup commands are an app-entry convenience feature, not battle skill activation.
- Japanese STT success is only a trigger for starting hand-motion input.
- Work-specific unique phrases are excluded from defaults.
- Commands are limited to basic Japanese commands and generic concept commands.

## Technical Conditions

- Voice startup requires browser speech recognition API support.
- Microphone permission is required.
- Unsupported or blocked recognition must still allow the same flow through manual startup.

## Privacy Conditions

- Raw audio is not stored.
- Transcripts are not sent to the server.
- Recognition results are only used for home-screen state display and immediate routing decisions.

## Stop Conditions

- If the request shifts to battle skill activation, pause until the skill domain source is approved.
- If STT success needs to validate skills through hand motion, pause until the approved skill domain source exists.
- If account-level custom command storage is needed, define privacy retention rules first.
- If an out-of-browser STT provider becomes necessary, decide cost, key management, and retention policy separately.
