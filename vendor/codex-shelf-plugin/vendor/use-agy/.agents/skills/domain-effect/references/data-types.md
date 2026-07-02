# Effect Data Types Reference

## Quick Reference

| Type | Purpose | Create | Extract |
|------|---------|--------|---------|
| `Option<A>` | Optional values | `Option.some(v)`, `Option.none()`, `Option.fromNullable(v)` | `Option.getOrElse()`, `Option.match()` |
| `Either<R, L>` | Success/failure | `Either.right(v)`, `Either.left(e)` | `Either.match()`, `Either.isRight()` |
| `Cause<E>` | Rich failure info | `Cause.fail(e)`, `Cause.die(defect)` | `Cause.match()`, `Cause.pretty()` |
| `Exit<A, E>` | Effect outcome | `Exit.succeed(v)`, `Exit.fail(e)` | `Exit.match()`, `Exit.isSuccess()` |
| `Chunk<A>` | Immutable sequence | `Chunk.make()`, `Chunk.fromIterable()` | `Chunk.toReadonlyArray()` |
| `Duration` | Time spans | `Duration.seconds(n)`, `Duration.minutes(n)` | `Duration.toMillis()` |
| `Redacted<A>` | Sensitive values | `Redacted.make(v)`, `Config.redacted()` | `Redacted.value()` |
| `Data.struct` | Value equality | `Data.struct({ ... })` | `Equal.equals()` |

---

## Option

Represents values that may or may not exist. Use instead of `null`/`undefined`.

```typescript
import { Option } from "effect"

Option.some(1)                    // Some(1)
Option.none()                     // None
Option.fromNullable(null)         // None
Option.fromNullable(1)            // Some(1)

Option.map(Option.some(1), n => n + 1)                           // Some(2)
Option.flatMap(Option.some(1), n => Option.some(n * 2))          // Some(2)
Option.filter(Option.some(5), n => n > 3)                        // Some(5)

Option.getOrElse(Option.none(), () => 0)   // 0
Option.getOrThrow(Option.some(10))         // 10
Option.getOrNull(Option.none())            // null

Option.match(option, { onNone: () => "empty", onSome: (v) => `has: ${v}` })

Option.zipWith(Option.some("John"), Option.some(25), (name, age) => ({ name, age }))
Option.all([Option.some(1), Option.some(2)])  // Some([1, 2])

Option.gen(function* () {
  const name = yield* Option.some("John")
  return { name, age: yield* Option.some(25) }
})
```

---

## Either

Discriminated union for success (`Right`) or failure (`Left`).

```typescript
import { Either } from "effect"

Either.right(42)        // Right(42)
Either.left("error")    // Left("error")

if (Either.isRight(value)) console.log(value.right)

Either.map(Either.right(1), n => n + 1)           // Right(2)
Either.mapLeft(Either.left("err"), s => s + "!")  // Left("err!")

Either.match(either, { onLeft: (e) => `Error: ${e}`, onRight: (v) => `Success: ${v}` })

Either.all([Either.right("John"), Either.right(25)])  // Right(["John", 25])

Either.gen(function*() {
  return { name: yield* Either.right("John"), age: yield* Either.right(25) }
})
```

---

## Cause

Captures comprehensive failure information: expected errors, defects, interruptions.

| Type | Constructor | Description |
|------|-------------|-------------|
| `Fail` | `Cause.fail(error)` | Expected errors |
| `Die` | `Cause.die(defect)` | Unexpected defects |
| `Interrupt` | `Cause.interrupt(fiberId)` | Fiber interruptions |

```typescript
import { Cause, Effect } from "effect"

Cause.fail("Connection error")
Cause.die(new TypeError("Cannot read property"))

Cause.match(cause, {
  onEmpty: () => "No error",
  onFail: (error) => `Expected: ${error}`,
  onDie: (defect) => `Unexpected: ${defect}`,
  onInterrupt: (fiberId) => `Interrupted`,
  onSequential: (l, r) => `Sequential`,
  onParallel: (l, r) => `Parallel`
})

Cause.failures(cause)  // Chunk<E> - all expected errors
Cause.defects(cause)   // Chunk<unknown> - all defects
Cause.pretty(cause)    // Human-readable string

const cause = yield* Effect.cause(failedEffect)
Effect.failCause(Cause.fail("error"))
```

---

## Exit

The outcome of an Effect: either a success value or a failure Cause. Use to inspect results without short-circuiting.

```typescript
import { Effect, Exit, Cause } from "effect"

Exit.succeed(42)
Exit.fail("error")
Exit.void                          // Exit.succeed(void)

Exit.isSuccess(exit)               // exit is Exit.Success<A, E>
Exit.isFailure(exit)               // exit is Exit.Failure<A, E>

Exit.match(exit, {
  onSuccess: (value) => `Got: ${value}`,
  onFailure: (cause) => `Failed: ${Cause.pretty(cause)}`
})
```

### Capturing Effect Outcomes

`Effect.exit` converts an effect's result into an `Exit` without short-circuiting the generator:

