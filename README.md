# Gesture Skill Workspace

This repository is a neutral scaffold for a browser-based hand gesture control surface and a backend command runtime.

## Boundaries

- `FE/app`: browser app, route shell, gesture control UI, generated API client boundary.
- `BE/api`: canonical write owner for command, session, mapping, and audit state.
- `BE/core`: shared domain value objects and pure rules.
- `BE/worker`: delayed or asynchronous processing that does not bypass API write ownership.
- `BE/api/contracts`: canonical wire contract source.
- `scripts`: repository-owned setup and verification entrypoints.
- `infra/runtime`: local runtime topology notes.
- `ops`: operational configuration placeholders.

## Local Entry Points

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\bootstrap.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\check-boundaries.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\backend-check.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\frontend-check.ps1
```

Use `-InstallDependencies` with `scripts\bootstrap.ps1` only when the local package tools are already installed.

## Scaffold Policy

- Keep external provider details out of documentation and product copy.
- Keep camera frames and raw landmark streams on the client side by default.
- Send only confirmed command metadata to the backend.
- Keep user-visible copy in frontend locale catalogs.
- Extend contracts before generating or consuming client code.
