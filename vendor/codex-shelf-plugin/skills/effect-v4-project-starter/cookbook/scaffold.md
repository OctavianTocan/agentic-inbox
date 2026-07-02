# Scaffold Bun + Effect

## Context

Use after `inspect` has identified the target folder, shape, and version pins. Copy the bundled templates and fill placeholders; do not write configs or Effect boilerplate from memory.

## Input

The target project root, repo name, npm scope, core package name, and version pins gathered during `inspect`.

## Steps

### 1. Create Folder And Git Repository

```bash
mkdir -p <project-root>
git -C <project-root> init
git -C <project-root> branch -m main
```

Skip `git init` if the target is already inside a repo (unless the user wants a nested one).

### 2. Copy Root Files

Copy the workspace root from `templates/root/` (rename `gitignore` → `.gitignore`):

```bash
cp templates/root/package.json   <project-root>/package.json
cp templates/root/biome.jsonc    <project-root>/biome.jsonc
cp templates/root/knip.json      <project-root>/knip.json
cp templates/root/vitest.config.ts <project-root>/vitest.config.ts
cp templates/root/vitest.setup.ts  <project-root>/vitest.setup.ts
cp templates/root/Justfile       <project-root>/Justfile
cp templates/root/gitignore      <project-root>/.gitignore
cp templates/root/AGENTS.md      <project-root>/AGENTS.md
cp templates/root/README.md      <project-root>/README.md
cp templates/root/LICENSE        <project-root>/LICENSE
ln -s AGENTS.md                  <project-root>/CLAUDE.md
```

For a **single-package** project, instead of the workspace `package.json`, flatten to one manifest at the root (drop the `workspaces` block, keep the scripts, deps, and `engines`/`packageManager`).

### 3. Fill Placeholders

Substitute every `{{TOKEN}}` from [`../templates/PLACEHOLDERS.md`](../templates/PLACEHOLDERS.md) using the values from `inspect`. After substitution:

```bash
rg '\{\{[A-Z_]+\}\}' <project-root>   # must return nothing
```

Leave Just's `{{package}}` recipe syntax in the `Justfile` untouched — it is not a placeholder.

Because line-wrapping depends on the substituted name lengths, canonicalize formatting once the workspace is assembled and dependencies are installed (do this after step 5):

```bash
cd <project-root> && bun install && bun run format
```

This makes the first `bun run ci` pass on formatting regardless of how long the chosen scope/name is.

### 4. Add Shared Tooling

```bash
mkdir -p <project-root>/packages/tooling
cp -R templates/tooling/typescript-config <project-root>/packages/tooling/typescript-config
```

Package-local `tsconfig.json` files extend `@tooling/typescript-config/bun.json` (services/CLIs) or `base.json` (plain libraries).

### 5. Add The Core Package

Copy the bundled example package and rename it to the project's scope/name:

```bash
mkdir -p <project-root>/packages/<scope>
cp -R templates/example-package <project-root>/packages/<scope>/<package>
```

Fill its placeholders (`@{{SCOPE}}/{{PACKAGE}}`, the `Greeter` service identifier). Keep `Greeter` as the first real module to rename, or run the `module` command to add a domain module and delete `Greeter` once a real one exists. See [module.md](module.md).

### 6. Vendor Effect Source When Needed

If the project uses unstable v4 APIs or should teach future agents Effect v4:

```bash
git -C <project-root> submodule add https://github.com/Effect-TS/effect-smol vendor/effect-smol
```

Source reference only — do not build or lint it. It is already excluded in `biome.jsonc` and `knip.json`.

### 7. Make AGENTS.md Specific

Once real conventions are known, replace any remaining generic wording in `AGENTS.md` with the project's actual structure, scopes, and domain. Do not leave starter boilerplate.

## Done

Report the files created, the chosen shape, the Effect pin, and the first verification command (`bun install && bun run ci`).
