# Effect Error Handling Reference

## Quick Reference

| Pattern | Use Case | Type Change |
|---------|----------|-------------|
| `yield* new MyError()` | Yieldable error in gen | Adds to `E` channel |
| `Effect.catchTag("Tag", handler)` | Handle one error type | Removes `Tag` from `E` |
| `Effect.catchTags({ Tag1: h1, Tag2: h2 })` | Handle multiple types | Removes handled tags |
| `Effect.catchAll(handler)` | Handle all errors | `E` becomes handler's error |
| `Effect.catchSome(handler)` | Selective recovery | Error type unchanged |
| `Effect.catchIf(pred, handler)` | Predicate recovery | Narrows error type |
| `Effect.catchAllCause(handler)` | Handle all causes | `E` becomes handler's error |
| `Effect.retry({ times: 3 })` | Simple retry | No change |
| `Effect.retry(schedule)` | Retry with backoff | No change |
| `Effect.orElse(() => fallback)` | Fallback effect | Unions both error types |
| `Effect.orElseSucceed(() => value)` | Default on failure | `E` becomes `never` |
| `Effect.firstSuccessOf([...])` | Sequential fallback chain | Last effect's error |
| `Effect.either(effect)` | Convert to Either | `E` becomes `never` |
| `Effect.option(effect)` | Errors to None | `E` becomes `never` |
| `Effect.sandbox(effect)` | Expose full Cause | `E` becomes `Cause<E>` |
| `Effect.match(e, {...})` | Pattern match outcomes | Returns pure value |
| `Effect.validate(e1)(e2)` | Accumulate errors | Collects all errors |
| `Effect.validateAll(items, fn)` | All-or-nothing validation | Array of errors |
| `Effect.partition(items, fn)` | Separate successes/failures | `E` becomes `never` |

---

## Decision Guide

Start from intent, not API. "I have an Effect that can fail. What do I want to do?"

| Intent | Use | Effect on error channel |
|--------|-----|-------------------------|
| Recover from one specific tagged error | `Effect.catchTag('Tag', (err) => recovery)` | Removes `Tag` from `E` |
| Recover from several tagged errors at once | `Effect.catchTags({ Tag1: h1, Tag2: h2 })` | Removes handled tags |
| Translate a low-level error to a domain error | `Effect.catchTag('DbError', (e) => new MyError({ cause: e }))` or `Effect.mapError` | Replaces `E` |
| Provide a default when any failure happens | `Effect.orElseSucceed(() => defaultValue)` | `E` becomes `never` |
| Try a fallback Effect when this one fails | `Effect.orElse(() => fallbackEffect)` | Unions both `E` |
| Retry transient failures | `Effect.retry({ schedule, while: isRetryable })` | No change |
| Bound how long a call may run | `Effect.timeoutFail({ duration, onTimeout })` | Adds timeout error |
| Let the error propagate to the caller | Do nothing — keep it in the signature | No change |
| Sandbox to inspect defects + interrupts | `Effect.sandbox` + `Effect.catchTags({ Fail, Die, Interrupt })` | `E` becomes `Cause<E>` |

The `while` predicate runs on every failure and can side-effect. Useful for logging the attempt with context, mutating per-attempt state (resetting an accumulated buffer before re-entering the call), or branching on tag-specific information:

```typescript
let attempt = 0
yield* program.pipe(
  Effect.retry({
    schedule: retryPolicy,
    while: (err) => {
      if (err._tag !== 'TransientError') return false
      attempt++
      // log, mutate buffer, branch on err.reason._tag, etc.
      return true
    },
  }),
)
```

### Never

| Pattern | Why it's wrong | Do instead |
|---------|----------------|-----------|
| `Effect.catchAll(() => Effect.succeed(null))` | Swallows every tag including defects; loses observability; hides upstream bugs | Handle specific tags with `catchTag` / `catchTags`; let the rest propagate |
| `Effect.orDie` / `Effect.orDieWith` *mid-pipeline* | Converts typed failures into defects; fiber crashes, types are erased, traces lose the original `_tag`. Legitimate at terminal boundaries (see carve-out below). | Mid-pipeline: map to a domain error (`Effect.mapError` / `Effect.catchTag`) or track it in the signature |
| `try { ... } catch (e) { ... }` inside `Effect.gen` | Only catches synchronous JS throws; never catches Effect failures — they stay in the error channel | Use `Effect.catchTag` / `catchTags` |
| `Effect.retry(eff, Schedule.forever)` | Unbounded retries hide persistent failures and burn budget | Cap with `Schedule.recurs(n)` or `Schedule.intersect(...)` |
| `Effect.fail('string message')` | Untyped — callers can't discriminate; serialization is ad hoc | `Schema.TaggedError` with named fields |
| `Effect.fail(new Error('...'))` | Same as above — no `_tag`, no structure | `Schema.TaggedError` |

