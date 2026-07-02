# Effect Observability Reference

## Tiered Annotation Strategy (Monorepo Convention)

`Effect.fn` auto-creates spans; annotations add context. The SKILL.md summary links here for the full rules.

### Tier 1 — Scope-level annotations

Set once at entry boundaries; every downstream log inherits.

| Scope | Where to set | Annotations |
|-------|-------------|-------------|
| Auth | Auth middleware / service | `auth.user_id`, `auth.org_id` |
| Agent turn | Turn scope creation | `thread.id` |
| Background job | Task wrapper | `task.name`, `task.run_id` |

```typescript
const withAuthLogs = (auth: Auth) =>
  Effect.annotateLogs({
    'auth.user_id': auth.user.id,
    'auth.org_id': auth.tenant.organization.id,
  })
```

### Tier 2 — Scope-entering annotations

When a method introduces a NEW identifier not already in scope, annotate via the `Effect.fn` pipeline second argument.

```typescript
const trigger = Effect.fn('Reports.trigger')(
  function* (id: AutomationId) {
    return yield* router.dispatchManual(id)
  },
  (effect, id) => Effect.annotateLogs(effect, { 'automation.id': id })
)

const startOAuth = Effect.fn('IntegrationOAuth.start')(
  function* (provider: ProviderId, redirectUrl: string) {
    return yield* resolveProvider(provider).pipe(Effect.flatMap((p) => p.authorize(redirectUrl)))
  },
  (effect, provider) => Effect.annotateLogs(effect, { 'integration.provider': provider })
)
```

### Tier 3 — Skip

```typescript
const append = Effect.fn('Messages.append')(function* (input: {
  readonly messages: ReadonlyArray<MessageInput>
}) {
  return yield* repo.insert(input)
})

const get = Effect.fn('Notes.get')(function* (id: NoteId) {
  const row = yield* repo.find(id).pipe(Effect.flatMap((r) => getOrNotFound(id, r)))
  return new Note(row)
})
```

### Where to annotate by layer

| Layer | Strategy |
|-------|----------|
| Middleware / scope entry | `Effect.annotateLogs` — Tier 1 scope context |
| Services | Tier 2 only — new identifiers not in scope |
| Client packages | `Effect.annotateLogs` via pipeline — external resource IDs (`mailer.recipient`) |
| Repos | No annotations — inherit from callers via FiberRef |
| Policies | No annotations — inherit from callers via FiberRef |

### Client package example

```typescript
const send = Effect.fn('MailerClient.send')(
  function* (params: SendArgs) {
    return yield* wrap('send', () => client.messages.send(params))
  },
  (effect, params) => Effect.annotateLogs(effect, { 'mailer.recipient': params.to })
)
```

**Decision heuristic:** before adding an annotation, ask whether the identifier is already in scope from a parent boundary. If yes, skip it. Only annotate what's NEW.

---

## Quick Reference

| Function | Purpose |
|----------|---------|
| `Effect.log(msg)` | Log at INFO level with fiber context |
| `Effect.logDebug/Warning/Error(msg)` | Log at specific levels |
| `Effect.annotateLogs(k, v)` | Add context to all logs in scope |
| `Effect.withSpan(name)` | Create trace span |
| `Effect.annotateCurrentSpan(k, v)` | Add span attribute |
| `Metric.counter(name)` | Cumulative count |
| `Metric.gauge(name)` | Point-in-time value |
| `Metric.histogram(name, bounds)` | Distribution |
| `Effect.tap/tapError(fn)` | Debug without modifying result |

---

## Preferred Tracing: Effect.fn

`Effect.fn` automatically creates spans — prefer it over manual `Effect.withSpan` for service and repo methods:

```typescript
// PREFERRED: Effect.fn auto-creates "Notes.create" span
const create = Effect.fn("Notes.create")(
  function* (userId: string, input: CreateNote) {
    yield* Effect.log("Creating note")
    return yield* repo.insert(input)
  },
  (effect, userId) => Effect.annotateLogs(effect, { userId })
)

// AVOID: Manual Effect.withSpan
const create = (userId: string, input: CreateNote) =>
  pipe(
    repo.insert(input),
    Effect.withSpan("Notes.create", { attributes: { userId } })
  )
```

Annotate new identifiers via `Effect.fn`'s second-arg pipeline with `Effect.annotateLogs`; reserve `Effect.annotateCurrentSpan` for tracing-dashboard attributes. Use `Effect.log` for structured logging of significant operations.

---

## Structured Logging

```typescript
import { Effect, Logger, LogLevel } from "effect"

yield* Effect.log("Application started")
yield* Effect.logDebug("Debug info")
yield* Effect.logWarning("Warning msg")
yield* Effect.logError("Error occurred")

const debugProgram = myEffect.pipe(Logger.withMinimumLogLevel(LogLevel.Debug))

const annotated = myEffect.pipe(
  Effect.annotateLogs({
    requestId: "abc-123",
    userId: "user-456"
  })
)
```

### Built-in Loggers

| Logger | Use Case |
|--------|----------|
| `Logger.stringLogger` | Default, key-value |
| `Logger.prettyLogger` | Development (colors) |
| `Logger.jsonLogger` | Production |

