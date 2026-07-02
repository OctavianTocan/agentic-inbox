# Module Conventions

Naming, signatures, and parameter shapes for backend Effect modules. The prose in `SKILL.md` covers the rules; this page is the lookup table.

## Service Identifiers

Format: `'@<scope>/<pkg>/<ModuleName>'` where the prefix matches the package's `name` field.

| Class | Identifier Pattern | Example |
|-------|-------------------|---------|
| Primary service | `'@<scope>/<pkg>/<Module>'` | `'@app/api/Notes'` |
| Repo | `'@<scope>/<pkg>/<Module>/Repo'` | `'@app/api/Notes/Repo'` |
| Policy | `'@<scope>/<pkg>/<Module>/Policy'` | `'@app/api/Notes/Policy'` |
| Sub-entity repo | `'@<scope>/<pkg>/<Module>/<SubEntity>Repo'` | `'@app/api/Integrations/CredentialsRepo'` |
| Secondary service | `'@<scope>/<pkg>/<Module>/<ServiceName>'` | `'@app/api/Integrations/ProviderRegistry'` |
| Infrastructure | `'@<scope>/<pkg>/Infrastructure/<ServiceName>'` | `'@app/api/Infrastructure/Encryption'` |
| Client package | `'@clients/<name>/Client'` | `'@clients/mailer/Client'` |