### Quick rule of thumb

1. If the caller should be able to recover, the error stays in the type signature.
2. If the caller never recovers but the error is still *expected* (e.g. a not-found on a well-known ID), map it to the nearest public tagged error at the service boundary.
3. Defects (`Effect.die`) are only for invariants the code can't reach. Never use them to make a typed error "go away."

---

## Yieldable Errors

`Schema.TaggedError` creates yieldable errors that can be yielded directly in `Effect.gen` without wrapping in `Effect.fail`:

```typescript
import { Schema, Effect } from "effect"

class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  url: Schema.String,
  statusCode: Schema.Number,
}) {}

class ValidationError extends Schema.TaggedError<ValidationError>()("ValidationError", {
  field: Schema.String,
  message: Schema.String,
}) {}

class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  resource: Schema.String,
  id: Schema.String,
}) {}

const fetchUser = (id: string): Effect.Effect<User, NetworkError | NotFoundError> =>
  Effect.gen(function* () {
    const response = yield* httpGet(`/users/${id}`)
    if (response.status === 404) {
      yield* new NotFoundError({ resource: "User", id })
    }
    if (response.status >= 500) {
      yield* new NetworkError({ url: `/users/${id}`, statusCode: response.status })
    }
    return response.data
  })

class SimpleError extends Data.Error<{ message: string }> {}

const program = Effect.gen(function* () {
  yield* new SimpleError({ message: "Something went wrong" })
})
```

---

## Effect.fn — Traced Functions

`Effect.fn` is the preferred pattern for all service and repository methods. It automatically creates a span, attaches stack traces, and works as a generator:

```typescript
import { Effect } from "effect"

// Service method — auth.user_id and auth.org_id already in scope from middleware.
// Only annotate if introducing NEW context not in the parent scope.
const create = Effect.fn("Notes.create")(function* (
  input: NoteCreateInput
) {
  yield* Effect.log("Creating note")
  // ... business logic with yield* for each step
  return result
})

const find = Effect.fn("NotesRepo.find")(function* (
  id: NoteId
) {
  const rows = yield* db.select().from(note).where(eq(note.id, id)).limit(1)
  return rows.length > 0 ? Option.some(rows[0]) : Option.none()
})
```

**Prefer `Effect.fn` over manual `Effect.withSpan`** — it combines tracing, stack traces, and generator syntax into one pattern.

---

## Catching Errors

### catchTag - Handle Single Error Type

```typescript
import { Effect, Data } from "effect"

const program: Effect.Effect<string, NetworkError | ValidationError> = // ...

const handled = program.pipe(
  Effect.catchTag("NetworkError", (error) =>
    Effect.succeed(`Recovered from ${error.statusCode}`)
  )
)
// Type: Effect<string, ValidationError>
```

### catchTags - Handle Multiple Types

```typescript
const fullyHandled = program.pipe(
  Effect.catchTags({
    NetworkError: (e) => Effect.succeed(`Network: ${e.statusCode}`),
    ValidationError: (e) => Effect.succeed(`Validation: ${e.message}`)
  })
)
// Type: Effect<string, never>
```

### catchAll - Handle All Errors

```typescript
const recovered = program.pipe(
  Effect.catchAll((error) =>
    Effect.succeed(`Recovered from ${error._tag}`)
  )
)
// Type: Effect<string, never>
```

### catchSome - Selective Recovery

```typescript
import { Option } from "effect"

const selective = program.pipe(
  Effect.catchSome((error) =>
    error._tag === "NetworkError"
      ? Option.some(Effect.succeed("recovered"))
      : Option.none()
  )
)
// Type: Effect<string, NetworkError | ValidationError> (unchanged)
```

### catchIf - Predicate Recovery

```typescript
const conditional = program.pipe(
  Effect.catchIf(
    (error): error is NetworkError => error._tag === "NetworkError",
    (error) => Effect.succeed(`Recovered from ${error.statusCode}`)
  )
)
// Type: Effect<string, ValidationError> (NetworkError removed with type guard)
```

### catchAllCause - Handle All Causes