```typescript
const devProgram = myEffect.pipe(Effect.provide(Logger.pretty))

const jsonLogger = Logger.make(({ logLevel, message, date, annotations, cause }) => {
  console.log(JSON.stringify({
    timestamp: date.toISOString(),
    level: logLevel.label,
    message: String(message),
    ...Object.fromEntries(annotations),
    ...(cause ? { error: Cause.pretty(cause) } : {})
  }))
})
const JsonLoggerLive = Logger.replace(Logger.defaultLogger, jsonLogger)
```

---

## Tracing with Spans

```typescript
import { Effect } from "effect"

const traced = myEffect.pipe(Effect.withSpan("processUserData"))

const tracedDb = myEffect.pipe(
  Effect.withSpan("database-query", {
    attributes: { "db.system": "postgresql", "db.operation": "SELECT" }
  })
)

const nestedSpans = Effect.gen(function* () {
  const users = yield* fetchUsers().pipe(Effect.withSpan("fetchUsers"))
  const result = yield* processUsers(users).pipe(Effect.withSpan("processUsers"))
  return result
}).pipe(Effect.withSpan("parentOperation"))

const annotatedSpan = Effect.gen(function* () {
  yield* Effect.annotateCurrentSpan("user.id", userId)
  yield* Effect.annotateCurrentSpan("result.count", result.length)
})

const timed = myEffect.pipe(Effect.withLogSpan("database-query"))
```

---

## OpenTelemetry Integration

```bash
bun add @effect/opentelemetry @opentelemetry/sdk-trace-base @opentelemetry/exporter-trace-otlp-http
```

Use `catalog:` versions in package manifests when the dependency is shared across the repo.

```typescript
import { NodeSdk } from "@effect/opentelemetry"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { Effect } from "effect"

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "my-service", serviceVersion: "1.0.0" },
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({ url: "http://localhost:4318/v1/traces" })
  )
}))

const program = myEffect.pipe(Effect.provide(NodeSdkLive))
```

---

## Metrics

| Type | Use Case | Create |
|------|----------|--------|
| Counter | Request count | `Metric.counter(name)` |
| Gauge | Active connections | `Metric.gauge(name)` |
| Histogram | Latency distribution | `Metric.histogram(name, bounds)` |

```typescript
import { Effect, Metric, MetricBoundaries } from "effect"

const requestCounter = Metric.counter("http_requests_total")
yield* Metric.increment(requestCounter)

const taggedCounter = requestCounter.pipe(
  Metric.tagged("method", "GET"),
  Metric.tagged("path", "/api/users")
)

const activeConnections = Metric.gauge("active_connections")
yield* Metric.set(activeConnections, 42)

const requestLatency = Metric.histogram(
  "http_request_duration_seconds",
  MetricBoundaries.linear({ start: 0, width: 0.1, count: 10 })
)
yield* Metric.record(requestLatency, durationInSeconds)

const timedEffect = myEffect.pipe(Metric.trackDuration(requestLatency))
```

---

## Debugging

| Function | Inspects |
|----------|----------|
| `Effect.tap(fn)` | Success value |
| `Effect.tapError(fn)` | Error |
| `Effect.tapErrorTag("Tag", fn)` | Specific error type |
| `Effect.tapErrorCause(fn)` | Full cause |
| `Effect.tapBoth({ onSuccess, onFailure })` | Both outcomes |

```typescript
import { Effect, Console, Cause } from "effect"

const debugProgram = fetchData().pipe(
  Effect.tap((data) => Console.log("Raw:", data)),
  Effect.map(processData),
  Effect.tapError((error) => Effect.log(`Error: ${error.message}`)),
  Effect.tapErrorCause((cause) => Console.log("Cause:", Cause.pretty(cause)))
)

const handleErrors = myEffect.pipe(
  Effect.tapErrorTag("NetworkError", (e) => Console.log(`Status: ${e.statusCode}`))
)
```

---

## Production Patterns

### Request Tracing Helper

```typescript
import { Effect, FiberRef } from "effect"

const withRequestId = <A, E, R>(requestId: string, effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.annotateLogs("requestId", requestId),
    Effect.withSpan("request", { attributes: { requestId } })
  )

const handleRequest = (req: Request) =>
  withRequestId(req.headers.get("x-request-id") ?? crypto.randomUUID(), processRequest(req))
```

### Complete Observability Layer

```typescript
import { Effect, Layer, Logger, LogLevel } from "effect"
import { NodeSdk } from "@effect/opentelemetry"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"

const ObservabilityLive = Layer.mergeAll(
  NodeSdk.layer(() => ({
    resource: { serviceName: process.env.SERVICE_NAME! },
    spanProcessor: new BatchSpanProcessor(
      new OTLPTraceExporter({ url: process.env.OTLP_ENDPOINT! })
    )
  })),
  Logger.replace(Logger.defaultLogger, jsonLogger),
  Logger.minimumLogLevel(LogLevel.fromLiteral(process.env.LOG_LEVEL || "Info"))
)

const main = myEffect.pipe(Effect.provide(ObservabilityLive))
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Better Approach |
|--------------|---------|-----------------|
| `console.log` in Effect code | Loses fiber context | Use `Effect.log` |
| No request IDs | Hard to trace requests | Use `Effect.annotateLogs` |
| Missing spans on async ops | Incomplete traces | Wrap with `Effect.withSpan` |
| Dynamic metric names | Memory issues | Use tags instead |
