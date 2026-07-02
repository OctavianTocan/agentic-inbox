---
name: domain-effect
description: "Use when writing or reviewing Effect-TS services, repos, tagged errors, HTTP APIs, layers, streams, concurrency, backend app code, clients, platform packages, or other Effect-based application packages."
---

# Effect-TS Rules & Conventions

**Goal: Build production-quality, type-safe Effect modules with explicit dependencies, tracked errors, and managed resources.**

This skill is the canonical owner of Effect naming, signature, span, and diagnostics conventions (here and in `references/conventions.md`). For API-signature verification against pinned vendor source, use `vendor/effect-smol` and the references in this skill.

## Core Principles

1. **Errors are values** — track all expected errors with `Schema.TaggedError`.
2. **Dependencies are explicit** — Services and Layers, never global singletons.
3. **Resources are managed** — `acquireRelease` / `scoped:` for anything that needs cleanup.
4. **Effects are descriptions** — they don't run until executed at the boundary.

## API/RPC Boundary Discipline

API and RPC layers are transport boundaries, not state owners.

- Contract modules (`Api.ts`, `RpcProtocol.ts`) contain shared contracts only: schemas, endpoint definitions, RPC protocol definitions, and public errors. They never contain mutable state, service construction, caches, queues, refs, timers, or business logic.
- Handler modules (`Http.ts`, `Rpc.ts`) contain handler wiring only: unpack request input, call the module Service, apply policy/RLS/rate limits, and translate boundary errors. They do not own `Ref`, `Queue`, `Map`, `Set`, timers, module-level mutable variables, or cache repositories.
- Mutable or long-lived state belongs behind an Effect service in `Service.ts`, `State.ts`, `TurnState.ts`, `Store.ts`, or an infrastructure/cache/repo module. Handlers may depend on those services, but must not create or mutate the state directly.
- If a handler needs state to satisfy a request, first move that state behind a named service method, then call the service from `Http.ts` or `Rpc.ts`.

Review checklist for API/RPC changes:

- [ ] `Api.ts` / `RpcProtocol.ts` are contract-only.
- [ ] `Http.ts` / `Rpc.ts` do not introduce `Ref`, `Queue`, mutable collections, timers, or module-scope mutable variables.
- [ ] State lifecycle is owned by an Effect service/layer, not by per-endpoint handler code.
- [ ] Tests exercise behavior through the service or public boundary, not by inspecting handler-local state.

## Module File Structure

The canonical file structure (`Domain.ts`, `Service.ts`, `Errors.ts`, `Repo.ts`, `Api.ts`, `Http.ts`, `Policy.ts`, `Constants.ts`, `Helpers.ts`, `Events.ts`, `Config.ts`, plus rules for promoting to directories) lives in [references/module-structure.md](references/module-structure.md). Read that file before scaffolding a new module.

Highlights specific to Effect modules:

- Plan/pricing tables and reference data → `Constants.ts`. Pure pricing/lookup helpers → `Helpers.ts`. Event payload `Schema.TaggedClass` instances emitted on a runtime bus → `Events.ts` (sibling to `Service.ts`); plain domain types and schemas without runtime emission stay in `Domain.ts`.
- `Config.ts` is rare — only for env-dependent tunables. Don't create empty/trivial Config.ts files.
- Do not invent new file kinds (`Pricer.ts`, `ModelRegistry.ts`, `Plans.ts`); fold them into the canonical files above.

## `Effect.gen` vs `pipe`

`Effect.gen` is for control flow: branches, loops, conditional yields, business logic with imperative shape. `.pipe(...)` chains read better when the work is a linear transformation (`map`, `flatMap`, `catchTag`, `retry`). Two `yield*` in a row is usually a pipe in disguise.

```typescript
// Branching, multiple decisions: gen reads naturally
const loadUser = Effect.gen(function* () {
  const user = yield* UserRepo.find(id)
  if (user.banned) return yield* new UserBannedError({ id })
  yield* Effect.log(`Found: ${user.name}`)
  return user
})

// Linear transform: pipe reads naturally
const parseJwtClaims = (token: string): Option.Option<JwtClaims> =>
  decodeJwtPayload(token).pipe(
    Option.flatMap(decodeJwtJson),
    Option.flatMap(toJwtClaims),
  )
```

When in doubt, write it as `gen`, then ask if there is branching. If not, switch to `pipe`.

## Repo-Specific Patterns

