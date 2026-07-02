# Wire A Runtime Surface

## Context

Use to expose a service through a runtime surface: a CLI, an HTTP API, and/or an RPC endpoint. The bundled `templates/runtime/` carries all three wired to the example `Greeter` service, with every Effect v4 signature copied from a working reference. Copy the surface(s) the project needs; skip the rest. Activate `domain-effect` and `domain-cli`.

## Input

The service to expose, and which surfaces are needed (CLI / HTTP API / RPC).

## Boundary discipline

Contract modules (`Api.ts`, `RpcProtocol.ts`) hold shared contracts only — schemas, endpoint and procedure definitions, public errors. Handler modules (`Http.ts`, `Rpc.ts`) only unpack input, call the service, and translate errors. State lives behind a service, never in a handler. `domain-effect` owns this rule.

## Steps

### 1. HTTP API + RPC contract (`api-core`)

```bash
cp -R templates/runtime/api-core <project-root>/packages/<scope>/api-core
```

`api-core` is **contract-only** (depends on `effect` alone). It declares the public request/response schemas and errors, the `HttpApi` (`HttpApiGroup` + `HttpApiEndpoint`), and the `RpcGroup` protocol. The bundled example exposes one `POST /greeter/greet` endpoint and one `greeter.greet` RPC procedure — replace them with the project's contracts.

### 2. HTTP server app (`apps/api`)

```bash
mkdir -p <project-root>/apps
cp -R templates/runtime/api <project-root>/apps/api
```

This app provides the handler layers (`Modules/<Name>/Http.ts`, `Rpc.ts`), a thin app-local `Service.ts` that bridges the contract to the domain service, and the Bun server wiring (`Server.ts` → `HttpRouter.serve` + `BunHttpServer.layer`, `Main.ts` → `BunRuntime.runMain`). `Config.ts` enforces loopback-only binding via tagged errors (`APP_API_HOST` / `APP_API_PORT`) — keep that guard. Point its dependency at the project's core package.

### 3. CLI (`cli`)

```bash
cp -R templates/runtime/cli <project-root>/packages/<scope>/cli
```

The CLI uses `effect/unstable/cli` (`Command`, `Flag`, `Argument`) and runs via `BunRuntime.runMain` + `BunServices.layer`. It follows the agent-CLI contract: data on stdout, diagnostics on stderr, no prompts in non-interactive paths, stable failure exit codes, and `--json` for machine output (`Helpers/{Errors,Output}.ts`). Wire its `bin` in `package.json`; the `bin-greeter` wrapper assumes the CLI lives at `packages/<scope>/cli` — adjust the relative import if you place it elsewhere.

### 4. Rename And Fill

Rename `Greeter`/`Greet` → the project's domain, fill placeholders (`@{{SCOPE}}/api-core`, `@{{SCOPE}}/cli`, `{{REPO_NAME}}`), add each new package to the root workspace globs if needed, and point the runtime imports at the project's core service package.

## Done

Report which surfaces were added, the endpoint/command/procedure exposed, and that `bun run typecheck` + the runtime tests pass.
