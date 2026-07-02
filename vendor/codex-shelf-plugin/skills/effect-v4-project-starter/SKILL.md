---
name: effect-v4-project-starter
description: Use when starting, scaffolding, refreshing, or reviewing a Bun TypeScript project on Effect v4 — repo-local agent tooling, generated skills/workflows, services/CLI/HTTP-API/RPC surfaces, plugin bundles, or any project that should vendor effect-smol as source reference. Ships a complete bundled template (configs, example module, runtime surfaces, generators, default agent skills) so a full workspace can be scaffolded with no external reference repo.
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

Start a Bun + TypeScript project on Effect v4 with strict package conventions, local agent skills, generated agent artifacts, and a verification gate that future agents can trust. Everything needed is bundled under [`templates/`](templates/) — scaffold a complete workspace by copying templates and filling placeholders, with no external reference repository.

## Variables

- **DEFAULT_RUNTIME**: `bun`
- **DEFAULT_EFFECT_VERSION**: current Effect v4 beta, verified from the npm registry before editing `package.json` (never `"latest"` in a committed manifest)
- **DEFAULT_PROJECT_ROOT**: current working directory unless the user names a folder
- **TEMPLATE_ROOT**: [`templates/`](templates/) inside this skill — the source of every scaffolded file
- **EFFECT_SOURCE_REFERENCE**: `vendor/effect-smol` git submodule (the public Effect v4 source: `https://github.com/Effect-TS/effect-smol`)
- **SPECIFY_CODEX_FLAGS**: `--integration codex --integration-options="--skills"`
- **SPECIFY_CLAUDE_FLAGS**: `--integration claude`

## How It Works

Inspect the target folder and local toolchain first. Choose a single-package or workspace shape explicitly, pin the Effect v4 catalog from the registry, then **copy the bundled templates** and substitute placeholders. Add the project-local operating skills, decide whether generated skills/workflows earn their keep, and keep the first working slice small enough to prove with `bun run ci`.

The bundled `templates/` carry real, working files lifted from a production Effect v4 workspace and genericized: you copy them, fill `{{PLACEHOLDER}}` tokens (see [`templates/PLACEHOLDERS.md`](templates/PLACEHOLDERS.md)), and verify — rather than writing Effect boilerplate from memory (where v4 API drift hides).

## Commands

| Command | Purpose |
| --- | --- |
| `/effect-v4-project-starter inspect` | Discover local conventions, tool versions, and the verified Effect v4 pin before writing files |
| `/effect-v4-project-starter scaffold` | Copy the bundled root + tooling templates into a Bun/TypeScript/Effect project or workspace |
| `/effect-v4-project-starter module` | Add an Effect v4 service module from the bundled example |
| `/effect-v4-project-starter runtime` | Wire a CLI, HTTP API, and/or RPC surface from the bundled runtime templates |
| `/effect-v4-project-starter skills` | Copy the bundled default agent skills and define project skill ownership |
| `/effect-v4-project-starter generators` | Install the bundled `skill-gen` / `workflow-gen` source generators |
| `/effect-v4-project-starter speckit` | Initialize SpecKit when the project needs Codex/Claude planning workflows |
| `/effect-v4-project-starter plugin` | Build a self-contained plugin bundle from copied snapshots |
| `/effect-v4-project-starter verify` | Install dependencies and run the full gate |

## Cookbook

Read the relevant cookbook before executing a command.

| Command | Cookbook | Use When |
| --- | --- | --- |
| inspect | [cookbook/inspect.md](cookbook/inspect.md) | Before any scaffold, migration, or plugin refresh |
| scaffold | [cookbook/scaffold.md](cookbook/scaffold.md) | Creating or reshaping the project files |
| module | [cookbook/module.md](cookbook/module.md) | Adding an Effect v4 service module |
| runtime | [cookbook/runtime.md](cookbook/runtime.md) | Wiring a CLI / HTTP API / RPC entry point |
| skills | [cookbook/skills.md](cookbook/skills.md) | Installing the bundled agent skills |
| generators | [cookbook/generators.md](cookbook/generators.md) | Adding `skill-gen` / `workflow-gen` source generation |
| speckit | [cookbook/speckit.md](cookbook/speckit.md) | Adding SpecKit integrations |
| plugin | [cookbook/plugin.md](cookbook/plugin.md) | Creating a plugin bundle or copied skill snapshot |
| verify | [cookbook/verify.md](cookbook/verify.md) | Proving the scaffold is healthy |