### `Effect.fn` for Traced Service Methods

`Effect.fn` is the default for service, repo, and policy methods. It auto-creates a named span (format `'ServiceName.methodName'`) and preserves stack traces. Never add `Effect.withSpan` alongside it. Simple read-throughs may use `pipe`; everything multi-step uses `Effect.fn`.

The second and subsequent arguments are pipeline modifiers that transform the resulting effect. Use them to hoist cross-cutting concerns out of the body:

| Modifier | Purpose |
|----------|---------|
| `Effect.scoped` | Auto-scope per call when the body uses scoped resources |
| `Effect.ensuring(finalizer)` | Run cleanup whether the call succeeds, fails, or is interrupted |
| `Effect.provide(layer)` / `Effect.provideService(Tag, value)` | Inject context per call without leaking it to other methods |
| `(effect, ...args) => Effect.annotateLogs(effect, {...})` | Tier-2 log annotations using the call args (only when introducing a new identifier) |

```typescript
// Auto-scope per call
const execute = Effect.fn('AgentTools.execute')(function* (cmd) {
  const handle = yield* spawner.spawn(cmd)
  return yield* handle.all.pipe(Stream.decodeText, Stream.mkString)
}, Effect.scoped)

// Per-call finalizer + log annotation
const trigger = Effect.fn('Reports.trigger')(
  function* (id: AutomationId) {
    return yield* router.dispatchManual(id)
  },
  Effect.ensuring(Effect.log('automation released')),
  (effect, id) => Effect.annotateLogs(effect, { 'automation.id': id }),
)
```

Modifiers compose left to right. Keep the body tight; the signature telegraphs the lifecycle.

### `Effect.fnUntraced` for Inner Generators

`Effect.fn(name)` adds a span. For inner generators that don't deserve their own span (helpers inside a service method, stream pipeline bodies, retry loops), use `Effect.fnUntraced` to skip span creation while keeping the generator-to-effect-factory machinery (currying, second-arg modifiers, return-type pinning):

```typescript
// Boundary, gets a span
const create = Effect.fn('Notes.create')(function* (input: NoteCreateInput) {
  const now = yield* DateTime.now
  return yield* enrich(input, now)
})

// Inner generator inside `create`, no span needed
const enrich = Effect.fnUntraced(function* (
  input: NoteCreateInput,
  now: DateTime.DateTime,
) {
  const slug = yield* slugify(input.title)
  return { ...input, slug, createdAt: now }
})
```

Rule of thumb: anything callable from outside the service module is a boundary and gets `Effect.fn(name)`; everything internal that still wants the factory machinery uses `Effect.fnUntraced`.

**Pin the return type when inference is awkward.** For generators that produce a `Stream`, accumulate complex `R` requirements, or return unions, annotate explicitly with `Effect.fn.Return<A, E, R>`:

```typescript
const make = Effect.fn('Foo.make')(function* (): Effect.fn.Return<
  FooService,
  never,
  Scope.Scope | Database
> {
  // body
})
```

Use only when inference is genuinely unhelpful; most methods don't need this.

### `Effect.Service` Layout

Always declare every dependency in the `dependencies` array — if `Service.Default` has unsatisfied requirements in its `R`, you've leaked a dep. Use `scoped:` (not `effect:`) when the constructor uses `Effect.addFinalizer`, `Effect.acquireRelease`, `Effect.fork`, or `Queue.bounded`.

`Effect.Service` vs `Context.Tag`:

| Case | Choice |
|------|--------|
| Application service with its own constructor logic | `Effect.Service` |
| Resource injected from outside Effect (external runtime bindings, job/task context, host platform bindings) | `Context.Tag` |
| Test seam where consumers provide their own implementation | `Context.Tag` |
| Simple config bag passed through the environment | `Context.Tag` |

