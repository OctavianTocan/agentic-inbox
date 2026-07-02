# Inspect Existing Context

## Context

Use before creating or refreshing an Effect v4 project. The goal is to learn the live toolchain, nearest trusted repo shape, package versions, local skill conventions, and plugin packaging constraints before writing files.

## Input

The user provides a target directory or project idea, and may name reference projects to emulate.

## Steps

### 1. Confirm Toolchain

Run quick version checks:

```bash
bun --version
node --version
git --version
specify version
```

If `specify version` works but project commands fail before `.specify/` exists, treat that as normal.

### 2. Inspect Reference Projects

Prefer the nearest project the user named. If none is named and `/mnt/HC_Volume_105512717/dev/use-agy` exists, inspect it first:

```bash
rg --files <reference-project> | sed -n '1,240p'
sed -n '1,260p' <reference-project>/package.json
sed -n '1,260p' <reference-project>/AGENTS.md
find <reference-project>/.agents/skills -maxdepth 3 -type f | sort | sed -n '1,240p'
test -f <reference-project>/.gitmodules && sed -n '1,160p' <reference-project>/.gitmodules
```

Extract transferable conventions only. Do not mention the source project name in generated project instructions unless provenance helps future maintenance.

### 3. Verify Effect v4 Source Truth

If the project uses or will use unstable Effect v4 APIs, verify local source:

```bash
test -d <project-root>/vendor/effect-smol && git -C <project-root> submodule status vendor/effect-smol
rg -n "effect/unstable/cli|effect/unstable/process|effect/unstable/rpc|BunRuntime|BunServices|BunRuntime" <reference-project>/vendor/effect-smol <reference-project>/packages -g '!**/.git/**' | sed -n '1,220p'
```

Expected v4 rules:

- CLI: `effect/unstable/cli`
- process: `effect/unstable/process`
- RPC: `effect/unstable/rpc`
- default CLI/process platform for Bun-only projects: `@effect/platform-bun` with `BunRuntime` and `BunServices`
- no `@effect/cli` for new v4 code

### 4. Decide Project Shape

Choose explicitly:

| Shape | Use When |
| --- | --- |
| Single package | one executable or library, no reusable internal packages |
| Bun workspace | multiple packages, source generators, shared tooling, plugin packaging, or future reusable APIs |
| Plugin repo | the deliverable is a Codex/Shelf skill bundle or copied plugin snapshot |

Do not default to a workspace just because it feels serious. Do use one when the project will have a package plus CI/generator/tooling packages.

### 5. Identify Skills To Copy

For an Effect v4 workspace, the usual base set is:

- `domain-effect`
- `domain-package`
- `domain-configs`
- `skill-gen` if generated skills are used
- `workflow-gen` if generated GitHub workflows are used
- `workflow-plan`
- `meta-housekeeping`
- `practice-debug`

Copy only skills that apply. Generated skills should usually be copied from their generated output, while their source fragments stay in code.

### 6. Check Name And Git Collision

Before creating the real folder:

```bash
test -e <project-name> && echo exists || echo available
```

Use kebab-case folder names and scoped package names that mirror the workspace purpose.

## Done

Report the target folder, detected versions, chosen shape, reference conventions, missing tools, and any convention conflicts before editing files.
