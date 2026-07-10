# tools — AGENTS.md

## Scope

Codegen and CI workflow fragments. Outputs are deterministic artifacts — edit sources/fragments, not generated targets.

## Commands

| Tool | Generate | Check |
|------|----------|-------|
| Skills | `bun run skills:generate` | `bun run skills:check` |
| Workflows | `bun run workflows:generate` | `bun run workflows:check` |
| Structure blocks | `bun run structure:generate` | `bun run structure:check` |
| OpenAPI | `bun run openapi:generate` | `bun run openapi:check` |
| All generated | `bun run generate` | `bun run check:generated` |

## Local rules

- Do not hand-edit generated outputs: `.agent/skills/*/SKILL.md` (skill-gen), `.github/workflows/` files with `AUTO-GENERATED` headers (gen-github-workflow), marked blocks in `.agent/AGENTS.md` / `README.md` (project-structure-gen), `packages/api-core/openapi.json` (openapi-gen), root `required-workflows.json` (workflow-fragments sync).
- These tools are plain-copied into the monorepo (not git submodules).
- `bun run ci` uses `check:generated:portable` (workflows + openapi only). Full `check:generated` (skills + structure) is local-only because `.agent/*` is gitignored.

## References

- Workflow fragments: `tools/workflow-fragments/`
- Structure manifest: `tools/project-structure-gen/project-structure.json`
