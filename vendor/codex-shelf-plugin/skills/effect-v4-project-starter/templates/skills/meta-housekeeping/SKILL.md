---
name: meta-housekeeping
description: "Use when enforcing repo conventions, auditing skills or commands, cleaning up patterns, updating dependencies, auditing unused code, or running scheduled maintenance."
---

# Housekeeping

Codebase maintenance for this workspace, organized into **code quality** (per-file convention audits) and **structural tasks** (dependency audits, config maintenance, skill/command consistency).

Source lives under `packages/` (workspace packages — application code, CLI tooling, shared `@tooling/*` config bases). Everything else is agent material — `.agents/skills/`, `.agents/commands/`, `plans/` — plus any generated GitHub workflows and `vendor/effect-smol`, a read-only submodule that is never audited or built.

## Code Quality

Audit changed source files against the repo conventions. Use git to scope the work: `git diff --name-only` for uncommitted changes, or `git diff --name-only <ref>` for a range. There is no per-file audit-state tracking — re-audit whatever git reports as changed.

### Audit Categories

Every file is checked for all 4 categories in a single pass:

1. **Code style** — biome compliance, naming conventions, file organization
2. **Code quality** — complexity, function structure, error handling, early returns
3. **Documentation** — JSDoc per `AGENTS.md` > Conventions
4. **Type safety** — no casts, derived types, no enums (`AGENTS.md` > Conventions)

Rules come from the universal checklist in [code-quality-checklist.md](references/code-quality-checklist.md) plus the domain skill for the file's area.

### Skill Routing

Based on file path, load the appropriate domain skill alongside the universal checklist. Match top-to-bottom; first match wins.

| Path Pattern | Domain Skill |
|---|---|
| `packages/ci/{skill-gen,workflow-gen}/**` | `domain-cli` + `domain-effect` |
| `packages/ci/actions/**` | `domain-cli` |
| `packages/*/package.json`, new packages | `domain-package` |
| `packages/tooling/typescript-config/**`, root configs (`tsconfig*`, biome, knip) | `domain-configs` |
| `.agents/skills/**`, `.agents/commands/**`, `AGENTS.md` | Skill-authoring conventions (`AGENTS.md`) |
| Everything else | Universal checklist only |

`vendor/effect-smol/**` is never audited.

### Code Quality Workflow

1. **Discover** — list changed files with git (`git diff --name-only`), excluding `vendor/`
2. **Group** — sort files by domain skill per the routing table above (one group per matched skill, plus a general bucket for unmatched files)
3. **Audit + Fix** — spawn parallel sub-agents following `AGENTS.md` > Subagents. Each agent:
   - Loads the universal checklist + the group's domain skill
   - Works through the domain checklist (e.g. [effect.md](references/effect.md)) **rule by rule**, P1 first
   - Also enforces all rules in [code-quality-checklist.md](references/code-quality-checklist.md)
   - Reports findings with rule IDs (e.g. `E-P1-3`, `Q-P1-2`)
   - Fixes violations directly
   - No two agents edit the same file
4. **Verify** — run `bun run ci`
5. **Commit** — commit fixes

## Structural Tasks

Cross-cutting operations that don't track per-file state.

### Area Runs

Each area defines its own scope, conventions to enforce, and audit approach.

| Area | Reference | Scope |
|------|-----------|-------|
| skills | [references/skills.md](references/skills.md) | `.agents/`, `AGENTS.md` — skill/command consistency |
| ci | [references/ci.md](references/ci.md) | `packages/ci/{skill-gen,workflow-gen,actions}`, generated `.agents/skills/*/SKILL.md`, generated `.github/workflows/*.yml`, `required-workflows.json` |
| tooling | [references/tooling.md](references/tooling.md) | `packages/tooling/typescript-config`, root tool configs |
| codebase | [references/codebase.md](references/codebase.md) | Cross-area patterns, root configs, `packages/**` |

### Task Runs

| Task | Reference |
|------|-----------|
| Update npm packages, deduplicate to the catalog | [references/npm-packages.md](references/npm-packages.md) |
| Run knip, audit unused deps/files, fix knip config | [references/knip.md](references/knip.md) |

### Structural Workflow

Area runs follow this workflow:

1. **Discover** — find files/modules in the area's scope (see area reference)
2. **Audit** — spawn parallel sub-agents following `AGENTS.md` > Subagents; each agent loads the relevant skill and returns structured violations with `file:line`, current code, and fix
3. **Present** — aggregate findings. Confirm with the user which categories to fix when confirmation is needed
4. **Fix** — spawn code-writing sub-agents for disjoint file sets. No two agents edit the same file
5. **Verify** — run `bun run ci`

Task runs follow the workflow defined in their own reference file.

## Dispatch

Trigger phrases for invoking a housekeeping pass:

| Trigger | Action |
|---|---|
| `housekeeping` or `housekeeping code` | Code quality pass over changed files |
| `housekeeping code <glob>` | Scoped code quality pass (e.g. `housekeeping code packages/ci/skill-gen/**`) |
| `housekeeping skills` / `ci` / `tooling` / `codebase` | Structural area run |
| `housekeeping npm` / `knip` | Structural task run |
| `housekeeping all` | Code quality first, then structural tasks (order below) |

### Full Housekeeping Order

1. Code quality (changed files)
2. Skills
3. CI
4. Tooling
5. Codebase
6. npm packages
7. Knip audit

## Quick Reference

Run `bun run ci` (biome + `tsc --noEmit` + `vitest run` + knip + generated artifact drift checks) after any housekeeping pass. Verify generated skill files with `bun run skill-gen:check` and generated workflows with `bun run workflow-gen:check`.
