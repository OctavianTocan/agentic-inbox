# Client Package Patterns

Canonical patterns for wrapping third-party APIs with Effect. All client packages live under `packages/clients/<name>/`.

## Quick Reference

| Archetype | Pattern | Config | Constructor | Examples |
|-----------|---------|--------|-------------|----------|
| API Client (Factory) | `forToken(token)` / `forCredentials(creds)` | None at service level | `effect:` | per-token REST/SDK clients (mailer, search) |
| Optional Client (Config-gated) | Live/noop via `Config.option()` | `Config.option(Config.all({...}))` | `effect:` or `scoped:` | optional/metered integrations |
| Infrastructure Client (Required) | Fails fast on missing config | `Config.all({...})` | `scoped:` | redis, message queue |

---

## Service Identifier Convention

Format: `'@clients/<name>/Client'`

| Package | Identifier |
|---------|-----------|
| `@clients/mailer` | `'@clients/mailer/Client'` |
| `@clients/search` | `'@clients/search/Client'` |
| `@clients/redis` | `'@clients/redis/Client'` |

---

## File Structure

All client packages use `src/` directory:

| File | Purpose | Required? |
|------|---------|-----------|
| `src/Client.ts` | Service class, methods | Yes |
| `src/Errors.ts` | All TaggedError classes + error union type | Yes |
| `src/Config.ts` | Exported Config definition | Optional/Infrastructure only |
| `src/Domain.ts` | Custom types when SDK types insufficient | When needed |
| `src/Helpers.ts` | Per-package helper functions (error mappers, etc.) | When needed |

Package name: `@clients/<name>` (e.g., `@clients/mailer`, `@clients/search`). Import directly from each module — never create `index.ts` barrels.

**Reserved filenames:** `Http.ts` is reserved for Effect module handler implementations. For client helpers, use `Helpers.ts`.

---

## Error Conventions

Per-client errors with standardized field names. **Not** shared base types — each client defines its own errors.

| Error Class | Schema Fields | Non-schema Properties | When |
|------------|--------------|----------------------|------|
| `<Prefix>ApiError` | `{ operation: Schema.String }` | `cause: unknown` | General API failures |
| `<Prefix>RateLimitError` | `{ operation: Schema.String, retryAfterMs: Schema.Number }` | — | Rate limiting (429) |
| `<Prefix>DisabledError` | `{ operation: Schema.String }` | — | Optional clients when disabled |
| `<Prefix>ConnectionError` | `{}` | `cause: unknown` | Infrastructure connection failures |

### Field Rules

- `operation` — always `Schema.String`, describes the API call (e.g., `'messages.send'`, `'items.create'`)
- `retryAfterMs` — always milliseconds, never seconds, never ambiguous
- `cause` — always `unknown`, always non-schema, always via constructor override

### Hidden `cause` Pattern

`cause` carries the original error object for logging/tracing but **never serializes to HTTP responses**. It's a non-schema class property set via constructor override:

```typescript
import { Schema } from 'effect'

export class MailerApiError extends Schema.TaggedError<MailerApiError>()(
  'MailerApiError',
  { operation: Schema.String }
) {
  declare readonly cause: unknown

  constructor(props: { readonly operation: string; readonly cause?: unknown }) {
    const { cause, ...rest } = props
    super(rest)
    this.cause = cause
  }

  get message() {
    return `Mailer API "${this.operation}" failed`
  }
}

export class MailerRateLimitError extends Schema.TaggedError<MailerRateLimitError>()(
  'MailerRateLimitError',
  {
    operation: Schema.String,
    retryAfterMs: Schema.Number,
  }
) {
  get message() {
    return `Mailer API "${this.operation}" rate limited, retry after ${this.retryAfterMs}ms`
  }
}

export class MailerDisabledError extends Schema.TaggedError<MailerDisabledError>()(
  'MailerDisabledError',
  { operation: Schema.String }
) {
  get message() {
    return `Mailer "${this.operation}" unavailable: client is disabled`
  }
}

export type MailerHttpError = MailerApiError | MailerRateLimitError
```

