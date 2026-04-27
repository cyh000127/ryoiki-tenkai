# Frontend Code Convention

## Principles

- The frontend app lives under `FE/app`.
- Use a single-page application structure with route-based screens.
- Follow clean FSD dependency direction: `pages -> widgets -> features -> entities -> shared`.
- Add `platform` for technical foundations and `generated` for generated contract outputs.
- Server state belongs in query adapters. Do not copy server state into global UI stores.
- Route-local interaction state stays local unless it must cross route boundaries.
- API calls go through the generated client boundary or a platform adapter.
- Screen code must not call raw network APIs directly.
- User-facing strings live in the locale catalog.
- Accessibility, keyboard operation, loading, empty, error, and blocked states are first-class requirements.

## Package Layout

```text
FE/
  app/
    src/
      generated/
        api-client/
      platform/
        api/
        auth/
        i18n/
        theme/
        ui/
      pages/
      widgets/
      features/
      entities/
      shared/
```

## Layer Rules

- `pages`: route entries and screen composition.
- `widgets`: screen-level blocks.
- `features`: user actions, workflows, commands, and mutations.
- `entities`: domain read models, mappers, schemas, and formatters.
- `shared`: reusable helpers without domain meaning.
- `platform`: API runtime, auth boundary, locale, UI wrappers, theme, and app shell.
- `generated`: generated artifacts only; do not edit generated outputs manually.

## API Rules

- Keep backend wire contracts under `BE/api/contracts`.
- Keep generated frontend outputs under `FE/app/src/generated/api-client`.
- Map transport models into screen-safe models before rendering.
- Do not redefine backend contracts in page or widget files.

## State Rules

- Use query adapters for server data.
- Use local state for short-lived screen state.
- Use a global UI store only for cross-route workflow state.
- Keep cooldown, confidence, and hand-tracking session state in the feature layer or lower.

## UI Rules

- Build the actual control surface first, not a marketing page.
- Use compact, work-focused layouts for repeated operation.
- Keep buttons, controls, status messages, and focus states accessible.
- Keep layout stable across mobile, tablet, and desktop widths.

## Test Rules

- Unit test mappers, formatters, command reducers, and state machines.
- Component test user-visible states and interaction flows.
- Browser tests cover launch-critical camera permission, fallback, and command dispatch flows when implemented.
