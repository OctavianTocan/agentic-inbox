# API Module Patterns

How API modules split across a shared **contract** package and the **implementing** app.

## Module File Structure

Each API domain lives in two layers. Most modules expose both HTTP and RPC; some are **RPC-only** (internal, no public HTTP surface).

### HTTP + RPC (default archetype, e.g. Sessions)

```
contract/Modules/{Name}/        # shared package
  Api.ts           HttpApiGroup definition (endpoint schema, shared)
  Domain.ts        Schema classes, tagged errors, payload types (shared)
  RpcProtocol.ts   RPC group definition (shared)

server/Modules/{Name}/          # implementing app
  Http.ts          HTTP endpoint handlers
  Rpc.ts           RPC endpoint handlers
  Service.ts       Business logic (Effect.Service)
  Repo.ts          Data access (Effect SQL)
  Policy.ts        Authorization policies
  Domain.ts        API-only domain types (if needed)
```

### RPC-only (e.g. Machines)

```
contract/Modules/{Name}/        # shared package
  Domain.ts        Schema classes, tagged errors (shared)
  Errors.ts        TaggedError definitions (shared)
  RpcProtocol.ts   RPC group definition (shared)

server/Modules/{Name}/          # implementing app
  Rpc.ts           RPC endpoint handlers
  Service.ts       Business logic (Effect.Service)
  Repo.ts          Data access (Effect SQL)
  Constants.ts     Module-level constants
  Tasks/           Background job definitions (if applicable)
```

RPC-only modules omit `Api.ts`, `Http.ts`, and `Policy.ts`. Use this archetype when the module is consumed only by internal services and has no public HTTP API.

The **contract** package defines the shared types + RPC protocol. The **server** app implements it.

## HttpApiGroup Definition (Api.ts)

Declarative endpoint schema — no implementation logic:

```typescript
export class SessionsApi extends HttpApiGroup.make('sessions')
  .addError(Unauthorized)
  .add(HttpApiEndpoint.post('create', '/')
    .addSuccess(Session)
    .addError(SessionError)
    .setPayload(SessionCreateInput)
    .annotate(OpenApi.Summary, 'Create session'))
  .add(HttpApiEndpoint.get('list', '/')
    .addSuccess(PaginatedResponse(Session))
    .setUrlParams(Schema.Struct({ ...paginationFields }))
    .annotate(OpenApi.Summary, 'List sessions'))
  .middleware(Authentication)
  .prefix('/sessions') {}
```

Rules:
- One `HttpApiGroup` per domain module
- `.addError()` at group level for shared errors (e.g. `Unauthorized`)
- `.addError()` at endpoint level for domain-specific errors
- `.middleware(Authentication)` for protected groups
- `.prefix()` sets the route prefix

## Composite API (contract/Api.ts)

All groups compose into a single API:

```typescript
export class Api extends HttpApi.make('api')
  .add(SessionsApi)
  .add(SkillsApi)
  .addError(ApiRateLimitExceeded)
  .addError(InternalError)
  .prefix('/v1')
  .annotate(OpenApi.Title, 'Example API') {}
```

## RPC Protocol (contract/RpcProtocol.ts)

Internal RPC contract for service-to-service communication. HTTP+RPC modules mirror the HTTP surface; RPC-only modules (e.g. Machines) define only the RPC contract:

```typescript
export class SessionsRpcs extends RpcGroup.make(
  Rpc.make('sessions.get', {
    payload: Schema.Struct({ sessionId: SessionId }),
    success: Schema.Struct({ session: Session, machine: Machine }),
    error: Schema.Union(SessionNotFoundError, InternalError),
  }),
  Rpc.make('sessions.update', {
    payload: Schema.Struct({
      sessionId: SessionId,
      name: Schema.optional(Schema.String),
      status: Schema.optional(Schema.Literal('idle', 'running', 'error')),
    }),
    success: Schema.Void,
    error: InternalError,
  })
).middleware(RpcAuthentication) {}
```

**RPC Protocol type rules:**

- **Reuse Domain types** for `success`/`error` schemas. Import from `Domain.ts` or `Errors.ts` — never re-define domain types in `RpcProtocol.ts`.
- **RPC-specific types** (e.g. `RpcTokenResult`) are allowed when the RPC contract has no domain equivalent, or when the domain types are not serializable over RPC (e.g. `Schema.declare` opaque types, complex tagged unions with internal-only fields). Prefix with `Rpc` to signal they're transport-specific.
- **Payload schemas** are always inline `Schema.Struct` — never create separate payload classes.
- **Handler parameter types** are inferred from the protocol — use destructuring (`({ organizationId, userId }) =>`), never manually annotate the payload type.

## Domain Types (contract/Domain.ts)

Schema-based models shared between HTTP and RPC (abbreviated — real `Session` also has `teamId`, `cleanedUpAt`, `lastActiveAt`, `settings`):

```typescript
export class Session extends Schema.Class<Session>('Session')({
  id: SessionId.annotations({ description: 'Unique session identifier' }),
  organizationId: Schema.String,
  status: SessionStatus,
  name: Schema.String,
  archivedAt: Schema.NullOr(Schema.Date),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
}, { identifier: 'Session', title: 'Session', description: 'An agent session' }) {}
```

## Tagged Errors with HTTP Status

