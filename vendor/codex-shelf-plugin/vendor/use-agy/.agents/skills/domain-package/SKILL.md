---
name: domain-package
description: "Use when creating new packages, migrating existing ones, or reviewing package structure (package.json, tsconfig.json, exports, biome filename overrides, module layout)."
---

# Package Conventions

Patterns for packages in this Bun workspace. All packages are consumed via the `workspace:*` protocol and resolved as TypeScript by Bun — no build step.

For type-safety and import rules (no casts, no enums, no barrels, no extensions), see `AGENTS.md` > Conventions.

## Directory Structure

- **Code lives in `src/`.** All packages use a `src/` directory for source code.
- Effect packages use PascalCase domain dirs (`src/Modules/`, `src/Domain/`).
- Tests in `test/` at package level, not co-located with source.
- File pattern: `test/**/*.test.ts`.

## Module Structure

Effect packages organize code into modules under `src/Modules/`. Each module follows a standard structure with `Domain.ts`, `Service.ts`, `Errors.ts`, and optional `Config.ts`, `Constants.ts`, `Helpers.ts`, `Toolbox.ts`, `Tools/`, `Helpers/`, and nested `Modules/` (sub-modules).

See [Module Structure Reference](references/module-structure.md) for the full pattern, naming rules, and examples.

## package.json

Required fields:

```json
{
  "name": "@scope/package-name",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
```

Name uses scoped aliases that mirror the workspace layout — e.g. `@ci/*` for CI tooling and `@tooling/*` for shared build/config packages. Pick the scope that matches the package's directory under `packages/`.

- **No `main` or `types` fields** — use `exports` instead.
- `type: "module"` for all packages.
- Dependencies: `workspace:*` for sibling packages, `catalog:` for shared versions (the catalog lives in the root `package.json` under `workspaces.catalog`).
- DevDependencies: always include `@tooling/typescript-config` and `typescript`.
- Never use `"latest"` for versions — pin or use `"catalog:"` (e.g. `"@types/bun": "catalog:"`).

### Export Patterns

**Single entry point** — small packages with few exports:
```json
"exports": { ".": "./src/index.ts" }
```

**Wildcard** — packages with a deep directory structure that expose many files:
```json
"exports": { ".": "./src/index.ts", "./*": "./src/*" }
```

**Named** — packages with a few distinct entry points:
```json
"exports": {
  ".": "./src/index.ts",
  "./server": "./src/Server.ts",
  "./client": "./src/Client.ts"
}
```

### Scripts

```json
"scripts": {
  "typecheck": "tsc --noEmit",
  "test": "vitest run --passWithNoTests"
}
```

`base.json` sets `declaration: false`, so `tsc --noEmit` only typechecks — no extra flags needed. Add package-specific run scripts (CLI entry points, generators) alongside these as needed; see the Effect-library and Bun-service templates in [Configs Reference](references/configs.md).

## Adding External Dependencies

When adding a new npm package to any package.json, always pin to the **current latest version**. Don't copy a version string from a tutorial, README, or internal notes without verifying — those versions go stale and may be missing icons, types, or exports that the latest ships.

Before editing `package.json`, resolve the latest version from the registry:

```bash
bunx npm view <package> version                           # public packages
curl -s https://registry.npmjs.org/<package> | jq -r '."dist-tags".latest'  # private/scoped
```

Then add the dependency and run `bun install`. If the package is used by more than one workspace package, promote it to the root `catalog` and reference it as `"<pkg>": "catalog:"` downstream.

### Effect v4 dependencies

Effect v4 (the `effect-smol` line) is consumed from the root catalog. Add `"effect": "catalog:"` plus the platform package the runtime actually uses. In this repo, Bun-only packages use `"@effect/platform-bun": "catalog:"` with `BunRuntime` / `BunServices`. Import CLI, process, and RPC APIs from `effect/unstable/*`, not `@effect/cli` / `@effect/rpc`. The pinned source of truth is the `vendor/effect-smol` submodule; verify API signatures against it (see `domain-effect`).

## tsconfig.json

```json
{
  "extends": "@tooling/typescript-config/base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@test/*": ["./test/*"],
      "@scope/package-name/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Always extend a base from `@tooling/typescript-config`. Only two bases exist:

| Package type | Base |
|---|---|
| Bun-runtime package or CLI (needs `types: ["bun"]`, `noEmit`) | `bun.json` |
| Plain library (no Bun globals) | `base.json` |

- `include`: `["src/**/*.ts"]` (add `"test/**/*.ts"` when the package typechecks its tests).
- Don't re-declare `"types": ["bun"]` if you've extended `bun.json` — the base already sets it.
- `@/*` and `@test/*` come from `base.json` via `${configDir}` and resolve automatically when no `paths` block is declared. If you declare a `paths` block, redeclare `@/*` and `@test/*` too — TypeScript replaces `paths` rather than merging it.
- Scoped cross-package aliases (`@ci/*`, `@tooling/*`, …) resolve via workspace symlinks in `node_modules` and need no `paths` entries.
- Self-reference paths only if using wildcard exports: `"@scope/package-name/*": ["./src/*"]`.

For the full tsconfig inheritance chain and canonical templates (Effect library, Bun service/CLI), see [Configs Reference](references/configs.md).

## Biome Filename Override

Effect packages use PascalCase filenames. If the repo configures a root `biome.jsonc` with a filename-case override, check the current PascalCase override block before adding or reviewing a package; do not copy a stale list from this skill.

When adding a new Effect package, add its glob pattern to that override. Lint-rule and formatting changes follow `AGENTS.md` > Conventions, not this skill.

## Common Pitfalls

- Using `"latest"` for `@types/bun` — use `"catalog:"` like all other shared deps.
- Hardcoding versions instead of `catalog:` for deps in the root catalog.
- Forgetting `src/` in path aliases or exports after creating a package.
- Adding `"types": ["bun"]` to a package that already extends `bun.json` — redundant (and adding `["node"]` by mistake breaks Bun globals).
- Extending `base.json` for a Bun-runtime package: you'll miss `types: ["bun"]` and `noEmit`. Extend `bun.json` instead.

## New Package Checklist

- [ ] Code in `src/` directory
- [ ] `package.json` has `exports` field pointing to `src/`, no `main`/`types`
- [ ] `tsconfig.json` extends `base.json` or `bun.json`, includes `src/**/*.ts`
- [ ] Added to consuming packages' dependencies
- [ ] Biome filename override added (if PascalCase Effect package and a root `biome.jsonc` defines one)
- [ ] Package checks pass (`bun run typecheck`, `bun run test`)
