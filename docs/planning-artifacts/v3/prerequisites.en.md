# v3 Prerequisites

## Global Prerequisites

- Check blocked items in v2 readiness first.
- Check recognizer runtime binding against the v2-12 implementation record.
- Do not start skill/resource implementation without an approved skill domain source.
- Documentation and product copy must not include unapproved external provider or service names.
- Do not send or store raw camera frames, raw landmarks, or raw tracking streams in the backend.
- Keep each feature to at most three commits.

## Verification Prerequisites

- `uv`, `pnpm`, and Docker Compose must be available locally.
- Fast mode includes FE typecheck/test, BE lint/test, boundary, compose config, and provider-neutral scan.
- Full mode adds camera smoke and frontend build to fast mode.
- Plan-only mode prints commands and exits.

## Runtime Health Prerequisites

- The health endpoint must not expose credentials, database URLs, or raw recognition data.
- Storage mode is represented only as a safe summary.
- Tests are updated around API contract changes.
- Health does not replace readiness. Detailed verification stays in the handoff script.

## Stop Conditions

- A skill domain source is missing but skill/resource implementation must be marked complete.
- The provider-neutral scan finds an unapproved external name or service name.
- The health response exposes a secret or raw recognition data.
- Verification commands cannot be reproduced locally.
