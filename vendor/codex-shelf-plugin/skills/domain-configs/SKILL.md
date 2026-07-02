---
name: domain-configs
description: "Use when you need to find which skill owns a specific config file (package.json, tsconfig.json, biome.jsonc, vitest, knip, GitHub workflow YAML). Routes to domain-package, meta-housekeeping, workflow-gen, and AGENTS.md conventions."
---

# Configuration Files Router

Each config file type is owned by one skill. Use this matrix to find the canonical guidance, then read that skill.

| Config file | Owner |
|---|---|
| `package.json` (any package) | `domain-package` |
| `tsconfig.json` (any package) | `domain-package` (templates in [configs.md](../domain-package/references/configs.md)) |
| `biome.jsonc` filename overrides | `domain-package` (when adding a new Effect package) |
| `biome.jsonc` lint/format rules | `AGENTS.md` > Conventions |
| `vitest.config.ts` | `domain-package` (template in [configs.md](../domain-package/references/configs.md)) |
| `knip` config | `meta-housekeeping` ([knip.md](../meta-housekeeping/references/knip.md)) |
| `.github/workflows/*.yml` | `workflow-gen` (generated; edit source `//<workflow-gen>` fragments instead) |
| `.github/actions/*/action.yml` | `meta-housekeeping` ([ci.md](../meta-housekeeping/references/ci.md)) |
| `required-workflows.json` | `workflow-gen` (generated branch-protection check list) |

## Inheritance summary

- **tsconfig**: every package extends one of `@tooling/typescript-config/{base,bun}.json`. Full chain in [domain-package/references/configs.md](../domain-package/references/configs.md).
- **vitest**: use a package-local `defineConfig`. Tests live in the package's `test/` directory (`test/**/*.test.ts`).
- **biome**: a single root `biome.jsonc` with pattern-based overrides (when present).
- **workflow-gen**: generated workflow YAML is excluded from Biome and checked with `bun run workflow-gen:check`.

For type-safety and import rules cited by configs, see `AGENTS.md` > Conventions. For canonical package templates, see `domain-package`.
