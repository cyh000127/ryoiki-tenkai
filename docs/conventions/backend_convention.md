# Backend Code Convention

## Principles

- Organize backend code by domain and use case.
- Keep the default flow as `Router -> Service -> Repository`.
- Router code handles HTTP input/output, dependency wiring, and response DTOs only.
- Service code owns business flow, validation, transaction boundaries, and command decisions.
- Repository code owns persistence access only.
- Request DTOs and response DTOs must be separate from ORM models.
- API payloads use `camelCase`; Python code uses `snake_case`.
- `BE/api` is the canonical write owner for aggregate state.
- `BE/worker` may process jobs or events, but it must not bypass API-owned write rules.
- State changes use explicit methods instead of generic setters.
- Error handling is centralized.

## Package Layout

```text
BE/
  api/
    src/
      gesture_api/
        api/
          routes/
          schemas/
          exception_handlers.py
        services/
        repositories/
        models/
        domain/
        db/
          unit_of_work.py
  core/
    src/
      gesture_core/
  worker/
    src/
      gesture_worker/
```

## Layer Rules

- `api/routes`: route definitions and dependency calls only.
- `api/schemas`: request and response DTOs.
- `services`: use-case services with verb-named methods.
- `repositories`: ORM persistence and read repositories.
- `models`: persistence models only.
- `domain`: enums, domain rules, value objects, and domain exceptions.
- `db`: session, base, and transaction helpers.

## DTO Rules

- Do not pass raw dictionaries through service boundaries when a typed model is appropriate.
- Do not expose ORM models directly from routes.
- Request DTO names should describe the command, such as `CreateGestureCommandRequest`.
- Response DTO names should describe the returned shape, such as `GestureCommandResponse`.

## Transaction Rules

- Write use cases keep transaction ownership in Service.
- `commit`, `rollback`, and `refresh` go through `UnitOfWork`.
- Repository classes do not call transaction methods.
- Job processing and delayed work must be idempotent.

## Test Rules

- API tests verify request/response shape and status codes.
- Service tests verify use-case flow, validation, duplicate handling, and rejection paths.
- Repository tests verify persistence behavior and query shape.
- Contract tests verify generated or rendered wire artifacts.
