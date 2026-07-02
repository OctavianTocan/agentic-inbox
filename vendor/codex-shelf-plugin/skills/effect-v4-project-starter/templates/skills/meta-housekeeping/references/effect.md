# Effect Housekeeping

Audit Effect-TS code for the canonical patterns defined by `domain-effect`.

**Also enforce all rules in [code-quality-checklist.md](code-quality-checklist.md)** — universal code quality rules that apply to every domain.

## Scope

- Any Effect-based package under `packages/**` (e.g. `packages/ci/skill-gen/src/**`)

`vendor/effect-smol` is pinned upstream source and is never audited.

## Source of Truth

`domain-effect` (SKILL.md + `references/conventions.md`) is the single canonical owner of the naming, signature, span, error, and observability conventions. This file is the audit-pass enumeration of those conventions: it assigns stable rule IDs (`E-P1-*`, `E-P2-*`, `E-P3-*`) and points each one at the section that defines it. Read the cited `domain-effect` section for the actual rule text, violation examples, and correct form before flagging anything.

Effect v4 API surface is imported from `effect`, `effect/<Module>`, and `effect/unstable/*`; the v3 `@effect/*` packages mostly do not exist in v4. Verify any API signature against the pinned source in `vendor/effect-smol` (see `vendor/effect-smol/migration/v3-to-v4.md`).

## Audit Checklist

Rule IDs use prefix `E` (effect): `E-P1-1`, `E-P2-3`, etc. Work through **P1 first**, then P2, then P3. The "See" column points to the canonical definition; this table does not restate it.

### P1 — Must Fix

| # | Rule | See |
|---|------|-----|
| 1 | Entity-first type naming | domain-effect conventions.md "Domain Type Naming" |
| 2 | Input vs tool params distinction | domain-effect conventions.md "Schema Type Usage" |
| 3 | Schema.Class for exported domain types | domain-effect conventions.md "Schema Type Usage" |
| 4 | Error suffix on error types | domain-effect conventions.md "Domain Type Naming" |
| 5 | Entity-scoped error naming | domain-effect conventions.md "Domain Type Naming" |
| 6 | NotFound error fields (`{ id }` only) | domain-effect "Errors" |
| 7 | Conflict error fields (the conflicting field) | domain-effect "Errors" |
| 8 | Hidden cause on operational errors (non-schema `cause`) | domain-effect "Errors" |
| 9 | Service method: create | domain-effect conventions.md "Method Naming" |
| 10 | Service method: get | domain-effect conventions.md "Method Naming" |
| 11 | Service method: list | domain-effect conventions.md "Method Naming" |
| 12 | Service method: update | domain-effect conventions.md "Method Naming" |
| 13 | Service method: delete | domain-effect conventions.md "Method Naming" |
| 14 | Service method: batch (`createMany`) | domain-effect conventions.md "Method Naming" |
| 15 | Repo method: find | domain-effect conventions.md "Method Naming" |
| 16 | Repo method: findMany | domain-effect conventions.md "Method Naming" |
| 17 | Repo method: insert | domain-effect conventions.md "Method Naming" |
| 18 | Repo method: update | domain-effect conventions.md "Method Naming" |
| 19 | Repo method: delete | domain-effect conventions.md "Method Naming" |
| 20 | Repo returns Option not null | domain-effect conventions.md "Return Types" |
| 21 | Service definition uses `Effect.Service` (with `effect:`/`scoped:`); use `Context.Tag` only for external bindings or test seams | domain-effect "`Effect.Service` Layout" |
| 22 | Every dependency declared in the `dependencies` array | domain-effect "`Effect.Service` Layout" |
| 23 | Service identifier format | domain-effect conventions.md "Service Identifiers" |
| 24 | Effect.fn for all service/repo methods | domain-effect "`Effect.fn` for Traced Service Methods" |
| 25 | Effect.fn span naming | domain-effect conventions.md "`Effect.fn` Span Naming" |
| 26 | No throw in Effect code | domain-effect "Errors" |
| 27 | No try/catch around Effects | domain-effect "Errors" (Handling errors) |
| 28 | No blanket `Effect.catch` (use `catchTag`/`catchTags`) | domain-effect "Errors" (Handling errors) |
| 29 | No console.log | domain-effect "Observability" |
| 30 | No Date.now() | domain-effect "DB → Domain Narrowing" |
| 31 | Lifecycle resources (fork/acquireRelease/addFinalizer) use the `scoped:` constructor | domain-effect "`Effect.Service` Layout" |
| 32 | No Effect.runPromise in handlers | domain-effect "Bridging to Non-Effect Boundaries" |
| 33 | TaggedError is an Effect (yield* directly) | domain-effect "Errors" |
| 34 | No extracted `make` variable — inline the constructor body in `effect:`/`scoped:` | domain-effect "`Effect.Service` Layout" |
| 35 | Missing scope-level annotations | domain-effect "Observability" |
| 36 | Redundant per-method annotations | domain-effect "Observability" |