```typescript
const exit = yield* Effect.exit(riskyEffect)
if (Exit.isFailure(exit)) {
  // ...
}
```

### Exit-Aware Resource Cleanup

Release functions receive the Exit to decide cleanup strategy:

```typescript
Effect.acquireRelease(
  acquireDb,
  (db, exit) => Exit.isFailure(exit) ? rollback(db) : commit(db)
)
```

### Testing with Exit

```typescript
const exit = yield* Effect.exit(myEffect)
expect(Exit.isFailure(exit)).toBe(true)
if (Exit.isFailure(exit)) {
  const error = Cause.failureOption(exit.cause)
  expect(Option.isSome(error)).toBe(true)
}
```

---

## Chunk

Immutable sequence optimized for repeated concatenation. Use for streams.

```typescript
import { Chunk, Equal } from "effect"

Chunk.empty<number>()
Chunk.make(1, 2, 3)
Chunk.fromIterable([1, 2, 3])

Chunk.append(numbers, 4)                              // [1, 2, 3, 4]
Chunk.appendAll(Chunk.make(1, 2), Chunk.make(3, 4))   // [1, 2, 3, 4]
Chunk.drop(Chunk.make(1, 2, 3, 4), 2)                 // [3, 4]
Chunk.take(Chunk.make(1, 2, 3, 4), 2)                 // [1, 2]
Chunk.toReadonlyArray(chunk)

Equal.equals(Chunk.make(1, 2), Chunk.make(1, 2))      // true (structural)
```

---

## Duration

Non-negative time spans for timeouts, delays, scheduling.

```typescript
import { Duration, Effect } from "effect"

Duration.millis(100)
Duration.seconds(2)
Duration.minutes(5)
Duration.hours(7)
Duration.infinity

Duration.decode(1000)          // 1 second (from ms)
Duration.decode("5 minutes")   // 5 minutes

Duration.toMillis(Duration.seconds(5))                        // 5000
Duration.lessThan(Duration.seconds(1), Duration.seconds(2))   // true
Duration.sum(Duration.seconds(30), Duration.seconds(30))      // 60 seconds

Effect.timeout(fetchData, Duration.seconds(30))
```

---

## Redacted

Wraps sensitive values (API keys, tokens, passwords) so they are masked in logs and inspection. Only unwrap at the point of use.

```typescript
import { Redacted, Config, Equivalence } from "effect"

const secret = Redacted.make("sk-abc123")
console.log(secret)                    // <redacted>
console.log(String(secret))            // <redacted>

const raw = Redacted.value(secret)     // "sk-abc123"

const apiKey = Config.redacted("API_KEY")

const eq = Redacted.getEquivalence(Equivalence.string)
eq(Redacted.make("a"), Redacted.make("a"))  // true
```

### With Services

```typescript
readonly apiKey: Redacted.Redacted<string>

headers: { Authorization: `Bearer ${Redacted.value(config.apiKey)}` }
```

See also: `config.md` (Redacted Operations) and `client-packages.md` (Redacted Config).

---

## Data Module

Create data structures with built-in structural equality.

### Value Constructors

```typescript
import { Data, Equal } from "effect"

const alice = Data.struct({ name: "Alice", age: 30 })
Equal.equals(alice, Data.struct({ name: "Alice", age: 30 }))  // true

Data.tuple("a", 1)
Data.array([1, 2, 3])
```

### Case Classes

```typescript
interface Person { readonly name: string; readonly age: number }
const Person = Data.case<Person>()
Person({ name: "Alice", age: 30 })

const User = Data.tagged<{ _tag: "User"; name: string }>("User")
User({ name: "Alice" })  // { _tag: "User", name: "Alice" }

class Person extends Data.Class<{ name: string; age: number }> {}

class User extends Data.TaggedClass("User")<{ name: string }> {}
```

### Tagged Enums

```typescript
type RemoteData = Data.TaggedEnum<{
  Loading: {}
  Success: { readonly data: string }
  Failure: { readonly reason: string }
}>
const { Loading, Success, Failure } = Data.taggedEnum<RemoteData>()
const RemoteData = Data.taggedEnum<RemoteData>()

RemoteData.$is("Success")(value)  // Type guard
RemoteData.$match({ Loading: () => "...", Success: ({ data }) => data, Failure: ({ reason }) => reason })
```

### Tagged Errors

```typescript
class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {
  message: Schema.String,
  file: Schema.String,
}) {}

Effect.gen(function* () {
  yield* new NotFound({ message: "Missing", file: "x.txt" })
}).pipe(Effect.catchTag("NotFound", (err) => Effect.succeed(null)))
```

---

## Type Selection

| Need | Use |
|------|-----|
| Optional value | `Option` |
| Simple success/failure | `Either` |
| Rich error analysis | `Cause` / `Exit` |
| Effect outcome inspection | `Exit` |
| Repeated concatenation | `Chunk` |
| Time spans/timeouts | `Duration` |
| Sensitive values (keys, tokens) | `Redacted` |
| Value equality | `Data.struct` / `Data.Class` |
| Discriminated unions | `Data.TaggedEnum` |
| Custom errors | `Schema.TaggedError` |
