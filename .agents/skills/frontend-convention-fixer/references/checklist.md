# Frontend Convention Checklist

- Dependency direction stays `pages -> widgets -> features -> entities -> shared`.
- `platform` contains technical foundations only.
- `generated` contains generated contract outputs only.
- Route entries stay under `pages`.
- Screen-level blocks stay under `widgets`.
- User workflows, commands, and mutations stay under `features`.
- Domain read models and mappers stay under `entities`.
- Raw network calls do not appear in page or widget code.
- User-facing strings come from the locale catalog.
- Loading, empty, error, blocked, and fallback states are visible.
- Accessibility and responsive behavior are covered for touched surfaces.
