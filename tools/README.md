# tools/

Codegen and CI workflow fragments for this monorepo. Edit **sources and fragments**; generated outputs are deterministic and checked in CI.

| Artifact | Generate | Check |
|----------|----------|-------|
| Skills | `bun run skills:generate` | `bun run skills:check` |
| GitHub workflows | `bun run workflows:generate` | `bun run workflows:check` |
| Structure blocks | `bun run structure:generate` | `bun run structure:check` |
| OpenAPI | `bun run openapi:generate` | `bun run openapi:check` |
| All (local) | `bun run generate` | `bun run check:generated` |
| CI portable | — | `bun run check:generated:portable` |

**Do not hand-edit:** generated `SKILL.md` files, generated `.github/workflows/*.yml`, marked structure blocks, `packages/api-core/openapi.json`, or root `required-workflows.json`.

**CI note:** `.agent/*` is local-only. GitHub CI must run `check:generated:portable` (workflows + openapi), not `skills:check` / `structure:check`.