Package scopes: `@app/<name>`, `@clients/<name>`, `@core/<name>`, `@shared/<name>` (match the package's `name` field in package.json).

No `Service` suffix — `'@app/api/Feedback'` not `'@app/api/FeedbackService'`.

## Method Naming

Singular/plural paradigm: `<verb>` for single, `<verb>Many` for batch.

### Service

| Operation | Method | Signature | Returns |
|-----------|--------|-----------|---------|
| Create | `create` | `(input: <Entity>CreateInput)` | `Entity` |
| Create batch | `createMany` | `(input: <Entity>CreateInput[])` | `Entity[]` |
| Get | `get` | `(id: EntityId, options?: <Entity>GetOptions)` | `Entity` (fails with `<Entity>NotFoundError`) |
| Get batch | `getMany` | `(ids: EntityId[])` | `Entity[]` (fails if any missing) |
| List | `list` | `(options?: <Entity>ListOptions)` | `PaginatedResult<Entity>` |
| Update | `update` | `(id: EntityId, input: <Entity>UpdateInput)` | `Entity` |
| Delete | `delete` | `(id: EntityId)` | `Entity` |

Notes:
- `delete` is a reserved word as a variable name. Define as `del` and expose as `delete: del` in the return object.
- Only add `*Many` variants when there is an actual use case.
- Sub-resource operations: `create<Sub>`, `list<Subs>`, `delete<Sub>`.
- Status transitions use verb names: `start`, `stop`, `archive`, `terminate`, `complete`.

### Repo

| Operation | Method | Signature | Returns |
|-----------|--------|-----------|---------|
| Find single | `find` | `(id: EntityId)` | `Option<Row>` |
| Find many | `findMany` | `(query?: { pagination? })` | `{ rows: Row[], hasMore: boolean }` |
| Insert | `insert` | `(values: EntityInsert)` | `Row` |
| Update | `update` | `(id: EntityId, values: Partial<...>)` | `Option<Row>` |
| Delete | `delete` | `(id: EntityId)` | `Option<Row>` |
| Upsert | `upsert` | `(values: EntityInsert)` | `Row` |

`find*` always returns `Option` (single) or `Row[]` (multi). Never `null`. Never throws.

### Policy

Mirrors service verbs with a `can` prefix: `canCreate`, `canGet`, `canList`, `canUpdate`, `canDelete`.

## Return Types

| Layer | Pattern | Returns |
|-------|---------|---------|
| Repo `find` | `Option<Row>` | Never null, never throws |
| Repo `findMany` | `{ rows: Row[], hasMore: boolean }` | Paginated |
| Repo `create` / `update` / `delete` | `Row` or `Option<Row>` | Single row |
| Service `get` | `Entity` | Fails with `<Entity>NotFoundError` |
| Service `list` | `PaginatedResult<Entity>` | `{ data, firstId, lastId, hasMore }` |
| Service `create` / `update` / `delete` | `Entity` | The affected entity |

## Parameters

- **Max 2 positional params:** `(id, input)` or `(id, options?)`. Three or more pack into an object.
- **Required data** uses `input` with `Input` suffix: `input: NoteCreateInput`.
- **Optional extras** use `options` with `Options` suffix: `options?: NoteListOptions`.

## Domain Type Naming

Entity-first ordering — all types for one entity sort together.

| Type | Pattern | Example |
|------|---------|---------|
| Branded ID | `<Entity>Id` | `NoteId` |
| Entity schema | `<Entity>` | `Note` |
| Service create input | `<Entity>CreateInput` | `NoteCreateInput` (Schema.Class) |
| Service update input | `<Entity>UpdateInput` | `NoteUpdateInput` (Schema.Class) |
| Get options | `<Entity>GetOptions` | `NoteGetOptions` |
| List options | `<Entity>ListOptions` | `NoteListOptions` |
| Not found error | `<Entity>NotFoundError` | `NoteNotFoundError` |
| Conflict error | `<Entity><Field>ConflictError` | `NoteTitleConflictError` |
| Domain error | `<Entity>Error` | `NoteError` |
| Row type | `<Entity>Row` | `NoteRow` (in Repo.ts) |
| Insert type | `<Entity>Insert` | `NoteInsert` (in Repo.ts) |
| Update type | `<Entity>Update` | `NoteUpdate` (in Repo.ts) |

No `<Entity>IdFromString` — use `<Entity>Id.make(str)` directly.

**Input vs Tool params:** `<Entity>CreateInput` / `<Entity>UpdateInput` are `Schema.Class` types used by services and API endpoints. Tool parameters are defined inline in `Tool.make()` as plain objects (`{ key: Schema.Type }`), auto-wrapped into `Schema.Struct`. No separate `*Params` types.

**Repo types** (`Row`, `Insert`, `Update`) describe the database table shape and are defined in `Repo.ts`, not `Domain.ts`.

## Schema Type Usage

| Pattern | When to use |
|---------|------------|
| `Schema.Class` | Named, exported domain models (entities, inputs, responses); needs `identifier`, `title`, `description` for OpenAPI |
| `Schema.Struct` | Inline shapes only: path params in `setPath()`, nested objects, function-scoped parsing |
| Plain object `{ key: Schema }` | Tool parameters in `Tool.make()`; auto-wrapped into `Schema.Struct` |
| `Schema.TaggedError` | All error types (in `Errors.ts`) |

If a struct is exported or used in more than one place, promote to `Schema.Class` with `identifier`, `title`, `description`. There is no module-internal "opaque struct" shortcut in our pinned Effect; the `Schema.Class` pattern handles both exported and internal cases.

### Methods on `Schema.Class`

`Schema.Class` extends a real class. Put pure domain logic on the entity instead of in freestanding helpers:

```typescript
export class Session extends Schema.Class<Session>('Session')({
  id: SessionId,
  userId: UserId,
  expiresAt: Schema.DateTimeUtc,
  revoked: Schema.Boolean,
}) {
  isExpired(now: DateTime.DateTime): boolean {
    return DateTime.lessThan(this.expiresAt, now)
  }
  isActive(now: DateTime.DateTime): boolean {
    return !this.revoked && !this.isExpired(now)
  }
}
```

Reads as `session.isActive(now)` at call sites. Use for derived predicates, computed properties, formatters; any pure logic that always operates on a single instance. Keep effectful work in the service.

### Per-field annotations: `identifier`, `description`

Annotations propagate to OpenAPI specs, tool descriptions, and any other introspection layer. Document fields inline using `.annotations({...})` (plural; not `.annotate(...)`):

```typescript
parameters: Schema.Struct({
  pattern: Schema.String,
  glob: Schema.optional(Schema.String).annotations({ description: '--glob' }),
  maxLines: Schema.optional(Schema.Finite).annotations({
    description: 'Total max lines across all files (default: 500)',
  }),
})
```

For single-argument tools, name the parameter without an outer `Struct`:

```typescript
parameters: Schema.String.annotations({ identifier: 'task' }),
```

Prefer inline annotations over JSDoc on a separate type; annotations propagate, JSDoc doesn't.

### `Schema.OptionFrom*` combinators for nullable to Option

When a JSON field may be absent or null and consumers want `Option` semantics, pick the combinator that matches the wire shape:

| Combinator | Wire shape | Decoded |
|------------|-----------|---------|
| `Schema.OptionFromUndefinedOr(value)` | absent or `undefined` | `Option<T>` |
| `Schema.OptionFromNullOr(value)` | present or `null` | `Option<T>` |
| `Schema.OptionFromNullishOr(value, null)` | absent, `null`, or `undefined` | `Option<T>` |

`OptionFromNullishOr` takes a required second argument (`null` or `undefined`) that picks how `None` is encoded back to the wire shape; pick whichever matches the producer.

```typescript
export class TokenData extends Schema.Class<TokenData>('TokenData')({
  access: Schema.String,
  refresh: Schema.String,
  expires: Schema.Number,
  accountId: Schema.OptionFromUndefinedOr(Schema.String),
}) {}
```

Decoded `accountId` is `Option.Option<string>` even though the JSON field may be missing. Cleaner than `Schema.optional(...)` followed by manual `Option.fromNullable` at call sites.

## `Effect.fn` Span Naming

Format: `'ServiceName.methodName'`

| Layer | Pattern | Example |
|-------|---------|---------|
| Service | `'Notes.create'` | `Effect.fn('Notes.create')(...)` |
| Repo | `'NotesRepo.find'` | `Effect.fn('NotesRepo.find')(...)` |
| Policy | `'NotesPolicy.canGet'` | `Effect.fn('NotesPolicy.canGet')(...)` |
| Tool execute | `'LabelCreateTool.execute'` | `execute: Effect.fn('LabelCreateTool.execute')(...)` |
