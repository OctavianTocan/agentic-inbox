# Effect-TS Anti-Pattern Catalog

Concrete wrong/right pairs sourced from project references and vendor Effect source. Each entry is independently actionable. No preamble — start using.

---

## 1. `yield` without the asterisk loses the value

```ts
// Wrong
const program = Effect.gen(function* () {
  const user = yield fetchUser(id)  // returns Effect<User>, not User
  return user.name
})
```

```ts
// Right
const program = Effect.gen(function* () {
  const user = yield* fetchUser(id)
  return user.name
})
```

**Why:** `yield` without `*` passes the Effect object to the generator protocol unchanged; `yield*` delegates iteration, unwrapping the Effect value.

**Source:** `vendor/effect-smol/packages/effect/src/Effect.ts` (`Effect.fn`/gen contract) · `.agents/skills/domain-effect/references/core-fundamentals.md`

---

## 2. Using `Effect.fail("string")` instead of `Schema.TaggedErrorClass`

```ts
// Wrong
const getUser = (id: string) =>
  Effect.fail("user not found")  // no tag, no structure
```

```ts
// Right
class UserNotFoundError extends Schema.TaggedErrorClass<UserNotFoundError>()(
  "UserNotFoundError", { id: Schema.String }
) {}

const getUser = (id: string) =>
  Effect.fail(new UserNotFoundError({ id }))
```

**Why:** Untyped string failures cannot be `catchTag`'d, serialized to HTTP responses, or discriminated by callers; `Schema.TaggedErrorClass` gives a `_tag`, typed fields, and yieldable syntax.

**Source:** `vendor/effect-smol/packages/effect/src/Schema.ts:12653` (`TaggedErrorClass`) · `.agents/skills/domain-effect/references/error-handling.md`

---

## 3. Using `Effect.fn` where only `Effect.fnUntraced` is needed for inner helpers

```ts
// Wrong
const enrich = Effect.fn("Notes.enrich")(function* (
  input: NoteCreateInput, now: DateTime.DateTime
) {
  return { ...input, slug: yield* slugify(input.title), createdAt: now }
})
```

```ts
// Right
const enrich = Effect.fnUntraced(function* (
  input: NoteCreateInput, now: DateTime.DateTime
) {
  return { ...input, slug: yield* slugify(input.title), createdAt: now }
})
```

**Why:** `Effect.fn(name)` creates a trace span on every invocation; helpers that are only called from within a traced boundary pollute the trace tree with noise spans.

**Source:** `vendor/effect-smol/packages/effect/src/Effect.ts:13510` (`fnUntraced`) · `.agents/skills/domain-effect/SKILL.md` ("Effect.fnUntraced for Inner Generators")

---

## 4. Adding `Effect.withSpan` alongside `Effect.fn`

```ts
// Wrong
const create = Effect.fn("Notes.create")(function* (input: NoteCreateInput) {
  return yield* repo.insert(input)
}).pipe(Effect.withSpan("Notes.create"))
```

```ts
// Right
const create = Effect.fn("Notes.create")(function* (input: NoteCreateInput) {
  return yield* repo.insert(input)
})
```

**Why:** `Effect.fn(name)` auto-creates a named span; wrapping it again with `withSpan` produces a duplicate nested span and clutters traces.

**Source:** `vendor/effect-smol/packages/effect/src/Effect.ts:13629` (`Effect.fn`) · `.agents/skills/domain-effect/references/observability.md`

---

## 5. Closing the constructor's scope with `Effect.scoped` so the finalizer runs before the service is used

```ts
// Wrong
const DatabaseLayer = Layer.effect(Database, Effect.gen(function* () {
  const pool = yield* Effect.tryPromise(() => createPool())
  yield* Effect.addFinalizer(() => Effect.promise(() => pool.end()))
  return { query: (sql: string) => Effect.tryPromise(() => pool.query(sql)) }
}).pipe(Effect.scoped))  // closes the scope immediately → pool.end() runs at construction
```