## Core Decisions

- Prefer a single package for tiny tools; use a Bun workspace when there will be reusable packages, CI/generator packages, runtime surfaces, or plugin packaging artifacts.
- Use Bun for installation, scripts, bins, and local linking. Do not add npm/pnpm/yarn paths unless the user explicitly requests them.
- Keep Effect v4 versions in the root workspace catalog. Verify the exact beta from the npm registry; never commit `"latest"`.
- Use `effect`, `effect/<Module>`, and `effect/unstable/*` imports. In v4, CLI/process/RPC live at `effect/unstable/cli`, `effect/unstable/process`, and `effect/unstable/rpc`. Do **not** add `@effect/cli` for v4 projects.
- Bun-only projects use `@effect/platform-bun` with `BunRuntime` and `BunServices`. `BunServices.layer` provides child process, filesystem, path, stdio, terminal, and crypto services.
- Vendor `effect-smol` as a git submodule when the project depends on unstable v4 APIs or should teach future agents Effect v4 source truth.
- Keep generated artifacts source-driven. Use `//<skill-gen>` for generated skills and `//<workflow-gen>` for generated workflows when docs/workflows must stay close to code.
- Treat plugin install bundles as copied snapshots, not symlinks — verify the installed cache before relying on a path.
- **Never guess an Effect signature.** Copy from the bundled templates or read `vendor/effect-smol`. This is the single biggest source of broken v4 code.

## Template Layout

`templates/` is the scaffold payload. Copy from it; do not write these from memory.

```text
templates/
  PLACEHOLDERS.md              token reference ({{REPO_NAME}}, {{SCOPE}}, versions, …)
  root/                        package.json, biome.jsonc, knip.json, vitest.config.ts,
                               vitest.setup.ts, Justfile, gitignore, AGENTS.md, README.md, LICENSE
  tooling/typescript-config/   shared base.json + bun.json presets
  example-package/             a complete Effect v4 package: a `Greeter` service
                               (Domain/Errors/Service) with layer + fakeLayer + a test
  runtime/                     CLI, HTTP API (apps/api), and RPC contract (api-core), all
                               wired to the example service
  ci/                          skill-gen + workflow-gen generators, ci/actions checkers
  github/actions/setup/        composite setup action
  skills/                      curated default agent skills (domain-*, practice-*,
                               meta-housekeeping, workflow-plan, skill-gen, workflow-gen)
```

The reference shape for a full workspace:

```text
apps/<service>/                runtime services (HTTP API, workers) when needed
packages/
  <scope>/<package>/           reusable Effect service packages
  <scope>/api-core/            HTTP API + RPC contracts (contract-only)
  <scope>/cli/                 CLI package
  ci/skill-gen/                source-driven skill generator
  ci/workflow-gen/             source-driven GitHub workflow generator
  ci/actions/                  co-located CI checkers (workflow fragments)
  tooling/typescript-config/   shared tsconfig presets
.agents/skills/                local operating skills
.github/workflows/             generated workflows
vendor/effect-smol/            Effect v4 submodule
```

For a one-off executable, collapse to a single package but keep the same conventions, configs, and `AGENTS.md`.

## Related Skills

**Bundled with the template (copied into the new project):** `domain-effect`, `domain-package`, `domain-configs`, `domain-cli`, `domain-git`, `practice-code-quality`, `practice-debug`, `meta-housekeeping`, `workflow-plan`, `skill-gen`, `workflow-gen`.

**Optional:** `speckit-specify`, `hook-development`, `testing-strategist`, `create-skill`.
