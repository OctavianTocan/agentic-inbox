# packages/api-core — AGENTS.md

Delta for the shared HttpApi contract package. Root / brain `AGENTS.md` may be local-only; this file is committed.

## Vendored repositories

Effect source lives at `repos/effect-smol` (git subtree). See [`repos/README.md`](../../repos/README.md).

- When defining endpoints, schemas, or errors, prefer patterns from `repos/effect-smol` and [`docs/agent-patterns/`](../../docs/agent-patterns/) over guessing.
- Read [`repos/effect-smol/LLMS.md`](../../repos/effect-smol/LLMS.md) first, then `packages/effect/HTTPAPI.md` / Schema docs as needed.
- Index: [`docs/agent-patterns/README.md`](../../docs/agent-patterns/README.md) — especially `module-layout`, `effect-httpapi`, `effect-schema`.
- **Do not import** from `repos/` into this package — depend on catalog `effect` only.
- Wire schemas stay here; handlers stay in `apps/api`.
