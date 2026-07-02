---
name: domain-effect-source
description: 'Use when writing or reviewing Effect-TS code, verifying API signatures, debugging Effect issues, or asking ''how does Effect X work'' / ''what is the signature of''. Companion to domain-effect: provides vendor source-of-truth verification and an expert review subagent.'
metadata:
  tavi_toolbelt_original_frontmatter:
    effect_version: 4.0.0
---

# Effect-TS Source Reference

Ground every Effect-TS decision in the actual source code at `vendor/effect-smol/` (Effect v4 / `effect-smol` — see frontmatter). Never guess API signatures, behavior, or patterns from training data — read the source.

Companion skill: **`domain-effect`** holds project conventions and topic references. This skill holds the source-of-truth lookups, the anti-pattern catalog, the hot-path index, and the expert review subagent.

## Pre-Write Checklist

Before writing any non-trivial Effect code, walk through these four steps. They take ~30 seconds and prevent the failures that the rest of this skill exists to catch.

1. **Which Effect module?** Name the API surface (Effect.fn? Layer.effect? Schema.TaggedErrorClass? Stream.runForEach?). If you can't name it, you don't have a plan yet.
2. **Which `domain-effect/references/*.md` applies?** Open it. The convention is documented; don't re-derive it.
3. **Which anti-patterns apply?** Skim `cookbook/anti-patterns.md` for the failure modes in this surface area. Pre-emption beats review.
4. **Is there a project exemplar?** Check the **Exemplars** section below before inventing structure. Cargo-cult our own working code before consulting vendor source.

Then write the code, citing `vendor/effect-smol/...File.ts:<line>` for any non-obvious API usage. Use the **Hot-Path Deep Links** index (`cookbook/hot-paths.md`) to jump straight to the contract.

The `AGENTS.md` `### Effect-TS` rule makes activation mandatory for any file importing from `effect` / `effect/unstable/*`. Don't wait to be reminded.

## Source Index

All paths relative to `vendor/effect-smol/packages/`. In v4 the old `@effect/platform`, `@effect/rpc`, `@effect/sql`, `@effect/cli`, `@effect/ai`, `@effect/cluster` packages collapsed into the single `effect` package under `effect/src/unstable/<area>/`.

| Package | Source Path | Key Modules |
|---------|-----------|-------------|
| **effect** (core) | `effect/src/` | `Effect.ts`, `Schema.ts`, `Stream.ts`, `Layer.ts`, `Context.ts`, `Scope.ts`, `Fiber.ts`, `Queue.ts`, `Ref.ts`, `Schedule.ts`, `Match.ts`, `Cache.ts`, `Pool.ts`, `Duration.ts`, `DateTime.ts`, `Config.ts`, `Cause.ts`, `Exit.ts`, `Data.ts`, `Brand.ts`, `Option.ts`, `Result.ts` |
| **effect internals** | `effect/src/internal/` | `effect.ts`, `core.ts`, `stream.ts`, `layer.ts`, `schedule.ts`, `matcher.ts`, `schema/` |
| **effect/unstable/http** | `effect/src/unstable/http/` | `HttpClient.ts`, `HttpServer.ts`, `HttpRouter.ts`, `HttpServerResponse.ts` |
| **effect/unstable/httpapi** | `effect/src/unstable/httpapi/` | `HttpApi.ts`, `HttpApiBuilder.ts`, `HttpApiEndpoint.ts`, `HttpApiGroup.ts`, `HttpApiSchema.ts` |
| **effect/unstable/rpc** | `effect/src/unstable/rpc/` | `Rpc.ts`, `RpcGroup.ts`, `RpcClient.ts`, `RpcServer.ts` |
| **effect/unstable/sql** | `effect/src/unstable/sql/` | `SqlClient.ts`, `SqlResolver.ts`, `SqlSchema.ts`, `SqlModel.ts`, `Statement.ts` |
| **effect/unstable/cli** | `effect/src/unstable/cli/` | `Command.ts`, `Flag.ts`, `Argument.ts`, `Prompt.ts` |
| **effect/unstable/ai** | `effect/src/unstable/ai/` | `LanguageModel.ts`, `Tool.ts`, `Toolkit.ts`, `McpServer.ts` |
| **effect/unstable/cluster** | `effect/src/unstable/cluster/` | Actor model, sharding, entity management |
| **@effect/platform-node** | `platform-node/src/` | `NodeRuntime.ts`, `NodeFileSystem.ts`, `NodeServices.ts`, `NodeHttpServer.ts` |
| **@effect/platform-bun** | `platform-bun/src/` | `BunHttpServer.ts`, `BunFileSystem.ts` |
| **@effect/vitest** | `vitest/src/` | `index.ts` (test runners, `it.effect`, `it.live` — both include `Scope`) |