```typescript
import { Cause } from "effect"

// Handles both expected errors AND defects
const allCauses = program.pipe(
  Effect.catchAllCause((cause) =>
    Cause.isFailType(cause)
      ? Effect.succeed("Recovered from error")
      : Effect.succeed("Recovered from defect")
  )
)
```

---

## Error Matching

Pattern match on success and failure outcomes:

```typescript
import { Effect, Console } from "effect"

// match - handle success/failure, returns pure value
const result = Effect.match(program, {
  onFailure: (error) => `Failed: ${error._tag}`,
  onSuccess: (value) => `Success: ${value}`
})
// Type: Effect<string, never>

// matchEffect - handle with side effects
const withSideEffects = Effect.matchEffect(program, {
  onFailure: (error) =>
    Effect.succeed(`Failed: ${error._tag}`).pipe(
      Effect.tap(() => Console.log("Logging failure"))
    ),
  onSuccess: (value) => Effect.succeed(value)
})

// matchCause - access full Cause structure
const withCause = Effect.matchCause(program, {
  onFailure: (cause) => {
    if (cause._tag === "Die") return `Defect: ${cause.defect}`
    if (cause._tag === "Fail") return `Error: ${cause.error._tag}`
    if (cause._tag === "Interrupt") return "Interrupted"
    return "Unknown cause"
  },
  onSuccess: (value) => `Success: ${value}`
})

// matchCauseEffect - cause access with side effects
const fullMatch = Effect.matchCauseEffect(program, {
  onFailure: (cause) => Console.log(`Cause: ${cause._tag}`),
  onSuccess: (value) => Console.log(`Value: ${value}`)
})

// ignore - discard both success and failure
const ignored = Effect.ignore(program)
// Type: Effect<void, never>
```

---

## Recovery Patterns

### orElse - Fallback Effect Chain

```typescript
import { Effect } from "effect"

const fetchFromPrimary = // Effect that may fail
const fetchFromCache = Effect.succeed({ data: "cached", fromCache: true })

const resilient = fetchFromPrimary.pipe(
  Effect.orElse(() => fetchFromSecondary),
  Effect.orElse(() => fetchFromCache)
)
```

### orElseSucceed - Default Value

```typescript
const withDefault = fetchData.pipe(
  Effect.orElseSucceed(() => ({ items: [], fallback: true }))
)
// Type: Effect<Data, never> - always succeeds
```

### either - Convert to Either

```typescript
import { Either, Effect } from "effect"

const asEither = Effect.either(program)
// Type: Effect<Either<A, E>, never>

const result = Effect.gen(function* () {
  const either = yield* asEither
  return Either.match(either, {
    onLeft: (error) => `Error: ${error._tag}`,
    onRight: (value) => `Success: ${value}`
  })
})
```

### option - Convert Errors to None

```typescript
import { Effect, Option } from "effect"

const asOption = Effect.option(program)
// Type: Effect<Option<A>, never>

const result = Effect.gen(function* () {
  const opt = yield* asOption
  return Option.getOrElse(opt, () => "default")
})
```

### firstSuccessOf - Sequential Fallback Chain

```typescript
const config = Effect.firstSuccessOf([
  loadFromRemote("primary"),
  loadFromRemote("secondary"),
  loadFromCache(),
  loadDefaults()
])
// Returns first success, or final error if all fail
// Execution is sequential, not concurrent
```

---

## Retry Patterns

### Basic Retry

```typescript
import { Effect, Schedule } from "effect"

const withRetry = Effect.retry(unstableEffect, { times: 3 })

const withSchedule = Effect.retry(unstableEffect, Schedule.recurs(5))
```

### Exponential Backoff

```typescript
// 100ms, 200ms, 400ms, 800ms...
const exponential = Schedule.exponential("100 millis")

// With jitter to prevent thundering herd
const jittered = Schedule.jittered(Schedule.exponential("100 millis"))

// Bounded exponential (max 5 retries)
const bounded = Schedule.exponential("100 millis").pipe(
  Schedule.jittered,
  Schedule.intersect(Schedule.recurs(5))
)
```

### Schedule Combinators

| Combinator | Behavior |
|------------|----------|
| `Schedule.recurs(n)` | Retry exactly n times |
| `Schedule.exponential(base)` | Exponential backoff (base * 2^n) |
| `Schedule.spaced(duration)` | Fixed delay between attempts |
| `Schedule.jittered(schedule)` | Add randomness (80-120%) |
| `Schedule.intersect(a, b)` | Both must allow, use longer delay |
| `Schedule.union(a, b)` | Either allows, use shorter delay |

