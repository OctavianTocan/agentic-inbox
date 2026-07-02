# use-agy Implementation Plan

Date: 2026-06-22

> Execute after reading `.context/plans/brainstorm.md`, `AGENTS.md`, `domain-effect`, `domain-package`, `skill-gen`, `workflow-gen`, and `cli-for-agents`.

## Goal

Build `use-agy` as a Bun-only Effect v4 repo with:

- generated agent skills and generated CI
- a reusable AGY service package
- a first-class `use-agy` CLI
- contract-first local API/RPC surfaces
- Shelf plugin packaging via copied snapshots and optional submodule source

## Decisions

- Approach: B + C + D.
- Runtime/package manager: Bun only.
- Effect v4 beta: `4.0.0-beta.85`, verified from npm dist-tags on 2026-06-22.
- Platform package: `@effect/platform-bun`, not `@effect/platform-node`, for use-agy runtime packages.
- Effect v4 CLI: `effect/unstable/cli`. Do not add `@effect/cli`.
- Process execution: `effect/unstable/process`.
- RPC: `effect/unstable/rpc`.
- Skill generation: `skill-gen`.
- CI generation: `workflow-gen`; the user's "ci-gen" maps to this repo's generated workflow/action system.
- Shelf: separate private GitHub repo, copied plugin snapshots, optional `use-agy` submodule as upstream source.

## Current Repo Changes Already Made

- Root workspace globs now include `apps/**/*` and `packages/**/*`.
- Root catalog now uses:
  - `effect@4.0.0-beta.85`
  - `@effect/platform-bun@4.0.0-beta.85`
  - `@effect/vitest@4.0.0-beta.85`
- Existing generator CLIs now depend on `@effect/platform-bun` and use `BunRuntime` / `BunServices`.

Run `bun install` before implementation continues so `bun.lock` catches up.

## Research Evidence

### comcom Structure

`/mnt/HC_Volume_105512717/The Company Co/comcom` uses a large but very clear split:

- `apps/`: runtime deployables (`api`, `rpc`, `worker`, etc.).
- `packages/comcom/api-core`: API/RPC contracts and schemas.
- `packages/agent-dev/tcc`: local CLI package with `bin`, `src/Main.ts`, `src/Cli.ts`, `src/Commands.ts`, `Helpers/*`, `Infrastructure/*`, `Modules/*`, and `test/{unit,integration,e2e}`.
- `packages/ci/gen-skills`, `packages/ci/gen-github-workflow`, and `packages/ci/actions/*`: generated agent/CI artifacts.
- `bin/tcc`: wrapper that runs the CLI package through Bun.

Use this structure, not the earlier one-package shape.

### comcom API/RPC Practices

Contract side:

- root HTTP API composes module contracts in `packages/comcom/api-core/src/Api.ts`.
- root RPC protocol merges domain groups in `packages/comcom/api-core/src/RpcProtocol.ts`.
- domain contracts live next to their bounded domain: `Modules/<Domain>/Api.ts`, `RpcProtocol.ts`, `Domain.ts`, `Errors.ts`.

Implementation side:

- runtime HTTP/RPC layers live under `apps/api/src`.
- handlers call services, not repos directly: `Modules/<Domain>/Http.ts`, `Rpc.ts`, `Service.ts`, `Policy.ts`.
- app boundary merges layers in `apps/api/src/App.ts` and starts with `BunRuntime`/`BunHttpServer` in `apps/api/src/Main.ts`.

Testing side:

- contract tests in `packages/comcom/api-core/test`.
- handler unit tests under `apps/api/test/unit`.
- integration tests under `apps/api/test/integration`.

### Effect v4 / effect-smol

Vendored source confirms:

- `@effect/platform-bun/src/BunServices.ts` provides `ChildProcessSpawner | Crypto | FileSystem | Path | Terminal | Stdio`.
- `@effect/platform-bun/src/BunRuntime.ts` exports `runMain`.
- `effect/unstable/cli`, `effect/unstable/process`, and `effect/unstable/rpc` are exported by `effect`.
- `migration/v3-to-v4.md` maps:
  - `@effect/cli/*` -> `effect/unstable/cli/*`
  - `@effect/platform/Command*` -> `effect/unstable/process/*`
  - `@effect/rpc/*` -> `effect/unstable/rpc/*`

Use Context7 public docs with care: they still surface some v3 package examples for `@effect/cli` / `@effect/rpc`. In this repo, vendored `effect-smol` wins.

## Target Shape