For the most-used APIs with exact line ranges, use [`cookbook/hot-paths.md`](cookbook/hot-paths.md) instead of grepping. To verify a signature not in the index, follow [`cookbook/lookup.md`](cookbook/lookup.md): public module file → `internal/` implementation → cite `file:line`.

## Exemplars (read these before vendor source)

The project's own Effect code is almost always a better starting template than the Effect repo. Two canonical exemplars live in the companion skill:

| Exemplar | Path | Covers |
|---|---|---|
| **API module** | `.agents/skills/domain-effect/references/example-api-module/` | `Api.ts`, `Domain.ts`, `Errors.ts`, `Http.ts`, `Policy.ts`, `Repo.ts`, `Rpc.ts`, `RpcProtocol.ts`, `Service.ts` — full vertical slice of an Effect HTTP/RPC module |
| **Hatchet task** | `.agents/skills/domain-effect/references/example-hatchet-task/` | `Constants.ts`, `Domain.ts`, `Tasks/` (`ReportGenerator.ts`, `ReportRequest.ts`, `ReportDelivery.ts`, `ReportPipeline.ts`), `Worker.ts` — full Hatchet task wiring (cron, event, callable, workflow) |
| **CLI** | `.agents/skills/domain-cli/references/example-cli/` | `Cli.ts`, `Main.ts`, `Modules/*` — full Effect CLI module using `effect/unstable/cli` |

When adding a new API module, new RPC handler, new domain service, new Hatchet workflow, new CLI command: open the corresponding exemplar **first**, then adapt. Match the structure, naming, and layering before writing a line of original code.

For live project usage, also grep the working tree:

```bash
grep -rn 'Context.Service<' src/ --include='*.ts' | head -20
```

## Cross-Skill Effect Knowledge