### P2 — Should Fix

| # | Rule | See |
|---|------|-----|
| 1 | Effect.Service JSDoc with @errors | domain-effect "Comment Conventions" |
| 2 | Effect.fn JSDoc with @param/@returns/@errors | domain-effect "Comment Conventions" |
| 3 | delete: del in return objects | domain-effect conventions.md "Method Naming" |
| 4 | getOrNotFound local helper | domain-effect "`getOrNotFound` Pattern" |
| 5 | stripUndefined for partial updates | domain-effect "DB → Domain Narrowing" |
| 6 | Effect.fn.Return<T> on complex methods | domain-effect "`Effect.fnUntraced` for Inner Generators" |
| 7 | Schema annotations on API types | domain-effect conventions.md "Schema Type Usage" |
| 8 | Repo types in Repo.ts not Domain.ts | domain-effect conventions.md "Domain Type Naming" |
| 9 | Service returns Entity, Repo returns Row | domain-effect "DB → Domain Narrowing" |
| 10 | External calls retry + timeout | domain-effect "`wrapExternalCall` for Client Packages" |
| 11 | No bare yield (always `yield*`) | domain-effect "Core Principles" |
| 12 | Sub-resource method naming | domain-effect conventions.md "Method Naming" |
| 13 | Status transition verbs | domain-effect conventions.md "Method Naming" |

### P3 — Recommended

| # | Rule | See |
|---|------|-----|
| 1 | Module file structure | domain-effect "Module File Structure" |
| 2 | Service directory promotion | domain-effect "Module File Structure" |
| 3 | Domain directory promotion | domain-effect "Module File Structure" |
| 4 | Import style | Path alias, no extension: `import { X } from "@/Modules/Foo/Domain"`, not a relative path or `.ts` suffix |
| 5 | No annotations in repos | domain-effect "Observability" |
| 6 | Policy method naming | domain-effect conventions.md "Policy" |
| 7 | No tacit/point-free | domain-effect "Code Style" |
| 8 | Testing patterns | domain-effect "Testing" |
| 9 | No section separator comments | [code-quality-checklist.md](code-quality-checklist.md) Q-P3-3 |

## Discovery

```bash
grep -rl 'from "effect"' packages --include="*.ts" | grep -v vendor
```

## Audit Approach

Spawn one **sub-agent following `AGENTS.md` > Subagents per Effect package** (e.g. `@ci/skill-gen`). Each agent:

1. Loads the `domain-effect` skill and the universal code-quality checklist
2. Reads all source files in its assigned package
3. Works through this checklist **rule by rule**, P1 first, then P2, then P3, reading the cited `domain-effect` section for each rule's definition
4. Also enforces all rules in [code-quality-checklist.md](code-quality-checklist.md)
5. Returns violations referencing rule IDs:

```
Package: {name} | Violations: {n}
- [E-P1-3] Schema.Class for exported types — Domain.ts:42
  Current: `export const FooInput = Schema.Struct({...})`
  Should be: `export class FooCreateInput extends Schema.Class<...>()({...})`
- [Q-P2-1] Boolean naming — Service.ts:88
  Current: `const loading = ...`
  Should be: `const isLoading = ...`
```

Or `Package: {name} — clean` if none found.

## Cross-Cutting References

- [knip.md](knip.md) — unused deps in Effect packages
- [npm-packages.md](npm-packages.md) — catalog compliance
