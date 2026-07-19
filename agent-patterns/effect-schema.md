# Effect Schema patterns (agentic-inbox)

Source of truth: [`repos/effect-smol/LLMS.md`](../repos/effect-smol/LLMS.md) (start here), then [`repos/effect-smol/packages/effect/SCHEMA.md`](../repos/effect-smol/packages/effect/SCHEMA.md) and Schema sources under `repos/effect-smol/packages/effect/src/`.

App anchors: `packages/api-core` domain schemas, `apps/api` `decodeSqlRow` / `Schema.encodeKeys`.

## Prefer Schema for untrusted data

- Do **not** hand-parse with predicates or ad-hoc casts at trust boundaries.
- Decode with Schema; derive types with `Schema.Schema.Type<typeof X>` / class `.Type`.

## Constructors used in this repo

| Pattern | Use |
|---------|-----|
| `Schema.Class<T>('Name')({ … })` | Domain records (`Email`, `Decision`, `Inbox`, …) — name is the OpenAPI `identifier` |
| `Schema.TaggedErrorClass<E>()('Tag', { … }, { httpApiStatus })` | HTTP/domain errors |
| `Schema.Literals([…]).annotate({ identifier, description })` | Closed string unions |
| `Schema.String.pipe(Schema.check(Schema.isNonEmpty()))` | Branded-ish non-empty ids (`EmailId`, …) |
| `Schema.NullOr(X)` | SQL-nullable fields (Postgres returns `null`, not missing keys) |
| `Schema.optional(X)` / `Schema.optionalKey(X)` | Truly optional JSON / query keys |
| `Schema.Array(X)`, `Schema.Record(…)` | Collections |
| `.annotate({ identifier, description })` | OpenAPI / docs metadata |

## Encoding and decoding

- HTTP: endpoint codecs decode params/payload for you — do not `decodeUnknownSync` again in handlers.
- SQL rows: `Domain.pipe(Schema.encodeKeys({ camel: 'snake' }))` then `decodeSqlRow(...)` in repos (sync decode at the repo boundary is intentional).
- Prefer Effectful decode in request/service paths when you must decode manually.

## Errors

```ts
export class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  'NotFound',
  { id: Schema.String },
  { httpApiStatus: 404 }
) {}
```

Fail with `Effect.fail(new NotFound({ id }))` when the error is declared on the HttpApi endpoint.

## Transformations

- Prefer Schema transformations / `encodeKeys` over mapping fields by hand.
- Keep wire shapes in `api-core`; keep persistence remap at the repo edge.

## Avoid

- Plain interfaces for wire types that should be Schema (OpenAPI / decode boundary).
- `Schema.optional(X)` alone for SQL NULL columns — use `Schema.NullOr(X)`.
- Importing Schema helpers from `repos/effect-smol` — use catalog `effect`.
- Re-learning Schema from the web when `repos/effect-smol` and this file exist.
