# Backend Convention Fixer Workflow

Restore compliance with `docs/conventions/backend_convention.md` while keeping behavior stable.

1. Read `../../../docs/conventions/backend_convention.md` before editing.
2. Inspect the changed backend files first.
3. Audit the target code with `./references/checklist.md`.
4. Fix safe structural violations immediately.
5. Pause before changing public API contracts, schema, persistence behavior, or write ownership.
6. Keep the smallest refactor that restores the boundary.
7. Add or update focused tests.
8. Run relevant checks.
9. Report what changed, what remains non-compliant, and what was skipped.
