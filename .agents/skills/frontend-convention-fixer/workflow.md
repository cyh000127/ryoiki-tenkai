# Frontend Convention Fixer Workflow

Restore compliance with `docs/conventions/frontend_convention.md` while keeping behavior stable.

1. Read `../../../docs/conventions/frontend_convention.md` before editing.
2. Inspect the changed frontend files first.
3. Audit the target code with `./references/checklist.md`.
4. Fix safe structural violations immediately.
5. Pause before changing route contracts, API contracts, locale semantics, or launch-critical workflows.
6. Preserve clean FSD dependency direction.
7. Keep generated outputs and platform wrappers as the technical boundaries.
8. Add or update focused tests.
9. Run relevant checks.
10. Report what changed, what remains non-compliant, and what was skipped.