```text
use-agy/
  apps/
    api/
      package.json
      src/
        App.ts
        Main.ts
        Modules/
          Agy/
            Http.ts
            Rpc.ts
            Service.ts
        Routes.ts
      test/
        unit/
        integration/
  bin/
    use-agy
  packages/
    use-agy/
      api-core/
        package.json
        src/
          Api.ts
          RpcProtocol.ts
          Lib/
            Errors.ts
          Modules/
            Agy/
              Api.ts
              RpcProtocol.ts
              Domain.ts
              Errors.ts
        test/
          ApiContracts.test.ts
          DomainCoverage.test.ts
      effect/
        package.json
        src/
          index.ts
          Modules/
            Agy/
              Config.ts
              Domain.ts
              Errors.ts
              Json.ts
              Process.ts
              Prompts.ts
              Service.ts
              Workspace.ts
        test/
          Agy/
    agent-dev/
      use-agy/
        package.json
        src/
          Main.ts
          Cli.ts
          Commands.ts
          Helpers/
            Config.ts
            Errors.ts
            ExitCode.ts
            Json.ts
            Output.ts
            Process.ts
          Infrastructure/
            ApiClient.ts
            RpcClient.ts
          Modules/
            Doctor/
              Command.ts
            Models/
              Arguments.ts
              Command.ts
            Configs/
              Arguments.ts
              Command.ts
            Runs/
              Arguments.ts
              Command.ts
            Reviews/
              Arguments.ts
              Command.ts
            Api/
              Arguments.ts
              Command.ts
            Rpc/
              Arguments.ts
              Command.ts
        test/
          unit/
          integration/
    ci/
      actions/
        use-agy/
          index.ts              //<workflow-gen> CI job fragment
      skill-gen/
      workflow-gen/
    tooling/
      typescript-config/
  .agents/
    skills/
      use-agy/
        SKILL.md
        cookbook/
      use-agy-toolkit/
        SKILL.md                generated by skill-gen
```

## Package Names

Use scopes that describe ownership and match comcom's style:

- `@use-agy/api-core`
- `@use-agy/effect`
- `@agent-dev/use-agy`
- `@apps/use-agy-api`

If Shelf packaging later needs the old `@shelf/agy-effect` name, expose that as an alias/package wrapper after the internal shape is proven.

## Dependency Rules

Root catalog:

```json
{
  "@effect/platform-bun": "4.0.0-beta.85",
  "@effect/vitest": "4.0.0-beta.85",
  "effect": "4.0.0-beta.85"
}
```

Bun runtime packages use:

```json
{
  "dependencies": {
    "@effect/platform-bun": "catalog:",
    "effect": "catalog:"
  }
}
```

Use imports like:

```ts
import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Command, Flag, Argument } from "effect/unstable/cli"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Rpc, RpcClient, RpcGroup, RpcSerialization, RpcServer } from "effect/unstable/rpc"
```

Do not add `@effect/cli`, `@effect/rpc`, or `@effect/platform-node` for new use-agy runtime packages.

## API/RPC Design

Follow comcom's contract-first split.

`packages/use-agy/api-core` owns contracts only:

- `Api.ts`: root HttpApi composition.
- `RpcProtocol.ts`: root RpcGroup composition and middleware.
- `Modules/Agy/Api.ts`: HTTP contract for local server.
- `Modules/Agy/RpcProtocol.ts`: RPC contract.
- `Modules/Agy/Domain.ts`: request/result schemas.
- `Modules/Agy/Errors.ts`: public errors.

`apps/api` owns runtime:

- `App.ts`: layer composition and middleware.
- `Main.ts`: `BunHttpServer` + `BunRuntime.runMain`.
- `Modules/Agy/Http.ts`: HTTP handlers that call `@use-agy/effect`.
- `Modules/Agy/Rpc.ts`: RPC handlers that call `@use-agy/effect`.
- `Modules/Agy/Service.ts`: app-local orchestration if needed.

Keep transport concerns out of `@use-agy/effect`.

Initial RPC spike:

- health/status endpoint
- `runText`
- `runJson`
- fake-service-backed tests proving API/RPC/CLI share the same domain types

Local-only binding by default. No public bind, no MCP.

## CLI Design

Follow comcom's `packages/agent-dev/tcc` shape plus `cli-for-agents`.

Commands:

```text
use-agy doctor
use-agy models list
use-agy configs get <key>
use-agy configs set <key> <value>
use-agy configs list
use-agy configs unset <key>
use-agy runs create --prompt <text>
use-agy runs create --prompt-file <path>
use-agy runs create --json --schema <path>
use-agy reviews create --file <path> --context <text>
use-agy reviews create --repo <path> --base <ref>
use-agy api serve
use-agy api status
use-agy rpc call <method>
use-agy completions generate <shell>
```

Rules:

- data on stdout
- diagnostics/errors on stderr
- human output default
- `--json` emits JSON-only stdout
- `--plain` emits tab-separated rows with no headers
- no prompts in non-TTY
- stable exit codes: `0`, `1`, `2`, `4`, `5`