**Why this works:** `Schema.encode` creates a fresh `{}` and only copies declared `propertySignatures`. Extra instance properties like `cause` are silently dropped. `HttpApiBuilder` calls `Schema.encodeUnknown(errorSchema)(error)` which produces the stripped object.

### SDK Error Mapping

When wrapping a native SDK, map SDK-specific errors to your tagged errors:

```typescript
function mapSdkError(operation: string, e: unknown): MailerHttpError {
  if (
    e instanceof Error &&
    'code' in e &&
    e.code === 'rate_limited' &&
    'retryAfter' in e &&
    typeof e.retryAfter === 'number'
  ) {
    return new MailerRateLimitError({
      operation,
      retryAfterMs: e.retryAfter * 1000,
    })
  }
  return new MailerApiError({ operation, cause: e })
}
```

---

## The `wrapExternalCall` Helper

Shared helper from `@core/effect/Helpers` — replaces per-package `wrap()` reimplementations.

```typescript
import { wrapExternalCall } from '@core/effect/Helpers'

const wrap = <T>(operation: string, fn: () => Promise<T>) =>
  wrapExternalCall(operation, fn, mapSdkError, {
    isRetryable: (e) => e._tag === 'MailerRateLimitError',
  })
```

**Defaults:** 30s timeout, 3 retries, 100ms exponential backoff with jitter. Override per-call via the `options` parameter.

**Retry rules:**
- Always retry rate limit errors
- Retry transient/5xx errors when the SDK doesn't handle them
- Never retry auth errors (401/403) or not-found errors (404)

---

## Archetype 1: API Client (Factory)

For clients where credentials are provided at call time (per-workspace, per-user tokens).

```typescript
// src/Errors.ts
import { Schema } from 'effect'

export class SomeApiError extends Schema.TaggedError<SomeApiError>()(
  'SomeApiError',
  { operation: Schema.String }
) {
  declare readonly cause: unknown
  constructor(props: { readonly operation: string; readonly cause?: unknown }) {
    const { cause, ...rest } = props
    super(rest)
    this.cause = cause
  }
  get message() {
    return `Some API "${this.operation}" failed`
  }
}

export class SomeRateLimitError extends Schema.TaggedError<SomeRateLimitError>()(
  'SomeRateLimitError',
  { operation: Schema.String, retryAfterMs: Schema.Number }
) {
  get message() {
    return `Some API "${this.operation}" rate limited, retry after ${this.retryAfterMs}ms`
  }
}

export type SomeHttpError = SomeApiError | SomeRateLimitError
```

```typescript
// src/Client.ts
import { Effect } from 'effect'
import { wrapExternalCall } from '@core/effect/Helpers'
import { SomeApiError, type SomeHttpError, SomeRateLimitError } from './Errors'

function mapSdkError(operation: string, e: unknown): SomeHttpError {
  if (e instanceof SdkRateLimitError) {
    return new SomeRateLimitError({ operation, retryAfterMs: e.retryAfter * 1000 })
  }
  return new SomeApiError({ operation, cause: e })
}

export class SomeClient extends Effect.Service<SomeClient>()(
  '@clients/some/Client',
  {
    effect: Effect.gen(function* () {
      const forToken = (token: string) => {
        const sdk = new SomeSdk(token)

        const wrap = <T>(operation: string, fn: () => Promise<T>) =>
          wrapExternalCall(operation, fn, mapSdkError, {
            isRetryable: (e) => e._tag === 'SomeRateLimitError',
          })

        const doThing = Effect.fn('SomeClient.doThing')(
          function* (params: DoThingParams) {
            return yield* wrap('doThing', () => sdk.doThing(params))
          },
          (effect, params) =>
            Effect.annotateLogs(effect, { 'some.resourceId': params.id })
        )

        return { doThing } as const
      }

      return { forToken } as const
    }),
  }
) {}

export type SomeApi = ReturnType<SomeClient['forToken']>
```