### Conditional Retry

```typescript
const conditionalRetry = Effect.retry(effect, {
  schedule: Schedule.exponential("100 millis").pipe(Schedule.recurs(5)),
  while: (error) => error._tag === "NetworkError" && error.statusCode >= 500
})
```

### Production Retry Pattern

```typescript
import { Effect, Schedule } from "effect"

const productionRetry = <A, E extends { _tag: string }>(
  effect: Effect.Effect<A, E>,
  isRetryable: (error: E) => boolean
) =>
  effect.pipe(
    Effect.retry({
      schedule: Schedule.exponential("100 millis").pipe(
        Schedule.jittered,
        Schedule.intersect(Schedule.recurs(5))
      ),
      while: isRetryable
    }),
    Effect.timeout("30 seconds")
  )

const resilientFetch = productionRetry(
  httpCall,
  (e) => e._tag === "NetworkError"
)
```

---

## Expected Errors vs Defects

| Type | Description | In Type Signature | Recovery |
|------|-------------|-------------------|----------|
| Expected Error | Anticipated failures | Yes (`E` channel) | `catchTag`, `catchAll` |
| Defect | Bugs, unexpected state | No | `catchAllDefect` (rare) |

### Creating Defects

```typescript
const crash = Effect.die(new Error("Invariant violated"))
const crashMsg = Effect.dieMessage("This should never happen")

// Convert errors to defects (use sparingly)
const mustSucceed = riskyOp.pipe(Effect.orDie)
```

### Catching Defects (Boundary Only)

```typescript
const atBoundary = program.pipe(
  Effect.catchAllDefect((defect) => {
    console.error("Unexpected defect:", defect)
    return Effect.fail(new InternalError({ cause: defect }))
  })
)

const specific = program.pipe(
  Effect.catchSomeDefect((defect) => {
    if (Cause.isIllegalArgumentException(defect)) {
      return Option.some(Effect.succeed("recovered"))
    }
    return Option.none()
  })
)
```

---

## Error Structure & Client Boundaries

### Two error categories

**Public errors** — declared on API endpoints, serialized to HTTP/RPC responses. Effect's `HttpApiBuilder` uses Schema encoding: only Schema fields reach the client. Non-schema class properties (`cause`, `stack`) are invisible to the encoder.

**Internal errors** — used within services, repos, infrastructure. Carry diagnostic context for logging but never serialized to clients. The `_tag` identifies the error; `cause` carries the actual Error object for the full cause chain.

### Public error structure

```
Schema fields      →  serialized to HTTP response  →  safe for clients
Class properties   →  never serialized              →  only for logging
```

Rules:
- **Schema fields = public contract.** Every Schema field gets serialized. Only safe values.
- **No `message` in Schema for 500/503 errors.** The `_tag` identifies the error. A schema `message` tempts interpolating internal details that leak to clients.
- **`cause` is ALWAYS non-schema** — use `declare readonly cause: unknown` + constructor override. Never `cause: Schema.optional(Schema.Unknown)`.
- **`stack` never reaches clients** — it's a JS Error property, not a Schema field.

```typescript
import { Schema } from "effect"
import { HttpApiSchema } from "effect/unstable/httpapi"

// 404 — safe identifying fields in schema
class NoteNotFoundError extends Schema.TaggedError<NoteNotFoundError>()(
  "NoteNotFoundError",
  { id: NoteId },
  HttpApiSchema.annotations({ status: 404 })
) {}

// 500 — empty schema, cause is non-schema
class NoteError extends Schema.TaggedError<NoteError>()(
  "NoteError",
  {},
  HttpApiSchema.annotations({ status: 500 })
) {
  declare readonly cause: unknown

  constructor(props: { readonly cause?: unknown }) {
    super(props)
    this.cause = props.cause
  }

  get message() {
    return "Note error"
  }
}
```

### Internal error structure

Internal errors only need `_tag` + `cause`. The tag is the identity — a `DatabaseError` is a database error, no `description` or `message` field needed to restate that.

```typescript
// Internal error — tag + cause, nothing else needed
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown
}> {}

// Wrapping external errors — preserve the actual Error object
const tryDb = <A>(operation: string, query: () => Promise<A>) =>
  Effect.tryPromise({
    try: query,
    catch: (cause) => new DatabaseError({ cause }),
  }).pipe(
    Effect.tapError(() => Effect.logError(`Database operation "${operation}" failed`))
  )
```

