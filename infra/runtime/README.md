# Runtime Skeleton

The root compose file is a local topology baseline. It is not a deployment promotion workflow.

Runtime units:

- `web`: browser app container.
- `api`: backend API container.
- `db`: relational database container.
- `cache`: optional cooldown and event coordination container.

Keep production rollout, credential handling, and remote host automation outside this baseline until explicit operational requirements exist.