**Dependencies rule:** Declare `dependencies: [FetchHttpClient.layer]` when using `HttpClient.HttpClient` from `effect/unstable/http`. No dependencies when using a native vendor SDK.

---

## Archetype 2: Optional Client (Config-gated)

For clients that may or may not be configured. The system starts without them.

```typescript
// src/Config.ts
import { Config } from 'effect'

export const SomeClientConfig = Config.option(
  Config.all({
    apiKey: Config.redacted('SOME_API_KEY'),
  })
)
```

```typescript
// src/Errors.ts
import { Schema } from 'effect'

export class SomeApiError extends Schema.TaggedError<SomeApiError>()(
  'SomeApiError',
  { operation: Schema.String }
) {
  declare readonly cause: unknown
  constructor(props: { readonly operation: string; readonly cause?: unknown }) {
    const { cause, ...rest } = props
    super(rest)
    this.cause = cause
  }
  get message() {
    return `Some "${this.operation}" failed`
  }
}

export class SomeDisabledError extends Schema.TaggedError<SomeDisabledError>()(
  'SomeDisabledError',
  { operation: Schema.String }
) {
  get message() {
    return `Some "${this.operation}" unavailable: client is disabled`
  }
}

export type SomeErrorUnion = SomeApiError | SomeDisabledError
```

```typescript
// src/Client.ts
import { Effect, Option, Redacted } from 'effect'
import { wrapExternalCall } from '@core/effect/Helpers'
import { SomeClientConfig } from './Config'
import { SomeApiError, SomeDisabledError, type SomeErrorUnion } from './Errors'

export interface SomeClientShape {
  readonly enabled: boolean
  readonly doThing: (params: DoThingParams) => Effect.Effect<Result, SomeErrorUnion>
}

function mapSdkError(operation: string, e: unknown): SomeApiError {
  return new SomeApiError({ operation, cause: e })
}

function makeNoopClient(): SomeClientShape {
  const disabled = (operation: string) =>
    Effect.fail(new SomeDisabledError({ operation }))

  return {
    enabled: false,
    doThing: () => disabled('doThing'),
  }
}

function makeLiveClient(config: { apiKey: string }): SomeClientShape {
  const sdk = new SomeSdk({ apiKey: config.apiKey })

  const wrap = <T>(operation: string, fn: () => Promise<T>) =>
    wrapExternalCall(operation, fn, mapSdkError)

  return {
    enabled: true,
    doThing: Effect.fn('SomeClient.doThing')(
      function* (params: DoThingParams) {
        return yield* wrap('doThing', () => sdk.doThing(params))
      },
      (effect, params) =>
        Effect.annotateLogs(effect, { 'some.resourceId': params.id })
    ),
  }
}

export class SomeClient extends Effect.Service<SomeClient>()(
  '@clients/some/Client',
  {
    effect: Effect.gen(function* () {
      const configOption = yield* SomeClientConfig

      if (Option.isNone(configOption)) {
        yield* Effect.logInfo('Some client disabled (SOME_API_KEY not set)')
        return makeNoopClient()
      }

      yield* Effect.logInfo('Some client enabled')
      return makeLiveClient({
        apiKey: Redacted.value(configOption.value.apiKey),
      })
    }),
  }
) {}
```

**Noop strategy:** All methods fail with `DisabledError` by default. Use silent noop (returning safe defaults) only when the caller genuinely needs fail-open semantics (like billing checks).

---

## Archetype 3: Infrastructure Client (Required/Scoped)

For clients required for the system to function. Fails fast at startup if config is missing.

```typescript
// src/Config.ts
import { Config } from 'effect'

export const SomeClientConfig = Config.all({
  token: Config.redacted('SOME_TOKEN'),
  host: Config.string('SOME_HOST').pipe(Config.withDefault('localhost:8080')),
})
```