**Why preserve actual Error objects:** Loggers (`Cause.pretty()`, `prettyWithCause()`, `formatCauseChain()`) walk the JS Error `.cause` chain. If you serialize to `{ message, stack }`, the chain breaks and nested causes are lost:

```typescript
// BAD — breaks the cause chain, nested causes are lost
catch: (cause) => new MyError({
  cause: cause instanceof Error
    ? { message: cause.message, stack: cause.stack }
    : cause,
})

// GOOD — preserves the full JS Error cause chain
catch: (cause) => new MyError({ cause })
```

### Client boundary translation

At the HTTP API boundary, internal errors must be converted to safe public errors. This happens in layers:

1. **`catchDbViolation`** — maps constraint violations to domain errors (unique → `ConflictError`)
2. **`catchSqlError`** — catches remaining SQL errors → `InternalError` (empty schema, raw cause for logging)
3. **Schema encoding** — `HttpApiBuilder` encodes errors using only declared Schema fields. Non-schema properties stripped.

```typescript
// Service layer: translate internal → public at the boundary
const create = Effect.fn("Notes.create")(function* (input) {
  return yield* repo.insert(input).pipe(
    catchDbViolation({
      onUnique: () => new NoteTitleConflictError({ title: input.title }),
    })
  )
})

const list = Effect.fn("Notes.list")(function* (options) {
  return yield* repo.findMany(options).pipe(catchSqlError("Notes.list"))
})
```

**Logging before serialization:** an error-logging middleware (e.g. `HttpApiErrorLog`, defined in your shared server package) runs **before** Schema encoding. It sees the full error including `cause`, logging the complete cause chain via `prettyWithCause()`. After that, Schema encoding produces the safe client response.

### Anti-patterns

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|-----------------|
| `cause: Schema.optional(Schema.Unknown)` in Schema | Leaks raw errors (including stack) to HTTP responses | Non-schema `cause` via `declare readonly cause: unknown` + constructor |
| `{ message: cause.message, stack: cause.stack }` as cause | Breaks JS Error cause chain, loggers can't walk it | Pass actual Error object: `catch: (cause) => new MyError({ cause })` |
| `message` or `description` in Schema for 500 errors | Tempts interpolating internal details that leak to clients | Empty Schema for 500/503; use `get message()` getter for logs only |
| `description` field on internal errors | Redundant — `_tag` already identifies the error | `_tag` + `cause` is sufficient |
| `new InternalError({ message: sqlError.message })` | SQL details reach client via Schema `message` field | `new InternalError({ cause: sqlError })` — message stays generic |

---

## Sandboxing

Sandboxing exposes the full `Cause<E>` structure, enabling granular error handling:

```typescript
import { Effect, Cause } from "effect"

// sandbox transforms Effect<A, E, R> into Effect<A, Cause<E>, R>
const sandboxed = Effect.sandbox(riskyOperation)

const handled = sandboxed.pipe(
  Effect.catchTags({
    Die: (cause) => Effect.succeed(`Defect: ${cause.defect}`),
    Interrupt: (cause) => Effect.succeed(`Interrupted by: ${cause.fiberId}`),
    Fail: (cause) => Effect.succeed(`Error: ${cause.error._tag}`)
  })
)

const restored = Effect.unsandbox(handled)

const withSandbox = Effect.sandboxWith(riskyOperation, (effect) =>
  effect.pipe(
    Effect.catchTag("Die", () => Effect.succeed("recovered from defect"))
  )
)
```

### Cause Types

| Cause Type | Description | Access |
|------------|-------------|--------|
| `Fail` | Expected error | `cause.error` |
| `Die` | Defect (unexpected) | `cause.defect` |
| `Interrupt` | Fiber interruption | `cause.fiberId` |
| `Sequential` | Combined causes (sequential) | `cause.left`, `cause.right` |
| `Parallel` | Combined causes (parallel) | `cause.left`, `cause.right` |

---

## Timeouts

```typescript
import { Effect, Schema } from "effect"

const withTimeout = longOp.pipe(Effect.timeout("5 seconds"))

class OperationTimeout extends Schema.TaggedError<OperationTimeout>()("OperationTimeout", {
  operation: Schema.String,
}) {}

const customTimeout = longOp.pipe(
  Effect.timeoutFail({
    duration: "5 seconds",
    onTimeout: () => new OperationTimeout({ operation: "fetch" })
  })
)
```

---

## Error Aggregation

By default, Effect uses fail-fast: execution halts on first error. These functions collect errors instead:

