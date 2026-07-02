---
name: domain-cli
description: "Use when creating new Effect CLI packages or working on the workspace's CLI tools."
---

# CLI with @effect/cli

Build repo-owned CLIs using `@effect/cli` with the same module patterns as the API layer. CLI tool packages in the workspace follow this skill.

## Canonical Example

A complete runnable example lives at `references/example-cli/` (relative to this skill). Run it:

```bash
cd .agents/skills/domain-cli/references/example-cli
bun run cli -- --help
bun run cli -- greet -v World
bun run cli -- config set theme dark
bun run cli -- fetch --headers https://httpbin.org/get
```

## Module Structure

CLI modules use the same canonical layout as backend Effect modules — see [module-structure.md](../domain-effect/references/module-structure.md). The CLI-specific mapping: `Args.*` and `Options.*` definitions live in `Arguments.ts` (the API-layer `Api.ts` equivalent) and command handlers live in `Command.ts` (the `Http.ts` equivalent). `Domain.ts` and `Service.ts` keep their usual roles.

```
src/
├── Main.ts                    Minimal entry point
├── Cli.ts                     Root command + layer assembly
└── Modules/
    └── <Name>/
        ├── Arguments.ts       Args + Options definitions
        ├── Command.ts         Command handlers
        ├── Domain.ts          Schemas, errors (optional)
        └── Service.ts         Business logic (optional)
```

## Entry Point

`Main.ts` only wires `Cli` to `BunRuntime.runMain`; `Cli.ts` builds the root command and `MainLayer`:

```typescript
// Cli.ts
export const Cli = Command.run(RootCommand, { name: 'my-cli', version: pkg.version });
export const MainLayer = Layer.mergeAll(BunContext.layer, FetchHttpClient.layer);
```

`BunContext.layer` provides `FileSystem`, `Path`, `Terminal`, `CommandExecutor`. `FetchHttpClient.layer` provides `HttpClient` (not in `BunContext`). Full files: [`references/example-cli/src/Main.ts`](references/example-cli/src/Main.ts), [`references/example-cli/src/Cli.ts`](references/example-cli/src/Cli.ts).

## Arguments & Options

Define in `Arguments.ts`; import into `Command.ts` via namespace import to avoid shadowing. `Args.text` makes a positional; `Options.boolean/.text/.integer` make flags via `.withAlias`/`.withDescription`/`.withDefault`. Wrap optional values with `Options.optional` so the handler receives `Option<T>`. Full file: [`references/example-cli/src/Modules/Greet/Arguments.ts`](references/example-cli/src/Modules/Greet/Arguments.ts).

### Grouping with Args.all

Use `Args.all` with an object to group related positional args into a typed object the handler receives whole, e.g. `Args.all({ key, value })` yields `{ key: string, value: string }`. Full file: [`references/example-cli/src/Modules/Config/Arguments.ts`](references/example-cli/src/Modules/Config/Arguments.ts).

## Commands

Import arguments via namespace import, use `Command.make(name, argsRecord, handler)` with an `Effect.gen` handler, and pipe `Command.withDescription`. Full file: [`references/example-cli/src/Modules/Greet/Command.ts`](references/example-cli/src/Modules/Greet/Command.ts).

## Subcommands

Group related commands under a parent with `Command.withSubcommands`. `Command.provide` on the parent injects a service into every child:

```typescript
export const FooCommand = Command.make('foo').pipe(
  Command.withSubcommands([GetCommand, SetCommand, ListCommand]),
  Command.provide(FooService.Default),  // injected into all subcommands
  Command.withDescription('Manage foo resources')
);
```

## Service Integration

Services follow the standard Service/Repo conventions in `domain-effect`. Inject into commands via `Command.provide(MyService.Default)` on the parent command.

## Package Setup

Standard `@effect/cli` package — see [module-structure.md](../domain-effect/references/module-structure.md) for the package skeleton. Dependencies: `@effect/cli`, `@effect/platform`, `@effect/platform-bun`, `effect` (all from `catalog:`). Add a `"dev": "bun run src/Main.ts"` script plus a `"bin": { "<name>": "./src/Main.ts" }` field; the bin name is the user-facing command (e.g. `my-cli`), so tools are invoked by bin name rather than `bun run`. The example-cli ships a standalone `"cli"` script instead of a `bin` so it stays runnable in place.

## Anti-Patterns

| Don't | Do |
|-------|-----|
| `import { Command } from 'commander'` | `import { Command } from '@effect/cli'` |
| `parseArgs` from `node:util` | `Args.*` and `Options.*` |
| `switch (process.argv[2])` | `Command.withSubcommands` |
| `process.exit(1)` in handlers | `Effect.fail(1)` — exit in `Main.ts` only |
| Inline args in `Command.make` | Separate `Arguments.ts` file |
| `async/await` in handlers | `Effect.gen(function* () { ... })` |
