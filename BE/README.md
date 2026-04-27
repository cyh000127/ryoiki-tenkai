# Backend Workspace

Backend packages follow the repository convention in `docs/conventions/backend_convention.md`.

## Packages

- `api`: canonical write owner and HTTP command surface.
- `core`: pure domain rules and value objects shared by backend runtimes.
- `worker`: delayed processing and event handling without direct aggregate writes.

## Checks

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ..\scripts\backend-check.ps1
```
