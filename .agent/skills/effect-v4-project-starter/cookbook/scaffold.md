# Scaffold Bun + Effect

## Context

Use after inspection has identified the target folder, project shape, and local conventions. Create the smallest project that can pass a real verification gate.

## Input

The target project root, package name, and chosen shape: single package, workspace, or plugin repo.

## Steps

### 1. Create Folder And Git Repository

Create the project directory, initialize git, and set the initial branch to `main`:

```bash
mkdir -p <project-root>
git -C <project-root> init
git -C <project-root> branch -m main
```

Do not initialize git if the target is already inside an existing repo unless the user explicitly wants a nested repo.

### 2. Choose Manifest Shape

For a single package, create one `package.json` at the root.

For a workspace, create a root manifest with a catalog:

```json
{
  "name": "<repo-name>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "workspaces": {
    "packages": ["packages/**/*"],
    "catalog": {
      "@effect/platform-bun": "<effect-v4-beta>",
      "@effect/vitest": "<effect-v4-beta>",
      "@types/bun": "^<installed-compatible>",
      "effect": "<effect-v4-beta>",
      "typescript": "^<current>",
      "vitest": "^<current>"
    }
  },
  "scripts": {
    "check": "biome check .",
    "format": "biome format --write .",
    "typecheck": "bun run --filter '*' typecheck",
    "test": "vitest run",
    "knip": "knip",
    "ci": "biome check . && bun run typecheck && vitest run && knip"
  },
  "engines": {
    "bun": ">=<installed-major-minor>"
  },
  "packageManager": "bun@<installed-version>"
}
```

Pin exact Effect v4 beta versions. Do not commit `"latest"`.

### 3. Add Shared Tooling For Workspaces

For a workspace, add:

```text
packages/
  tooling/typescript-config/
    package.json
    base.json
    bun.json
```

Use `base.json` for plain libraries and `bun.json` for Bun CLIs/services. Package-local `tsconfig.json` files extend one of these.

### 4. Add The First Package

Create source under `packages/<name>/src/` for workspace projects or `src/` for single-package projects:

```text
src/
  index.ts
  Main.ts              only for executable packages
  Cli.ts               only for CLI packages
  Modules/
    <Domain>/
      Domain.ts
      Errors.ts
      Service.ts
test/
  <Domain>/
    Service.test.ts
```

Package manifest defaults:

```json
{
  "name": "@<scope>/<package>",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@effect/platform-bun": "catalog:",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@tooling/typescript-config": "workspace:*",
    "@types/bun": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

Add a `bin` field only when the package is actually executable.

### 5. Add Effect Runtime Boundary

For CLI/process packages, use Bun execution with Effect v4's Bun platform:

```ts
#!/usr/bin/env bun
import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Effect } from "effect"
import { Command } from "effect/unstable/cli"

const program = Command.run(/* root command */, {
  name: "<bin-name>",
  version: "0.0.1"
})

program(process.argv).pipe(
  Effect.provide(BunServices.layer),
  BunRuntime.runMain
)
```

Validate signatures against `vendor/effect-smol` before expanding this example.

### 6. Vendor Effect Source When Needed

If the project uses unstable v4 APIs or is meant to teach future agents Effect v4:

```bash
git -C <project-root> submodule add https://github.com/Effect-TS/effect-smol vendor/effect-smol
```

The submodule is source reference only. Do not build or lint it as project source.

### 7. Add Root Operating Files

Create:

- `AGENTS.md`
- `README.md`
- `biome.jsonc`
- `knip.json`
- `vitest.config.ts`
- `vitest.setup.ts`
- `.gitignore`

Make `AGENTS.md` specific to the project. Do not leave generic starter text once real conventions are known.

## Done

Report the files created, chosen shape, Effect versions, and the first verification command.