```typescript
export class SessionNotFoundError extends Schema.TaggedError<SessionNotFoundError>()(
  'SessionNotFoundError',
  { id: SessionId },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class SessionError extends Schema.TaggedError<SessionError>()(
  'SessionError',
  {},
  HttpApiSchema.annotations({ status: 500 })
) {
  declare readonly cause: unknown

  constructor(props: { readonly cause?: unknown }) {
    super(props)
    this.cause = props.cause
  }

  get message() {
    return 'Session error'
  }
}
```

## HTTP Handlers (Http.ts)

Handlers compose RLS, policy, and rate limiting:

```typescript
HttpApiBuilder.group(api, 'sessions', (handlers) =>
  handlers
    .handle('create', ({ payload }) =>
      sessions.create(payload).pipe(
        requireRls(),
        requirePolicy(policy.canCreate()),
        withRateLimit('write')
      )
    )
    .handle('list', ({ payload }) =>
      sessions.list(payload).pipe(
        requireRls(),
        requirePolicy(policy.canList()),
        withRateLimit('read')
      )
    )
)
```

**Middleware composition order:** `requireRls` (sets Postgres RLS context) -> `requirePolicy` (authorization check) -> `withRateLimit` (throttling).

**Naming convention:** `require*` for auth-related middleware, `with*` for non-auth middleware.

## RPC Handlers (Rpc.ts)

```typescript
export const SessionsRpcLive = SessionsRpcs.toLayer(
  Effect.gen(function* () {
    const sessions = yield* Sessions;

    return {
      'sessions.get': ({ sessionId }) =>
        sessions.get(sessionId).pipe(requireRls()),
      'sessions.update': ({ sessionId, ...rest }) =>
        sessions.update(sessionId, rest).pipe(requireRls()),
    };
  })
).pipe(Layer.provide(Sessions.Default));
```

## Service Pattern (Service.ts)

Business logic with dependency injection:

```typescript
export class Sessions extends Effect.Service<Sessions>()(
  '@app/api/Sessions',
  {
    effect: Effect.gen(function* () {
      const repo = yield* SessionsRepo;

      const create = Effect.fn('Sessions.create')(function* (
        input: SessionCreateInput
      ) {
        const row = yield* repo.insert({ name: input.name ?? generateName() });
        return new Session(row);
      });

      return { create, get, list, update } as const;
    }),
  }
) {}
```

## Repo Pattern (Repo.ts)

Data access returning `Option` for nullable results:

```typescript
const find = Effect.fn('SessionsRepo.find')(function* (id: SessionId) {
  const rows = yield* db
    .select()
    .from(agentSession)
    .where(eq(agentSession.id, id))
    .limit(1);
  return rows.length > 0 ? Option.some(rows[0]) : Option.none();
});
```

## RLS Context (Infrastructure/Database/Rls.ts)

Wraps effects in a Postgres RLS transaction:

```typescript
export const requireRls =
  () =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const auth = yield* AuthContext;
    const userId = auth.tenant.user?.id;
    if (!userId) {
      return yield* Effect.fail(
        new AuthenticationError({ reason: 'invalid_session' })
      );
    }
    return yield* withRlsContext(
      {
        userId,
        orgId: auth.tenant.organization.id,
        teamId: auth.tenant.team?.id,
        role: auth.tenant.organizationRole ?? 'member',
      },
      effect
    );
  });
```

## SQL Error Handling (contract/Lib/Errors.ts)

Maps Postgres error codes to domain errors:

```typescript
export const catchDbViolation = <E2>(...handlers...) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.catchAll(effect, (e) => {
      if (isSqlError(e)) {
        const code = getPgErrorCode(e);
        if (code === '23505' && handlers.onUnique)
          return Effect.fail(handlers.onUnique());
        if (code === '23503' && handlers.onForeignKey)
          return Effect.fail(handlers.onForeignKey());
      }
      return Effect.fail(e);
    });
```

Error codes: `23505` = unique violation, `23503` = foreign key, `23502` = not null.

## Pagination (Infrastructure/Database/Pagination.ts)

Cursor-based pagination using `after` + `limit`:

```typescript
export const paginatedQuery = (
  idColumn: Column,
  pagination: { readonly after?: string; readonly limit?: number }
) => {
  const limit = pagination.limit ?? DEFAULT_LIMIT;
  const conditions: SQL[] = [];
  if (pagination.after) {
    conditions.push(lt(idColumn, pagination.after));
  }
  return { conditions, limit };
};
```

Generic paginated response schema (from your shared server package):

```typescript
export const PaginatedResponse = <A, I, R>(itemSchema: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    data: Schema.Array(itemSchema),
    firstId: Schema.NullOr(Schema.String),
    lastId: Schema.NullOr(Schema.String),
    hasMore: Schema.Boolean,
  });
```

## Anti-Patterns

- Don't put business logic in Http.ts — it belongs in Service.ts
- Don't skip `requireRls()` — every mutation must set RLS context
- Don't return raw DB rows — map to domain Schema classes
- Don't use `throw` — use `Effect.fail(new TaggedError())`
- Don't put implementation-specific types in the contract package — it's the shared contract
- Don't import `node:fs` in `Effect.Service` code — use `yield* FileSystem.FileSystem` and provide `BunContext.layer` at the app root (see `references/platform.md` § Multipart uploads)
