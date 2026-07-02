# Knip: Unused Code & Dependency Audit

## Commands

| Task | Command |
|------|---------|
| Full audit | `bun run knip` |
| Dependencies only | `bun run knip --dependencies` |
| Unused files only | `bun run knip --files` |

## Workflow

Two phases: first audit the knip config itself, then run knip and triage findings.

### Phase 1: Audit the knip config for stale entries

The config accumulates dead weight as the workspace evolves. Before running knip, clean it:

1. **Dead workspace/entry paths** — verify each configured `entry`/`project` path still exists. Remove entries for deleted packages.
2. **Stale `ignoreDependencies`** — for each ignored dep, check it's still in the workspace's `package.json`. If the dep was removed, the ignore is dead weight — remove it.
3. **Stale `ignore` patterns** — remove patterns whose files/dirs no longer exist.
4. **Missing rationale** — every `ignoreDependencies`, `ignore`, and `ignoreBinaries` entry must record *why* it's ignored (see [Comments convention](#comments-convention)).

### Phase 2: Run knip and triage findings

1. Run `bun run knip`
2. Group findings by category (unused deps, unused devDeps, unused files, unlisted deps)
3. Classify each via the [decision framework](#decision-framework-remove-vs-ignore)
4. **True positive** — remove the unused dep/file
5. **False positive** — add to the appropriate `ignoreDependencies`, `ignoreBinaries`, or `ignore` list with a documented reason
6. Re-run `bun run knip` until clean
7. Run `bun run ci` to verify nothing broke

## Configuration

The knip config lives at the repo root (`knip.json`, `knip.jsonc`, or `knip.ts`). Key fields:

| Field | Purpose | Example |
|-------|---------|---------|
| `entry` | Files consumed externally (entry points) | `packages/ci/skill-gen/src/index.ts` |
| `project` | All source files knip should analyze | `packages/ci/skill-gen/src/**/*.ts` |
| `ignore` | Files to skip entirely | `vendor/**` |
| `ignoreDependencies` | Deps that ARE used but knip can't trace | — |
| `ignoreBinaries` | CLI tools knip flags as missing | — |

`vendor/effect-smol` is vendored upstream source and must always be ignored — never analyzed or pruned.

## Entry Points

| Package | Entry |
|---------|-------|
| `@ci/skill-gen` | `packages/ci/skill-gen/src/index.ts` (CLI entrypoint) |
| `@tooling/typescript-config` | none — ships only JSON tsconfig bases (`base.json`, `bun.json`), no TS entry |

When a new package is added, set its `entry` to the externally-consumed file(s) and `project` to cover all its source, then re-run `bun run knip` and triage.

## Decision Framework: Remove vs Ignore

When knip flags a dependency as unused, walk through this in order:

1. **Is it imported in source files?** → the entry/project pattern is wrong. Fix the config, don't remove the dep.
2. **Is it referenced in a config file?** (tsconfig, vitest, biome, knip) → add to `ignoreDependencies` with a comment naming the config file.
3. **Is it a peer dependency?** Check with `bun pm ls <dep>`. → add to `ignoreDependencies` with a comment naming the parent package.
4. **None of the above?** → genuinely unused. Remove from `package.json`, then run `bun install` + `bun run ci`.

**Rule:** before removing any dependency, confirm `bun run ci` still passes and the dep is not referenced in any config or required transitively by another dep in the same workspace.

## Comments Convention

Every `ignoreDependencies`, `ignore`, and `ignoreBinaries` entry must explain *why* it's ignored, so future auditors don't remove it and re-introduce the problem. Plain `knip.json` has no comment syntax, so use `knip.jsonc` or `knip.ts` when entries need rationale:

```ts
// knip.ts
export default {
  ignoreDependencies: [
    // used only in vitest.config.ts, not imported from source
    'some-vitest-plugin',
  ],
}
```
