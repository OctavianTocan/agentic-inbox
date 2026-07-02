---
name: effect-v4-project-starter
description: Use when starting, scaffolding, refreshing, or reviewing a Bun TypeScript project on Effect v4, especially repo-local agent tooling, generated skills/workflows, plugin bundles, or a project that should vendor effect-smol as source reference.
metadata:
  tavi_toolbelt_original_frontmatter:
    stages:
    - plan
    - build
    - test
    suggests:
    - vitest
    benefits-from:
    - context7
    - hook-development
    - testing-strategist
---

# Effect V4 Project Starter

Start a Bun + TypeScript project on Effect v4 with strict package conventions, local agent skills, generated agent artifacts, and a verification gate that future agents can trust.

## Variables

- **DEFAULT_RUNTIME**: `bun`
- **DEFAULT_EFFECT_VERSION**: current Effect v4 beta, verified from registry or nearest trusted repo before editing `package.json`
- **DEFAULT_PROJECT_ROOT**: current working directory unless the user names a folder
- **REFERENCE_PROJECT**: prefer `/mnt/HC_Volume_105512717/dev/use-agy` when available
- **EFFECT_SOURCE_REFERENCE**: `vendor/effect-smol` git submodule
- **SPECIFY_CODEX_FLAGS**: `--integration codex --integration-options="--skills"`
- **SPECIFY_CLAUDE_FLAGS**: `--integration claude`

## How It Works

Inspect the requested target and nearby reference repos first. Then choose a single-package or workspace shape explicitly, pin the Effect v4 catalog, add project-local operating skills, decide whether generated skills/workflows are useful, and keep the first working slice small enough to prove with `bun run ci`.

## Commands

| Command | Purpose |
| --- | --- |
| `/effect-v4-project-starter inspect` | Discover local conventions, tool versions, Effect pins, and reference projects before writing files |
| `/effect-v4-project-starter scaffold` | Create the Bun/TypeScript/Effect project or workspace files |
| `/effect-v4-project-starter speckit` | Initialize SpecKit when the project needs Codex/Claude planning workflows |
| `/effect-v4-project-starter skills` | Copy/adapt local agent skills and define project skill ownership |
| `/effect-v4-project-starter generators` | Add or reuse source-driven skill/workflow generation |
| `/effect-v4-project-starter plugin` | Build a self-contained plugin bundle from copied snapshots and optional submodule sources |
| `/effect-v4-project-starter verify` | Install dependencies and run the full gate |

## Cookbook

Read the relevant cookbook before executing a command.

| Command | Cookbook | Use When |
| --- | --- | --- |
| inspect | [cookbook/inspect.md](cookbook/inspect.md) | Before any scaffold, migration, or plugin refresh |
| scaffold | [cookbook/scaffold.md](cookbook/scaffold.md) | Creating or reshaping the project files |
| speckit | [cookbook/speckit.md](cookbook/speckit.md) | Adding SpecKit integrations |
| skills | [cookbook/skills.md](cookbook/skills.md) | Importing/adapting local agent skills |
| generators | [cookbook/generators.md](cookbook/generators.md) | Adding `skill-gen` / `workflow-gen` style source generation |
| plugin | [cookbook/plugin.md](cookbook/plugin.md) | Creating a Shelf/Codex plugin bundle or copied skill snapshot |
| verify | [cookbook/verify.md](cookbook/verify.md) | Proving the scaffold is healthy |

## Core Decisions

- Prefer a single package for tiny tools; use a Bun workspace when there will be reusable packages, CI/generator packages, or plugin packaging artifacts.
- Use Bun for installation, scripts, bins, and local linking. Do not add npm/pnpm/yarn paths unless the user explicitly requests them.
- Keep Effect v4 versions in the root workspace catalog when using a workspace. Never use `"latest"` in committed manifests.
- Use `effect`, `effect/<Module>`, and `effect/unstable/*` imports. In v4, CLI/process/RPC live at `effect/unstable/cli`, `effect/unstable/process`, and `effect/unstable/rpc`.
- Do not add `@effect/cli` for v4 projects. The v4 migration map points `@effect/cli` concepts to `effect/unstable/cli`.
- Bun-only projects use `@effect/platform-bun` with `BunRuntime` and `BunServices`. `BunServices.layer` provides child process, filesystem, path, stdio, terminal, and crypto services.
- Vendor `effect-smol` as a git submodule when the project will depend on unstable v4 APIs or teach future agents Effect v4 source truth.
- Keep generated artifacts source-driven. Use `//<skill-gen>` for generated skills and `//<workflow-gen>` for generated workflows when docs/workflows must stay close to code.
- Treat plugin install bundles as copied snapshots. Submodules are good upstream sources, but Codex plugin installation must be verified before relying on symlinks or submodule paths at runtime.
- Keep source packages under `packages/`; only copy package snapshots into skill folders when packaging a plugin demands a self-contained artifact.

## Reference Pattern

`use-agy` is the reference shape for a modern repo-local agent tooling project:

```text
apps/
  api/                       runtime API/RPC service when needed
bin/
  use-agy                    local wrapper for CLI ergonomics
packages/
  use-agy/
    api-core/                contracts and RPC protocol
    effect/                  reusable service package
  agent-dev/
    use-agy/                 CLI package
  ci/skill-gen/             source-driven skill generator
  ci/workflow-gen/          source-driven GitHub workflow generator
  tooling/typescript-config/
.agents/skills/             local operating skills
.github/workflows/          generated workflows
vendor/effect-smol/         Effect v4 submodule
plans/                      durable plans
```

For future starters, reuse this pattern when the target has reusable packages, generated skills, generated workflows, API/RPC contracts, or plugin packaging. For a one-off executable, collapse it to a single package but keep the same conventions.

## Related Skills

**Works with:** `domain-effect`, `domain-package`, `domain-configs`, `skill-gen`, `workflow-gen`, `workflow-plan`, `meta-housekeeping`.

**Optional:** `speckit-specify`, `hook-development`, `testing-strategist`, `create-skill`.