```typescript
import { Effect } from "effect"

const validated = Effect.all(validations, { mode: "validate" })

const [failures, successes] = yield* Effect.partition(items, process)
// Type: [E[], A[]]
```

### validate - Chain with Error Accumulation

```typescript
const validated = task1.pipe(
  Effect.validate(task2),
  Effect.validate(task3),
  Effect.validate(task4)
)
// All tasks run, errors are collected
```

### validateAll - All-or-Nothing

```typescript
const allOrNothing = Effect.validateAll([1, 2, 3, 4, 5], (n) =>
  n < 4 ? Effect.succeed(n) : Effect.fail(`invalid: ${n}`)
)
// If any fail: all errors collected, successes discarded
// If all succeed: array of successes
```

### validateFirst - First Success Wins

```typescript
const firstValid = Effect.validateFirst(configs, loadConfig)
// Tries each config, returns first success
// If all fail: array of all errors
```

### partition - Separate Successes and Failures

```typescript
const [failures, successes] = yield* Effect.partition(
  items,
  processItem,
  { concurrency: "unbounded" }
)
// Type: [E[], A[]] - no error channel
```

### Comparison

| Function | Fail-Fast | Behavior | Error Type |
|----------|-----------|----------|------------|
| `Effect.all` | Yes | Stops on first error | Single error |
| `Effect.all({ mode: "validate" })` | No | Collects all errors | Array of errors |
| `Effect.validate` | No | Chain effects, collect errors | Combined errors |
| `Effect.validateAll` | No | All-or-nothing | Array of errors |
| `Effect.validateFirst` | No | First success wins | Array of errors |
| `Effect.partition` | No | Separate results | Never (always succeeds) |

---

## Anti-Patterns

| Anti-Pattern | Problem | Better Approach |
|--------------|---------|-----------------|
| `Effect.catchAll(() => Effect.succeed(null))` | Swallows all errors | Use `catchTag` for specific errors |
| `Effect.fail("error string")` | No type safety | Use `Schema.TaggedError` |
| `Effect.retry(e, Schedule.forever)` | Infinite retries | Bound with `Schedule.recurs` |
| `fetchUser(id).pipe(Effect.orDie)` | Hides expected errors as defects | Handle with `catchTag` or let propagate |
| `repo.query().pipe(Effect.orDie)` | Converts SqlError to defect, losing type safety | Map to domain error at service level |
| `try/catch` in `Effect.gen` | Won't catch Effect errors | Use Effect error combinators |

### NEVER use `Effect.orDie` mid-pipeline

`Effect.orDie` converts typed errors into defects (uncaught exceptions), destroying the type safety that Effect provides. This is an anti-pattern when used mid-pipeline to silence a recoverable error a caller could have handled. See the terminal-boundary carve-out below for the legitimate exception.

**Especially for SQL errors:** When a repo call returns `Effect<A, SqlError>`, handle the `SqlError` in the service layer (map it to a domain error such as `NotFoundError` / `ConflictError`, or let it propagate as a typed error so callers know what can fail). Never use `orDie` to make a recoverable error disappear.

```typescript
// BAD — hides SqlError as a defect
const getUser = (id: string) =>
  repo.find(id).pipe(Effect.orDie)

// GOOD — maps to domain error
const getUser = (id: string) =>
  repo.find(id).pipe(
    Effect.flatMap(Option.match({
      onNone: () => new UserNotFoundError({ id }),
      onSome: Effect.succeed,
    }))
  )

// ALSO GOOD — let SqlError propagate in the type signature
const getUser = (id: string): Effect<User, SqlError | UserNotFoundError> =>
  repo.find(id).pipe(/* ... */)
```

### `Effect.orDie` at terminal boundaries (the carve-out)

Use `Effect.orDie` deliberately at terminal sites where any failure must crash because there is no caller to recover. Examples:

- Stream collection inside a fork-and-forget background fiber where the consumer terminates on any error.
- Sandbox or scope cleanup that runs after main work has completed.
- Bridging into an imperative callback (queue offer, sandbox VM exit) that has no error channel.

If the error has nowhere meaningful to go, `orDie` is the honest expression of that. The anti-pattern is using `orDie` mid-pipeline to silence an error a caller would have handled.

```typescript
// Legitimate: subagent stream collection in a forked fiber.
// Recoverable errors have already been caught above; anything left is a bug.
return yield* stream.pipe(
  Stream.runForEachChunk(handle),
  Effect.catchTag('AgentFinished', (f) => Effect.succeed(f.summary)),
  Effect.orDie,
)
```