```typescript
// src/Errors.ts
import { Schema } from 'effect'

export class SomeError extends Schema.TaggedError<SomeError>()(
  'SomeError',
  { operation: Schema.String }
) {
  declare readonly cause: unknown
  constructor(props: { readonly operation: string; readonly cause?: unknown }) {
    const { cause, ...rest } = props
    super(rest)
    this.cause = cause
  }
  get message() {
    return `Some "${this.operation}" failed`
  }
}

export class SomeConnectionError extends Schema.TaggedError<SomeConnectionError>()(
  'SomeConnectionError',
  {}
) {
  declare readonly cause: unknown
  constructor(props: { readonly cause?: unknown }) {
    super(props)
    this.cause = props.cause
  }
  get message() {
    return 'Some connection failed'
  }
}
```

```typescript
// src/Client.ts
import { Effect, Redacted } from 'effect'
import { wrapExternalCall } from '@core/effect/Helpers'
import { SomeClientConfig } from './Config'
import { SomeConnectionError, SomeError } from './Errors'

function mapSdkError(operation: string, e: unknown): SomeError {
  return new SomeError({ operation, cause: e })
}

export class SomeClient extends Effect.Service<SomeClient>()(
  '@clients/some/Client',
  {
    scoped: Effect.gen(function* () {
      const config = yield* SomeClientConfig.pipe(
        Effect.mapError((e) => new SomeConnectionError({ cause: e }))
      )

      const sdk = yield* Effect.acquireRelease(
        Effect.try({
          try: () =>
            SomeSdk.init({
              token: Redacted.value(config.token),
              host: config.host,
            }),
          catch: (e) => new SomeConnectionError({ cause: e }),
        }),
        (client) => Effect.promise(() => client.disconnect())
      )

      yield* Effect.log('Some client initialized')

      const wrap = <T>(operation: string, fn: () => Promise<T>) =>
        wrapExternalCall(operation, fn, mapSdkError)

      const doThing = Effect.fn('SomeClient.doThing')(
        function* (params: DoThingParams) {
          return yield* wrap('doThing', () => sdk.doThing(params))
        },
        (effect, params) =>
          Effect.annotateLogs(effect, { 'some.resourceId': params.id })
      )

      return { raw: sdk, doThing } as const
    }),
  }
) {}
```

**Key difference:** Uses `scoped:` instead of `effect:` for connection lifecycle management via `Effect.acquireRelease`.

---

## Observability in Client Methods

Use `Effect.fn`'s pipeline parameter (second argument) for observability, keeping the generator body focused on business logic. `Effect.annotateLogs` is fiber-scoped — zero overhead on success, only surfaces when logs emit.

```typescript
const send = Effect.fn('MailerClient.send')(
  function* (params: SendArgs) {
    return yield* wrap('send', () => sdk.messages.send(params))
  },
  (effect, params) => Effect.annotateLogs(effect, { 'mailer.recipient': params.to })
)
```

Use dotted namespace keys: `mailer.recipient`, `search.query`, etc. Annotate primary identifiers from the params — never the method name (`Effect.fn` already creates a named span).

---

## Pagination

Stream-based auto-pagination using `Stream.paginateChunkEffect`:

```typescript
const paginate = <A>(
  fetch: (cursor: string | undefined) =>
    Effect.Effect<Page<A>, MailerHttpError>
): Stream.Stream<A, MailerHttpError> =>
  Stream.paginateChunkEffect(undefined as string | undefined, (cursor) =>
    fetch(cursor).pipe(
      Effect.map((page) => [
        Chunk.fromIterable(page.nodes),
        page.pageInfo.hasNextPage
          ? Option.some(page.pageInfo.endCursor)
          : Option.none(),
      ])
    )
  )
```

Colocate pagination helpers in `src/Pagination.ts` when the client needs them across multiple methods.

---

## Webhook Verification

HMAC SHA256 + timing-safe comparison. Colocate in `src/Webhooks.ts`:

```typescript
export const verifyWebhookRequest = (params: {
  readonly signingSecret: string
  readonly headers: Record<string, string | string[] | undefined>
  readonly body: string
}) => Effect.gen(function* () {
  const timestamp = getHeader(params.headers, 'x-webhook-timestamp')
  const signature = getHeader(params.headers, 'x-webhook-signature')
  const baseString = `v0:${timestamp}:${params.body}`
  const computed = `v0=${hmacSha256(params.signingSecret, baseString)}`
  if (!timingSafeEqual(computed, signature)) {
    return yield* Effect.fail(new WebhookVerificationError({ ... }))
  }
  return JSON.parse(params.body)
})
```

---

## Redacted Config

Sensitive values wrapped in `Redacted.Redacted`:

```typescript
const apiKey = yield* Config.redacted('API_KEY')
// Use: Redacted.value(apiKey) to extract
// Safe logging: Redacted automatically masks in logs
```

---

## Type Re-export Rules

| Scenario | Approach | Example |
|----------|----------|---------|
| SDK has well-typed exports | Re-export from SDK | `export type { Message, MessageInfo } from 'vendor-sdk'` |
| SDK types are incomplete/untyped | Define custom `Domain.ts` | custom response types in `Domain.ts` |
| Response shapes need validation | Define Effect `Schema` classes | `Schemas.ts` |

Rules:
- Use `export type { ... }` (type-only) for SDK re-exports
- Never redefine types that already exist in the SDK
- When defining custom types, put them in `Domain.ts`

---

## Anti-Patterns

| Anti-Pattern | Problem | Correct |
|-------------|---------|---------|
| `retryAfter` (seconds) | Ambiguous units | `retryAfterMs` (always ms) |
| `method` on errors | Inconsistent field name | `operation` |
| `description: Schema.String` on errors | Loses original error | Non-schema `cause` via constructor override |
| `cause: Schema.optional(Schema.Unknown)` as schema field | Leaks raw error objects to HTTP responses | Non-schema `cause` via constructor override |
| `'MailerClient'` identifier | No package prefix | `'@clients/mailer/Client'` |
| Separate `TimeoutError` class | Redundant error type | Map `TimeoutException` to `<Prefix>ApiError` with timeout as cause |
| Missing `Schedule.jittered` | Thundering herd on retries | Always add jitter |
| Reimplementing `wrap()` per package | Duplication across packages | Use `wrapExternalCall` from `@core/effect/Helpers` |
| `vi.mock()` for services | Wrong abstraction, bypasses DI | `makeTestLayer` / `Layer.mock` for services; `vi.mock()` only for SDK-level mocking |
| Raw `fetch()` in client | Bypasses Effect HttpClient | Use `HttpClient.HttpClient` from `effect/unstable/http` |
| Retry on all errors | Retries auth/not-found errors | Only retry rate limit and transient errors |
| `index.ts` barrel in a client package | Violates no-barrel rule | Import directly from `Client.ts`, `Errors.ts`, `Domain.ts` |

---

## New Client Checklist

- [ ] Choose archetype: Factory, Optional, or Infrastructure
- [ ] Package at `packages/clients/<name>/` with `@clients/<name>` name
- [ ] Service identifier: `'@clients/<name>/Client'`
- [ ] `src/Errors.ts`: errors with `operation`, non-schema `cause`, `retryAfterMs` (ms)
- [ ] Error union type exported from `Errors.ts`
- [ ] `src/Client.ts`: uses `wrapExternalCall` from `@core/effect/Helpers`
- [ ] `src/Config.ts`: for Optional/Infrastructure archetypes
- [ ] `dependencies: [FetchHttpClient.layer]` if using `effect/unstable/http` HttpClient
- [ ] `scoped:` with `acquireRelease` for stateful connections
- [ ] `Redacted` for API keys and secrets
- [ ] `Effect.fn` pipeline parameter for observability annotations
- [ ] Type re-exports for SDK types consumers need
- [ ] No `index.ts` barrel — import directly from source files
- [ ] Tests in `test/unit/Client.test.ts`