Effect content in this repo is spread across several skills. The `effect-expert` agent reads all of these (they're in its mandatory reading list); when working without the agent, you read them. Read conventions in `domain-effect`; verify API correctness here.

| File | Contains | Read when |
|---|---|---|
| [`domain-effect/SKILL.md`](../domain-effect/SKILL.md) + `references/*.md` (26 files) | Canonical conventions: gen vs pipe, module file structure, error patterns, schemas, layers, streams, HTTP API, RPC, SQL, testing | Any Effect change |
| [`meta-housekeeping/references/effect.md`](../meta-housekeeping/references/effect.md) | The audit-pass rule-ID enumeration (`E-P1-*` / `E-P2-*` / `E-P3-*`) of the `domain-effect` conventions: 36 P1 + 13 P2 + 9 P3. Entity-first naming, error suffix, `Context.Service` identifier format (`"@apps/api/Feedback"`), `Effect.fn` span format (`"Bookmarks.get"`), service/repo method names, `delete: del` export trick, `getOrNotFound`, `stripUndefined`, the `make` + explicit `Layer.effect` layer convention | Reviewing or scaffolding a service / repo / module |
| [`domain-agent-harness/references/layers-and-scoping.md`](../domain-agent-harness/references/layers-and-scoping.md) | Matryoshka scope model (Runtime → Agent → Turn → Step), `provide` vs `provideMerge`, `Layer.scope` requirement, phase discipline, custom `layers.turn` | Any agent-harness Effect work, or anywhere multi-scope layer composition matters |
| [`domain-database/SKILL.md`](../domain-database/SKILL.md) + [`references/queries.md`](../domain-database/references/queries.md) | Drizzle integration patterns, Repo returning `Option<Row>`, transaction handling. Verify `SqlClient` / `SqlResolver` signatures against `vendor/effect-smol/packages/effect/src/unstable/sql/` (in v4 SQL moved into the core `effect` package; the standalone `@effect/sql-drizzle` package no longer exists — confirm the current drizzle integration shape before relying on it) | Any DB-touching Effect code |
| [`practice-code-quality/SKILL.md`](../practice-code-quality/SKILL.md) | Type discipline: derive from source (`$inferSelect`, `Schema.Type`), no casts, `type` over `interface`. Effect code is TS code — these rules still apply | All Effect TS code |

## Expert Subagent

The subagent is defined as a Claude Code agent at **[`.agents/agents/effect-expert.md`](../../agents/effect-expert.md)**. Spawn with `subagent_type: "effect-expert"` (Opus, with Read / Grep / Glob / Bash). The agent file carries the full persona, iron rules, and mandatory reading list — invoking it via `subagent_type` is preferred over re-pasting an inline prompt template.

For per-task framing (review vs. Q&A vs. debug), see [cookbook/review.md](cookbook/review.md). Those templates wrap the `effect-expert` agent with task-specific inputs.

**Lowered activation threshold (intentional):** spawn the subagent for **any non-trivial Effect change without a clear project precedent**. "Non-trivial" includes:

- New service, new layer, new HTTP API group, new RPC handler, new Hatchet task
- Any code touching `Scope`, `Fiber`, `Queue`, `Stream`, `Schedule`, `Cache`, or `Pool`
- Any error-channel change (new `Schema.TaggedErrorClass`, new `catchTag`, layer error type changes)
- Any concurrency/resource-management code (`acquireRelease`, `Effect.forEach({ concurrency })`, `Effect.all({ batching })`)
- Any time you'd write "I think this is how `<X>` works" instead of citing source

Skip the subagent for trivial edits (renames, type-only changes, comment fixes, exact-copy of an existing pattern). When in doubt, spawn it — the subagent is cheap and the bugs it catches are not.

## Cookbook

| Operation | Cookbook | Use When |
|-----------|---------|----------|
| pre-flight | (Pre-Write Checklist above) | Before writing any non-trivial Effect code |
| hot-paths | [cookbook/hot-paths.md](cookbook/hot-paths.md) | Need the file:line range of a common API — jump straight to the contract |
| anti-patterns | [cookbook/anti-patterns.md](cookbook/anti-patterns.md) | Pre-emption — scan before writing in an unfamiliar surface area |
| lookup | [cookbook/lookup.md](cookbook/lookup.md) | Need to verify a specific API signature, behavior, or pattern |
| review | [cookbook/review.md](cookbook/review.md) | Need deep Effect code review or expert analysis via subagent |
| debug | [cookbook/debug.md](cookbook/debug.md) | Debugging Effect-related issues by tracing through source |

**Read the relevant cookbook file before executing an operation.**

## Version Drift

The skill is pinned to `effect@4.x` (see frontmatter `effect_version`). There is no automated `effect:check-skill-drift` check in this project; instead the operator pins `effect@4.x` in `package.json` and reviews `vendor/effect-smol/migration/` on every version bump. When `vendor/effect-smol` is bumped, walk the relevant `migration/*.md` deltas and then update:

1. `cookbook/hot-paths.md` — line ranges drift on every release
2. `cookbook/anti-patterns.md` — re-scan for new failure modes / fixed ones
3. Frontmatter `effect_version` field

Treat `vendor/effect-smol/migration/v3-to-v4.md` (import + API rename maps) and the per-topic guides (`services.md`, `error-handling.md`, etc.) as the canonical record of what changed.
