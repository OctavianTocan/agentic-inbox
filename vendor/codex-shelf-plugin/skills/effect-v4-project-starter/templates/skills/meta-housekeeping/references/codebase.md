# Codebase Housekeeping

Find and resolve cross-area pattern inconsistencies and `AGENTS.md` convention violations.

**Also enforce all rules in [code-quality-checklist.md](code-quality-checklist.md)** — universal code quality rules that apply to every domain.

## Scope

Cross-area consistency across the whole repo, focusing on what dedicated areas (effect, cli, ci) don't already cover:

- `packages/ci/skill-gen` and `packages/tooling/typescript-config`
- Root configs (`package.json`, `tsconfig*.json`, biome config, knip config) — see `domain-configs` for the config-ownership split
- `.agents/skills/`, `.agents/commands/` — cross-file consistency (deep skill/command audits live in [skills.md](skills.md))
- Cross-area pattern consistency across all scopes

`vendor/effect-smol` is pinned upstream source and is never audited.

## Source of Truth

`AGENTS.md` is the sole canonical reference.

## Audit Checklist

Rule IDs use prefix `C` (codebase): `C-P1-1`, `C-P2-3`, etc. Work through **P1 first**, then P2, then P3.

### P1 — Must Fix

| # | Rule | Violation | Correct |
|---|------|-----------|---------|
| 1 | No type casts | `as any`, `as unknown as T`, `as Type`, `expr!` | Fix the underlying type; use type guards or `Schema.decode` |
| 2 | No enums | `enum Status { Active, Inactive }` | `type Status = 'active' \| 'inactive'` or a const object |
| 3 | Path alias imports | `import { X } from '../../foo/bar'` | Use the package's scoped alias (`@/*` for local imports within a package) |
| 4 | No barrel/index imports | `import { X } from './foo'` (a re-export barrel) | Import directly from the source module, unless a package documents a barrel as its public API |
| 5 | No file extensions in imports | `import { X } from './foo.ts'`, `from './bar.js'` | `import { X } from './foo'` |

### P2 — Should Fix

| # | Rule | Violation | Correct |
|---|------|-----------|---------|
| 1 | Type derivation from source | `type Foo = { id: string; ... }` (manually rewritten) | `type Foo = typeof table.$inferSelect` or `Schema.Type<typeof FooSchema>` |
| 2 | No duplicated types | Same type defined in multiple packages | Export from the source module, import elsewhere |
| 3 | Named exports everywhere | `export default` in a non-entrypoint file | `export function MyThing()` or `export const MyThing = ...` |
| 4 | Test location | `src/Foo/Service.test.ts` (co-located) | `test/Foo/Service.test.ts` — package-level `test/` directory |
| 5 | Test file pattern | `test/foo.spec.ts`, `test/Foo.tests.ts` | `test/**/*.test.ts` |
| 6 | PascalCase backend modules | `packages/ci/skill-gen/src/modules/foo/service.ts` | `src/Modules/Foo/Service.ts` |

### P3 — Recommended

| # | Rule | Violation | Correct |
|---|------|-----------|---------|
| 1 | Config extends tooling base | `tsconfig.json` without `extends: "@tooling/typescript-config/..."` | Extend a `@tooling/typescript-config` base (`base.json` or `bun.json`) |
| 2 | Package.json uses catalog | Shared dependency pinned inline instead of `"catalog:"` | Use the `"catalog:"` protocol for shared deps |
| 3 | No section separator comments | `// ─── Section ───`, `// --- Utils ---` | Remove; use blank lines |
| 4 | No barrel/index.ts files | `index.ts` with only re-exports | Import directly from source modules |

## Discovery

```bash
# Cross-area pattern scan (exclude vendored source)
grep -rl "as any" --include="*.ts" packages | grep -v vendor
grep -rl "as unknown" --include="*.ts" packages | grep -v vendor
grep -rl "enum " --include="*.ts" packages | grep -v vendor
```

## Audit Approach

Spawn parallel sub-agents following `AGENTS.md` > Subagents:

- **Agent 1**: `packages/ci/skill-gen` and `packages/tooling/typescript-config` — convention compliance per the checklist
- **Agent 2**: Root configs + cross-area grep scans — run the discovery greps above and flag violations repo-wide

Each agent:

1. Works through this checklist **rule by rule**, P1 first, then P2, then P3
2. Also enforces all rules in [code-quality-checklist.md](code-quality-checklist.md)
3. Returns violations referencing rule IDs:

```
Area: {path}
- [C-P1-3] Path alias import — skill-gen/src/scan.ts:5
  Current: `import { X } from '../lib/env'`
  Should be: `import { X } from '@/lib/env'`
- [Q-P1-2] Enum usage — skill-gen/src/parse.ts:12
  Current: `enum Kind { A, B }`
  Should be: `type Kind = 'a' | 'b'`
```

Then cross-reference findings to identify inconsistencies across packages.

## Cross-Cutting References

- [knip.md](knip.md) — knip config audit
- [npm-packages.md](npm-packages.md) — catalog deduplication