```ts
// Right
const DatabaseLayer = Layer.effect(Database, Effect.gen(function* () {
  const pool = yield* Effect.tryPromise(() => createPool())
  yield* Effect.addFinalizer(() => Effect.promise(() => pool.end()))
  return { query: (sql: string) => Effect.tryPromise(() => pool.query(sql)) }
}))
```

**Why:** In v4 `Layer.scoped` no longer exists — `Layer.effect` runs its constructor inside the layer's own managed `Scope`, so `Effect.addFinalizer` / `acquireRelease` work directly and the finalizer runs when the layer is released. Wrapping the constructor in `Effect.scoped` opens and immediately closes a *nested* scope, firing `pool.end()` at construction time so the service hands back an already-closed pool. Let `Layer.effect`'s scope own the finalizer; never `Effect.scoped` the constructor.

**Source:** `vendor/effect-smol/packages/effect/src/Layer.ts:974` (`Layer.effect` — runs in the layer's `Scope`) · `vendor/effect-smol/packages/effect/src/Effect.ts:6379` (`Effect.scoped`), `6678` (`addFinalizer`) · `vendor/effect-smol/migration/v3-to-v4.md` (`Layer.scoped -> Layer.effect`)

---

## 6. `Context.Service` with `make` but no explicit `layer`, when the constructor forks or acquires resources

```ts
// Wrong
class WorkerService extends Context.Service<WorkerService>()(
  "@apps/api/Worker",
  {
    make: Effect.gen(function* () {
      const fiber = yield* Effect.fork(worker())
      yield* Effect.addFinalizer(() => Fiber.interrupt(fiber))
      return { enqueue: (task: Task) => Queue.offer(queue, task) }
    }),
  }
) {}
// No layer defined — nothing runs `make` inside a managed scope, so the
// fork/finalizer have no scope to close them and callers can't provide the service.
```

```ts
// Right
class WorkerService extends Context.Service<WorkerService>()(
  "@apps/api/Worker",
  {
    make: Effect.gen(function* () {
      const fiber = yield* Effect.fork(worker())
      yield* Effect.addFinalizer(() => Fiber.interrupt(fiber))
      return { enqueue: (task: Task) => Queue.offer(queue, task) }
    }),
  }
) {
  static readonly layer = Layer.effect(this, this.make)
}
```

**Why:** In v4 `Context.Service({ make })` stores the constructor effect but does **not** auto-generate a layer (there is no `scoped:`/`effect:` key and no `.Default`). You must define the layer explicitly with `Layer.effect`, which runs `make` inside the layer's managed `Scope` — so `fork`, `addFinalizer`, and `acquireRelease` are owned by that scope and released when the layer is. Skip the explicit `layer` and the service is both unprovidable and leaks its forked fiber.

**Source:** `vendor/effect-smol/migration/services.md` ("`Effect.Service` → `Context.Service` with `make`") · `vendor/effect-smol/packages/effect/src/Layer.ts:974` (`Layer.effect`) · `vendor/effect-smol/packages/effect/src/Context.ts:200` (`Service`)

---

## 7. `Layer.merge` when one layer depends on the other (should use `Layer.provide`)

```ts
// Wrong
const AppLayer = Layer.merge(ConfigLive, DatabaseLive)
```

```ts
// Right
const AppLayer = Layer.provide(DatabaseLive, ConfigLive)
// Or: DatabaseLive.pipe(Layer.provide(ConfigLive))
```

**Why:** `Layer.merge` outputs the union of two independent layers with no dependency wiring; `Layer.provide(consumer, provider)` satisfies the consumer's requirements from the provider.

**Source:** `vendor/effect-smol/packages/effect/src/Layer.ts:1245` (`merge`) and `1375` (`provide`)

---

## 8. `Layer.provide` when the caller also needs the dependency (`Layer.provideMerge`)

```ts
// Wrong
const AppLayer = Layer.provide(DatabaseLive, ConfigLive)
// Config is no longer available downstream
```

```ts
// Right
const AppLayer = Layer.provideMerge(DatabaseLive, ConfigLive)
// Type: Layer<Database | Config, never, never>
```

**Why:** `Layer.provide` removes the provider's output from the result type; `Layer.provideMerge` keeps it available so downstream layers can also depend on it.

**Source:** `vendor/effect-smol/packages/effect/src/Layer.ts:1490` (`provideMerge`) · `.agents/skills/domain-effect/references/services-layers.md`

---

## 9. `Effect.orDie` mid-pipeline to silence a recoverable typed error

```ts
// Wrong
const getUser = (id: UserId): Effect.Effect<User> =>
  repo.find(id).pipe(Effect.orDie)
```

```ts
// Right
const getUser = (id: UserId): Effect.Effect<User, UserNotFoundError> =>
  repo.find(id).pipe(
    Effect.flatMap(Option.match({
      onNone: () => new UserNotFoundError({ id }),
      onSome: Effect.succeed,
    }))
  )
```

**Why:** `orDie` turns a typed failure into an uncatchable defect, destroying type safety; callers who could have recovered (e.g. returning a 404) now crash instead.

**Source:** `vendor/effect-smol/packages/effect/src/Effect.ts:3616` (`orDie`) · `.agents/skills/domain-effect/references/error-handling.md` ("NEVER use Effect.orDie mid-pipeline")

---

## 10. `Effect.catch` swallowing every error including unexpected ones

```ts
// Wrong
const result = program.pipe(
  Effect.catch(() => Effect.succeed(null))
)
```

```ts
// Right
const result = program.pipe(
  Effect.catchTag("UserNotFoundError", () => Effect.succeed(null))
)
```

**Why:** `catch` (v3 `catchAll`) catches every failure including programming errors and infrastructure faults, making bugs invisible; `catchTag` is surgical and preserves the remaining error channel.

**Source:** `vendor/effect-smol/packages/effect/src/Effect.ts:2650` (`catch`) and `2697` (`catchTag`) · `.agents/skills/domain-effect/references/error-handling.md`

---

## 11. `try/catch` inside `Effect.gen` to handle Effect failures

```ts
// Wrong
const program = Effect.gen(function* () {
  try {
    const user = yield* fetchUser(id)
    return user
  } catch (e) {
    return null  // Never reached for Effect failures
  }
})
```

```ts
// Right
const program = fetchUser(id).pipe(
  Effect.catchTag("UserNotFoundError", () => Effect.succeed(null))
)
```

**Why:** Effect failures travel through the error channel, not as JS exceptions; `try/catch` only intercepts synchronous throws, so Effect errors silently escape.

**Source:** `.agents/skills/domain-effect/references/error-handling.md` ("Never" table)

---

## 12. `Schema.Struct` for an exported domain model (should be `Schema.Class`)

```ts
// Wrong
export const NoteCreateInput = Schema.Struct({
  title: Schema.NonEmptyString,
  body: Schema.String,
})
export type NoteCreateInput = Schema.Schema.Type<typeof NoteCreateInput>
```

```ts
// Right
export class NoteCreateInput extends Schema.Class<NoteCreateInput>("NoteCreateInput")({
  title: Schema.NonEmptyString,
  body: Schema.String,
}) {}
```

**Why:** `Schema.Struct` creates an anonymous type without `identifier`/`title`/`description`; exported inputs used on API endpoints need `Schema.Class` so they produce `$ref` entries in OpenAPI.

**Source:** `vendor/effect-smol/packages/effect/src/Schema.ts:12477` (`Class`) · `.agents/skills/domain-effect/references/conventions.md` ("Schema Type Usage")

---

## 13. `Schema.optional(Schema.Unknown)` for `cause` in a public error (leaks internals to HTTP)

```ts
// Wrong
class OrderError extends Schema.TaggedErrorClass<OrderError>()("OrderError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),   // serialized!
}) {}
```

```ts
// Right
class OrderError extends Schema.TaggedErrorClass<OrderError>()(
  "OrderError", {},
  { httpApiStatus: 500 }
) {
  declare readonly cause: unknown
  constructor(props: { readonly cause?: unknown }) {
    super(props)
    this.cause = props.cause
  }
}
```

**Why:** Every Schema field is encoded by the HttpApi builder; an `Unknown` cause field can serialize raw Error objects including stack traces to HTTP clients. In v4 the HTTP status is an annotation on the schema (`{ httpApiStatus: 500 }`, the third arg of `TaggedErrorClass`, equivalently `HttpApiSchema.status(500)`).

**Source:** `.agents/skills/domain-effect/references/error-handling.md` ("Public error structure") · `vendor/effect-smol/packages/effect/src/unstable/httpapi/HttpApiSchema.ts:160` (`status` → `httpApiStatus`) · `vendor/effect-smol/packages/effect/src/Schema.ts:12653` (`TaggedErrorClass` annotations arg)

---

## 14. `new Error(cause.message)` as cause instead of the original Error object

```ts
// Wrong
const query = Effect.tryPromise({
  try: () => db.execute(sql),
  catch: (e) => new DatabaseError({
    cause: e instanceof Error ? new Error(e.message) : e
  }),
})
```

```ts
// Right
const query = Effect.tryPromise({
  try: () => db.execute(sql),
  catch: (cause) => new DatabaseError({ cause }),
})
```

**Why:** Reconstructing an `Error` from `.message` drops the original stack and any nested `.cause` chain; Effect's `Cause.pretty()` and logger formatters depend on the actual Error object.

**Source:** `.agents/skills/domain-effect/references/error-handling.md` ("BAD — breaks the cause chain")

---

## 15. `Effect.retry(effect, Schedule.forever)` without a cap

```ts
// Wrong
const result = Effect.retry(callExternalApi(), Schedule.forever)
```

```ts
// Right
const result = Effect.retry(callExternalApi(), {
  schedule: Schedule.exponential("100 millis").pipe(
    Schedule.jittered,
    Schedule.intersect(Schedule.recurs(5))
  ),
  while: (e) => e._tag === "NetworkError",
})
```

**Why:** `Schedule.forever` has no upper bound; a persistent external failure will retry indefinitely until the process is killed or the error budget is exhausted.

**Source:** `vendor/effect-smol/packages/effect/src/Schedule.ts:3363` (`forever`) and `2491` (`recurs`) · `.agents/skills/domain-effect/references/error-handling.md` ("Never" table)

---

## 16. `Effect.forEach` without a concurrency option running tasks sequentially

```ts
// Wrong
const results = yield* Effect.forEach(userIds, (id) => fetchProfile(id))
```

```ts
// Right
const results = yield* Effect.forEach(
  userIds,
  (id) => fetchProfile(id),
  { concurrency: 10 }
)
```

**Why:** `Effect.forEach` defaults to sequential execution; large collections will take N×latency time without `{ concurrency: N }` or `"unbounded"`.

**Source:** `vendor/effect-smol/packages/effect/src/Effect.ts:773` (`forEach`) · `.agents/skills/domain-effect/references/concurrency.md`

---

## 17. `Effect.runPromise` inside a non-Effect callback for every request

```ts
// Wrong
app.post("/webhook", async (req, res) => {
  const result = await Effect.runPromise(
    handleWebhook(req.body).pipe(Effect.provide(AppLayer))
  )
  res.json(result)
})
```

```ts
// Right
const runtime = ManagedRuntime.make(AppLayer)

app.post("/webhook", async (req, res) => {
  const result = await runtime.runPromise(handleWebhook(req.body))
  res.json(result)
})
```

**Why:** `Effect.runPromise` with an inline `provide` reconstructs the layer graph on every call — no memoization, no shared connections, no cleanup on shutdown.

**Source:** `vendor/effect-smol/packages/effect/src/ManagedRuntime.ts:273` (`make`) · `.agents/skills/domain-effect/SKILL.md` ("Bridging to Non-Effect Boundaries")

---

## 18. Plain `Context.Service` (no `make`) for an application service that has constructor logic

```ts
// Wrong
class NotesService extends Context.Service<NotesService, {
  get: (id: NoteId) => Effect.Effect<Note, NoteNotFoundError>
}>()("@apps/api/Notes") {}
// No constructor stored — must hand-write Layer.effect(NotesService, ...) elsewhere
```

```ts
// Right
class NotesService extends Context.Service<NotesService>()(
  "@apps/api/Notes",
  {
    make: Effect.gen(function* () {
      const repo = yield* NotesRepo
      return { get: Effect.fn("Notes.get")(function* (id: NoteId) { /* ... */ }) }
    }),
  }
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(NotesRepo.layer)
  )
}
```

**Why:** In v4 both v3's `Context.Tag` and `Effect.Service` become `Context.Service`. The bare `Context.Service<Self, Shape>()("Id")` form is for external resources or test seams with no constructor; an application service with its own constructor logic should use the `{ make }` form so the constructor is collocated on the class, then define the explicit `layer` (deps wired via `Layer.provide` — there is no `dependencies` option in v4).

**Source:** `vendor/effect-smol/migration/services.md` ("`Effect.Service` → `Context.Service` with `make`") · `vendor/effect-smol/packages/effect/src/Context.ts:200` (`Service`)

---

## 19. `Option` returned from a repo used directly without converting to a domain error at the service boundary

```ts
// Wrong
const get = Effect.fn("Notes.get")(function* (id: NoteId) {
  return yield* repo.find(id)  // Option<NoteRow>
})
```

```ts
// Right
const getOrNotFound = <A>(id: NoteId, result: Option.Option<A>) =>
  Option.match(result, {
    onNone: () => new NoteNotFoundError({ id }),
    onSome: (row) => Effect.succeed(row),
  })

const get = Effect.fn("Notes.get")(function* (id: NoteId) {
  const row = yield* repo.find(id).pipe(Effect.flatMap((r) => getOrNotFound(id, r)))
  return new Note(row)
})
```

**Why:** `Option` is a repo-layer convention; callers of the service expect a `NotFoundError` in the typed error channel, not an `Option` to manually unwrap.

**Source:** `.agents/skills/domain-effect/SKILL.md` ("getOrNotFound Pattern") · `.agents/skills/domain-effect/references/conventions.md`

---

## 20. Reaching for `it.scoped` (removed in v4) for tests that use `acquireRelease` / scoped resources

```ts
// Wrong
it.scoped("uploads a file", () =>      // it.scoped does not exist in v4
  Effect.gen(function* () {
    const handle = yield* Effect.acquireRelease(openFile(path), close)
    expect(yield* handle.read()).toBe("content")
  })
)
```

```ts
// Right
it.effect("uploads a file", () =>
  Effect.gen(function* () {
    const handle = yield* Effect.acquireRelease(openFile(path), close)
    expect(yield* handle.read()).toBe("content")
  })
)
```

**Why:** In v4 `it.scoped` is gone — `it.effect` (and `it.live`) already run the test inside a managed `Scope` (their tester type is `Tester<Scope.Scope>`), so `acquireRelease` / `addFinalizer` work directly under `it.effect`. There is no longer a separate scoped tester to reach for.

**Source:** `vendor/effect-smol/packages/vitest/src/index.ts:169` (`effect` — `Tester<Scope.Scope>`) and `174` (`live` — `Tester<Scope.Scope>`); `internal/internal.ts:357` wraps the tester in `Effect.scoped` · `.agents/skills/domain-effect/references/testing.md`

---

## 21. `it.live` for tests that only need deterministic time control

```ts
// Wrong
it.live("retries after delay", () =>
  Effect.gen(function* () {
    yield* Effect.sleep("2 seconds")  // actually waits 2 s
    expect(callCount).toBe(2)
  })
)
```

```ts
// Right
it.effect("retries after delay", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(retryingOp)
    yield* TestClock.adjust("2 seconds")
    expect(yield* Fiber.join(fiber)).toBe(2)
  })
)
```

**Why:** `it.live` replaces TestClock with the real clock so `Effect.sleep` blocks for real time; `it.effect` provides `TestClock` which lets you advance time without waiting.

**Source:** `vendor/effect-smol/packages/vitest/src/index.ts:174` (`live` — `Tester<Scope.Scope>`) · `.agents/skills/domain-effect/references/testing.md`

---

## 22. Leaking `Requirements` in a service interface

```ts
// Wrong
interface UserRepoService {
  findById: (id: string) => Effect.Effect<User, SqlError, Logger | Database>
}
```

```ts
// Right
interface UserRepoService {
  findById: (id: string) => Effect.Effect<User, SqlError>
}
// Dependencies are captured at Layer construction, not in the interface
```

**Why:** Requirements in method return types leak the service's internal dependencies to all callers, violating encapsulation; dependencies are injected at layer construction time and must not appear in the public interface.

**Source:** `.agents/skills/domain-effect/references/services-layers.md` ("Common Mistakes: Leaking dependencies in interface")

---

## 23. Not wiring a dependency into the explicit `layer` via `Layer.provide`

```ts
// Wrong
class ApiClient extends Context.Service<ApiClient>()(
  "@apps/api/ApiClient",
  {
    make: Effect.gen(function* () {
      const config = yield* AppConfig   // requires AppConfig
      return { fetch: (path: string) => Effect.tryPromise(() => fetch(config.baseUrl + path)) }
    }),
  }
) {
  static readonly layer = Layer.effect(this, this.make)
  // AppConfig left unsatisfied → ApiClient.layer is Layer<ApiClient, never, AppConfig>
}
```

```ts
// Right
class ApiClient extends Context.Service<ApiClient>()(
  "@apps/api/ApiClient",
  {
    make: Effect.gen(function* () {
      const config = yield* AppConfig
      return { fetch: (path: string) => Effect.tryPromise(() => fetch(config.baseUrl + path)) }
    }),
  }
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(AppConfig.layer)
  )
}
```

**Why:** v4 dropped the `dependencies` option. `make` reads `AppConfig`, so `Layer.effect(this, this.make)` produces `Layer<ApiClient, never, AppConfig>` — an unsatisfied requirement that callers must provide manually. Wire the dependency into the layer with `Layer.provide` to get a self-contained `Layer<ApiClient>`.

**Source:** `vendor/effect-smol/migration/services.md` ("The `dependencies` option no longer exists. Wire dependencies via `Layer.provide`") · `.agents/skills/domain-effect/references/services-layers.md`

---

## 24. `Stream.runDrain` when side effects need per-element error handling (`Stream.runForEach`)

```ts
// Wrong
yield* emailStream.pipe(Stream.runDrain)
```

```ts
// Right
yield* emailStream.pipe(
  Stream.runForEach((email) =>
    sendEmail(email).pipe(
      Effect.tapError((e) => Effect.logError(`Failed: ${email.to}`, e)),
      Effect.ignore
    )
  )
)
```

**Why:** `runDrain` executes effects for their side effects but provides no callback for each element's result; `runForEach` accepts an element handler so per-item errors and results can be observed.

**Source:** `vendor/effect-smol/packages/effect/src/Stream.ts:11005` (`runDrain`) and `10866` (`runForEach`)

---

## 25. `Cache.make` with a `capacity` so small it evicts entries before they are useful

```ts
// Wrong
const cache = yield* Cache.make({
  capacity: 1,
  timeToLive: Duration.minutes(5),
  lookup: (userId: UserId) => fetchUserProfile(userId),
})
```

```ts
// Right
const cache = yield* Cache.make({
  capacity: 1_000,
  timeToLive: Duration.minutes(5),
  lookup: (userId: UserId) => fetchUserProfile(userId),
})
```

**Why:** `Cache` uses a LRU eviction policy; a capacity smaller than the number of unique hot keys causes constant cache misses and defeats thundering-herd protection.

**Source:** `vendor/effect-smol/packages/effect/src/Cache.ts:271` (`make`) · `.agents/skills/domain-effect/references/caching.md`
