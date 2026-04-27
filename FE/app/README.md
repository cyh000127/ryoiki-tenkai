# Frontend App

This app follows the frontend convention in `docs/conventions/frontend_convention.md`.

## Commands

```powershell
pnpm --dir FE/app install
pnpm --dir FE/app typecheck
pnpm --dir FE/app test
pnpm --dir FE/app build
```

## Boundaries

- `pages`: route entries.
- `widgets`: screen-level composition.
- `features`: gesture session workflows and command flows.
- `entities`: gesture read models and mapping helpers.
- `platform`: API, UI, i18n, theme, and app shell foundations.
- `generated`: generated API client artifacts.
