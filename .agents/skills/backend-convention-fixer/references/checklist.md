# Backend Convention Checklist

- Routes only parse input, call services, and return response DTOs.
- Services own validation, use-case flow, transaction boundaries, and state changes.
- Repositories only access persistence models and injected sessions.
- Request DTOs and response DTOs are separate.
- API payloads use `camelCase`; Python code uses `snake_case`.
- ORM models are not returned directly from routes.
- `BE/api` remains the canonical write owner.
- Worker code uses command or event boundaries instead of direct aggregate writes.
- Domain exceptions are explicit and handled centrally.
- Service, API, repository, and contract tests cover touched behavior.