Add `bin/use-agy` wrapper for local ergonomics, like comcom's `bin/tcc`.

## AGY Service Design

`@use-agy/effect` owns:

- AGY command config and config source chain
- stdin prompt flow
- cwd/env/timeout handling
- stdout/stderr/exit/signal preservation
- strict JSON parser with exact-key validation
- fenced/wrapped JSON rejection
- inline mode
- disposable workspace mode for reviews
- fake service/test layer

Port the good Telegram Notifier and `agy-review` practices into this package, but keep Telegram/Codex/Claude/Shelf concerns out of the public API.

## Generated Skill And CI

`use-agy-toolkit` is generated by `skill-gen`.

Place `//<skill-gen>` fragments near source modules:

- `packages/use-agy/effect/src/Modules/Agy/Service.ts`
- `packages/use-agy/effect/src/Modules/Agy/Process.ts`
- `packages/agent-dev/use-agy/src/Cli.ts`
- `packages/use-agy/api-core/src/Modules/Agy/RpcProtocol.ts`
- `apps/api/src/Modules/Agy/Rpc.ts`

Add CI through `workflow-gen`:

- create `packages/ci/actions/use-agy/index.ts`
- contribute a `ci` workflow job for package-specific typecheck/test or a focused use-agy gate
- mark required only if this job should become a branch-protection status

After source fragments:

```bash
bun run skill-gen:generate
bun run skill-gen:check
bun run workflow-gen:generate
bun run workflow-gen:check
```

## Shelf Workstream

Shelf is now a separate plugin bundle workstream:

- make `/root/plugins/shelf` a git repo
- add portable README, LICENSE, `.gitignore`, `.gitattributes`
- create private GitHub repo
- push initial commit
- set description and topics
- keep installed cache as artifact, not source of truth

Recommended GitHub metadata:

- repo: `codex-shelf-plugin`
- visibility: private
- description: `Curated Codex plugin bundle of high-use skills, shipped as copied snapshots for reliable plugin cache behavior.`
- topics: `codex`, `codex-plugin`, `codex-skills`, `agentic-workflows`, `effect`, `bun`, `typescript`, `workflow`, `tooling`

GitHub CLI auth is currently invalid for the local `gh` token. Either refresh `gh auth` or use an authenticated GitHub connector before pushing.

## Implementation Steps

### Step 1: Finish Platform Bump

- Run `bun install`.
- Run generator checks and typecheck.
- Fix any beta.85 / platform-bun compile breaks.

Verify:

```bash
bun run skill-gen:check
bun run workflow-gen:check
bun run typecheck
```

### Step 2: Create Workspace Skeleton

- Add `apps/api`.
- Add `packages/use-agy/api-core`.
- Add `packages/use-agy/effect`.
- Add `packages/agent-dev/use-agy`.
- Add `bin/use-agy`.

Use minimal compiling files first.

### Step 3: Implement Core AGY Service

- schemas, errors, config, strict JSON, fake layer
- no real AGY subprocess yet
- unit tests

### Step 4: Implement Process Boundary

- `effect/unstable/process` with `BunServices`
- stdout/stderr/exit/signal/timeout detail
- stdin prompt flow
- tests

### Step 5: Implement CLI

- `Main.ts`, `Cli.ts`, `Commands.ts`, command modules
- output and exit-code contract
- integration tests for help, doctor, JSON/plain output, error paths

### Step 6: Implement API/RPC Spike

- contract modules in api-core
- runtime handlers in apps/api
- local-only serve/status/runText/runJson
- tests through fake service

### Step 7: Generate Skills And CI

- add `use-agy-toolkit` fragments
- add `packages/ci/actions/use-agy`
- regenerate and check artifacts

### Step 8: Shelf Repo Push

- initialize `/root/plugins/shelf`
- commit plugin bundle
- create private GitHub repo
- set metadata/topics
- push
- verify source and installed cache paths

## Verification Gates

After platform bump:

```bash
bun install
bun run skill-gen:check
bun run workflow-gen:check
bun run typecheck
```

After implementation:

```bash
bun run ci
bun run packages/agent-dev/use-agy/src/Main.ts --help
bun run packages/agent-dev/use-agy/src/Main.ts doctor --json
```

Review checks:

```bash
rg -n "@effect/cli|@effect/rpc|@effect/platform-node|NodeRuntime|NodeServices|effect@3|latest" apps packages .agents/skills/use-agy .agents/skills/use-agy-toolkit
rg -n "MCP|model context protocol" apps packages/use-agy packages/agent-dev/use-agy .agents/skills/use-agy .agents/skills/use-agy-toolkit
git submodule status vendor/effect-smol
```

The MCP grep may find "out of scope" language, but it should not find implementation instructions.
