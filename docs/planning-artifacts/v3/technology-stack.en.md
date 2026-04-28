# v3 Technology Stack Decision Record

v3 does not select a new product runtime. It adds verification automation and safe health summaries on top of the existing v2 stack.

## Stack We Keep

| Area | Choice | v3 Policy |
| --- | --- | --- |
| Frontend runtime | React + Vite | Keep the existing browser app and smoke fixture. |
| Frontend verification | Vitest + browser smoke | Run according to fast/full verification modes. |
| Backend runtime | ASGI REST/WebSocket app | Keep the existing API process. |
| Backend verification | pytest + ruff | Verify health contract and runtime state paths. |
| Local dependencies | Docker Compose | Keep database/cache dependency and compose config verification. |
| Handoff automation | PowerShell script | Provide a repeatable verification entrypoint for the Windows local workspace. |

## Not Added In v3

| Area | Status | Reason |
| --- | --- | --- |
| Concrete frame recognizer runtime | blocked | Browser support review and runtime selection approval are required. |
| Skill/resource implementation | blocked | An approved skill domain source is required. |
| New external verification service | deferred | Local reproducibility is the v3 goal. |

## Dependency Rules

- v3 handoff automation combines existing commands and does not add a package.
- Health summaries must not expose secrets, database URLs, or raw recognition data.
- If a new dependency becomes necessary, record the rationale and fallback here first.