Default to `Effect.Service`. Identifier format: `'@<scope>/<pkg>/<Module>'` (matches the package's `name` field) — full table in [conventions.md](references/conventions.md). No `Service` suffix in identifiers.

### Decomposing an oversized service

When one `Effect.Service` outgrows a single responsibility (it trips `no_god_files`, or its members span unrelated concerns), split the internal helpers by concern into their own services and keep the original as a thin facade:

- List the new sub-services in the facade's `dependencies`; `Facade.Default` then wires them transitively, so callers and layer wiring stay unchanged. Keep the facade's returned object byte-identical — re-expose a moved member by binding to the sub-service (`decryptBlob: codec.decrypt`).
- Derive any error type that crossed the old in-file boundary from the new member, never by hand: `type E = Effect.Effect.Error<ReturnType<typeof subService.method>>`. A hand-written union silently drifts when the sub-service's error channel changes.
- A test that wired the monolith via `Service.DefaultWithoutDependencies` + leaf deps must now build each sub-service's `DefaultWithoutDependencies` from the same mocks.

### Bridging to Non-Effect Boundaries

When Effect runs inside non-Effect callbacks (Bun.serve, auth hooks, background job tasks, AI SDK tools), capture the runtime once at startup with `ManagedRuntime.make(...)` or `Effect.runtime()` inside a scoped service. Reuse it across requests. Never call `Effect.runPromise` per request — it creates a fresh runtime, no shared lifecycle, no layer memoization.

### `wrapExternalCall` for Client Packages

Client packages (`@clients/*`) wrap each external call with a shared `wrapExternalCall` helper (`@core/effect/Helpers`). It provides timeout, exponential backoff with jitter, and typed error mapping:

```typescript
import { wrapExternalCall } from '@core/effect/Helpers'

const wrap = <T>(operation: string, fn: () => Promise<T>) =>
  wrapExternalCall(operation, fn, (op, cause) => new MailerError({ operation: op, cause }), {
    timeout: '20 seconds',
    retryCount: 3,
    isRetryable: (e) => e._tag === 'MailerError' && !isAuthError(e),
  })

const send = Effect.fn('MailerClient.send')(function* (params) {
  return yield* wrap('send', () => client.send(params))
})
```

Defaults: 30 s timeout, 3 retries, 100 ms base delay. Pass `isRetryable` to skip auth/permission errors.

### `getOrNotFound` Pattern

Define inside the Service closure so it captures the module's NotFound error type. Every method that resolves a single entity uses it to convert `Option.None` into a typed error:

```typescript
export class Notes extends Effect.Service<Notes>()('@app/api/Notes', {
  dependencies: [NotesRepo.Default],
  effect: Effect.gen(function* () {
    const repo = yield* NotesRepo

    const getOrNotFound = <A>(id: NoteId, result: Option.Option<A>) =>
      Option.match(result, {
        onNone: () => new NoteNotFoundError({ id }),
        onSome: (row) => Effect.succeed(row),
      })

    const get = Effect.fn('Notes.get')(function* (id: NoteId) {
      const row = yield* repo.find(id).pipe(Effect.flatMap((r) => getOrNotFound(id, r)))
      return new Note(row)
    })

	    return { get }
  }),
}) {}
```

### DB → Domain Narrowing

Use `Schema.decode` at the Service boundary; keep the Repo returning raw DB types. The database package must never import from the API/contract layer — the dependency direction flows one way: `database ← domain ← api`.

For partial updates, clean values with `stripUndefined` from `@core/effect/Helpers` before passing to your ORM:

```typescript
import { stripUndefined } from '@core/effect/Helpers'

const now = yield* DateTime.now
yield* db.update(note).set({ ...stripUndefined(values), updatedAt: DateTime.toDateUtc(now) })
```

Always use `DateTime.now` (not `Date.now()`) inside effects — testable via `TestClock`, consistent within a single execution. Convert at the DB boundary with `DateTime.toDateUtc(now)` since most database drivers expect a JS `Date`.

### Tenant-Scoped Tables

Schemas that need tenant isolation use tenant-scoped columns from your database package. Repos backed by these tables inherit the RLS context from the surrounding fiber; do not filter by tenant manually in queries.

## Errors

Errors live in `Errors.ts` at the module level (never in `Domain.ts`). Two categories with different rules:

### Public errors — sent to clients

Declared on API endpoints and serialized via Effect's Schema encoding. **Only Schema fields are serialized** — non-schema class properties never reach the client.

| Error Type | Schema Fields | Status |
|-----------|--------------|--------|
| `<Entity>NotFoundError` | `{ id: EntityId }` | 404 |
| `<Entity><Field>ConflictError` | `{ <field>: FieldType }` | 409 |
| `<Entity>Error` | `{}` | 500 |
| `<Entity>UnavailableError` | `{}` | 503 |

Rules:
- **Schema fields = public contract.** Only put values that are safe for clients.
- **No `message` in Schema for 500/503 errors.** The `_tag` already identifies the error.
- **`cause` is always a non-schema class property** — use the constructor override pattern. Never `Schema.optional(Schema.Unknown)`.

```typescript
class NoteError extends Schema.TaggedError<NoteError>()(
  'NoteError',
  {},
  HttpApiSchema.annotations({ status: 500 })
) {
  declare readonly cause: unknown

  constructor(props: { readonly cause?: unknown }) {
    super(props)
    this.cause = props.cause
  }

  get message() {
    return 'Note error'
  }
}
```

### Internal errors — never leave the server

Used within services, repos, and infrastructure. Carry diagnostic context for logging.

- **The `_tag` is the identity.** No `description` or `message` field needed.
- **Preserve actual Error objects as `cause`** — never serialize to `{ message, stack }`. Loggers walk the JS `.cause` chain only if the chain is intact.

### Client boundary translation

At the HTTP API boundary, internal errors convert to safe public errors in two layers:

1. **`catchDbViolation`** — maps specific constraint violations to domain errors (unique → `ConflictError`).
2. **`catchSqlError`** — catches remaining SQL errors and converts to `InternalError`. **This is the diagnostics catch site.** Log the `SqlError` detail here; do not extend `InternalError` or other shared error classes for diagnostic purposes.
3. **Schema encoding** — any error that reaches `HttpApiBuilder` is encoded using only declared Schema fields. `HttpApiErrorLog` middleware runs **before** serialization, so it sees the full internal cause.

### Minimal diagnostics

At each service boundary that catches a foreign error, attach **one** `Effect.tapErrorCause` plus an `Effect.logError`. Do not use `console.error`. Do not write a `walkCauseChain` helper — the loggers already walk JS `.cause` chains.

### Handling errors

Pick by intent, not by combinator name:

| Intent | Use |
|--------|-----|
| Recover from one tag | `Effect.catchTag('Tag', handler)` |
| Recover from several tags | `Effect.catchTags({ Tag1, Tag2 })` |
| Translate a low-level error to a domain error | `Effect.catchTag` or `Effect.mapError` |
| Retry transient failures | `Effect.retry({ schedule, while: isRetryable })` |
| Let the error propagate | do nothing — keep it in the signature |

**Never:** `Effect.catchAll(() => Effect.succeed(null))` (swallows defects), `Effect.orDie` *mid-pipeline* on a recoverable error (erases the type for callers who could have handled it), `try/catch` inside `Effect.gen` (only catches sync throws). `Effect.orDie` is legitimate at terminal boundaries where any failure must crash; see [error-handling.md](references/error-handling.md#never) for the carve-out. Full decision table: [error-handling.md Decision Guide](references/error-handling.md#decision-guide).

## Effectful Branching

In Effect code, replace early returns and chained ternaries with Effect-native combinators:

| Shape | Use |
|-------|-----|
| Boolean condition with two effect branches | `Effect.if(cond, { onTrue, onFalse })` |
| `Option<A>` | `Option.match(opt, { onNone, onSome })` |
| Tagged union (events, requests, results) | `Match.value(x).pipe(Match.tag(...), Match.exhaustive)` |
| `Exit<A, E>` from `Effect.runFork` / `Effect.runSync` | `Exit.matchEffect(exit, { onSuccess, onFailure })` |

Don't write `if (...) return ...` ladders inside `Effect.gen` to dispatch on tags; use `Match` so all branches share the same effect type and exhaustiveness is checked.

## Observability

`Effect.fn` auto-creates a span; never add `Effect.withSpan` alongside.

| Mechanism | Propagates | Use for |
|-----------|------------|---------|
| `Effect.annotateLogs(effect, { k: v })` | Yes, fiber-scoped | Debugging context: identity, scope IDs. Primary tool. |
| `Effect.annotateCurrentSpan(k, v)` | No, per-span | Tracing dashboard attributes only. |

Annotate a NEW identifier entering scope; skip if a parent boundary already set it. Tier 1 (middleware): `auth.user_id`, `thread.id`, `task.name` once at scope entry. Tier 2 (services): via `Effect.fn`'s second-arg pipeline only when introducing a new identifier (e.g., `automation.id`, `integration.provider`). Repos and policies: no annotations; they inherit via FiberRef. Naming: `<module>.<field>`. See [observability.md](references/observability.md).

## Testing

Co-locate tests in the package's `test/` directory. Use `@effect/vitest` for Effect-aware assertions and `makeTestLayer` from `@tooling/testing/test-layer` to stub services without implementing every method:

```typescript
import { it } from '@effect/vitest'
import { makeTestLayer } from '@tooling/testing/test-layer'

it.effect('creates note', () =>
  Effect.gen(function* () {
    const notes = yield* Notes
    const note = yield* notes.create({ title: 'hi', content: null })
    expect(note.title).toBe('hi')
  }).pipe(Effect.provide(Notes.Default), Effect.provide(testRepoLayer))
)
```

Use `TestClock` for time-dependent effects. See [effect-testing.md](references/effect-testing.md).

## Comment Conventions

### `Effect.Service` classes

Short JSDoc (1-2 lines) describing what the service offers, with an `@errors` tag:

```typescript
/**
 * Manages note CRUD with title uniqueness.
 *
 * @errors NoteNotFoundError, NoteTitleConflictError
 */
export class Notes extends Effect.Service<Notes>()('@app/api/Notes', {
```

### `Effect.fn` methods

Concise JSDoc with `@param`, `@returns`, `@errors`: just enough to understand the interface without reading the body. Keep the summary to one line and tag descriptions short. Never narrate implementation details (delegation chains, error-mapping mechanics, helper names) — the body is right below.

```typescript
/**
 * Creates a note.
 *
 * @param input - Title and optional content.
 * @returns The created note entity.
 * @errors NoteTitleConflictError when the title already exists.
 */
const create = Effect.fn('Notes.create')(function* (input: NoteCreateInput) {
```

### Domain types

Schema classes with `identifier`/`title`/`description` annotations don't need JSDoc. Add JSDoc only for branded types with non-obvious validation.

### Inline comments

The universal inline-comment rule (purposeful, non-obvious WHY, never restate WHAT) lives in `AGENTS.md`. Effect-specific delta: `// why` for non-obvious guards, workarounds, business rules. Never comment standard Effect patterns. TODO format: `// TODO: description`.

## Naming & Signatures

Method names, repo signatures, return types, parameter shapes, domain type naming, schema usage, and `Effect.fn` span format are all in [conventions.md](references/conventions.md). Imports follow the repo's path-alias rules in `AGENTS.md`.

Highlights:
- Singular/plural paradigm: `<verb>` for single, `<verb>Many` for batch.
- `delete` is a reserved word — define as `del`, expose as `delete: del` in the return object.
- Repo `find*` returns `Option` (single) or `Row[]` (multi). Never `null`. Never throws.
- Service `get` fails with `<Entity>NotFoundError`; service `list` returns `PaginatedResult<Entity>`.
- Parameter shape (`input`/`options`, max 2 positional) follows `AGENTS.md`; only the `Input`/`Options` type-suffix conventions are Effect-specific.
- Entity-first type names: `NoteCreateInput`, not `CreateNoteInput`.
- Policy methods mirror service verbs with a `can` prefix.

## Examples & References

| Topic | Where |
|-------|-------|
| Source verification | `vendor/effect-smol` and references in this skill |
| API module (HttpApi + RPC) | [example-api-module](references/example-api-module/) |
| Naming, signatures, span format | [conventions.md](references/conventions.md) |
| Module file structure | [module-structure.md](references/module-structure.md) |
| Core fundamentals | [core-fundamentals](references/core-fundamentals.md) |
| Services & layers | [services-layers](references/services-layers.md) |
| Error handling | [error-handling](references/error-handling.md) |
| HTTP API | [http-api](references/http-api.md) |
| HTTP client | [http-client](references/http-client.md) |
| Schema | [schema](references/schema.md) |
| API modules | [api-modules](references/api-modules.md) |
| Streams | [streams](references/streams.md) |
| SQL | [sql](references/sql.md) |
| Caching | [caching](references/caching.md) |
| Batching | [batching](references/batching.md) |
| Config | [config](references/config.md) |
| Scheduling | [scheduling](references/scheduling.md) |
| Observability | [observability](references/observability.md) |
| Testing | [testing](references/testing.md), [effect-testing](references/effect-testing.md) |
| Concurrency | [concurrency](references/concurrency.md) |
| Resource mgmt | [resource-management](references/resource-management.md) |
| Platform | [platform](references/platform.md) |
| Data types | [data-types](references/data-types.md) |
| Code style | [code-style](references/code-style.md) |
| Sink | [sink](references/sink.md) |
| Client packages | [client-packages](references/client-packages.md) |
| External | [EffectPatterns](https://github.com/PaulJPhilp/EffectPatterns) |
