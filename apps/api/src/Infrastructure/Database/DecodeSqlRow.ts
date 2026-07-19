import { Schema } from 'effect';
import * as SchemaTransformation from 'effect/SchemaTransformation';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces, module boundaries (Domain.ts / Errors.ts / Api.ts / Service.ts / Repo.ts), sub-modules, error shapes, Postgres persistence, or reviewing backend package layout in apps/api or packages/api-core. NOT for visual UI — use domain-design / domain-frontend."
// ---
//
// ## SQL row → domain (Effect Schema)
//
// Repos must not hand-map Postgres rows with `as` casts or `new Domain({ … row.email_id … })`.
// Decode through Effect Schema at the repo boundary:
//
// 1. Start from the api-core domain schema (`Schema.Class` / `Schema.Struct`).
// 2. Remap snake_case columns with `Schema.encodeKeys({ emailId: 'email_id', … })`.
// 3. Decode with `decodeSqlRow` from `$$file` (wraps `Schema.decodeUnknownSync` + optional TEXT→JSON parse).
//
// Canonical example (see Decisions / Actions / Runs / Chat repos):
//
// ```ts
// const DecisionFromRow = Decision.pipe(
//   Schema.encodeKeys({
//     emailId: 'email_id',
//     whyPreview: 'why_preview',
//     keyFacts: 'key_facts',
//     isSensitive: 'is_sensitive',
//     policyReasons: 'policy_reasons'
//   })
// )
// const decodeDecision = decodeSqlRow(DecisionFromRow)
// ```
//
// ### SQL NULL vs `Schema.optional`
//
// Postgres returns JS `null`. Bare `Schema.optional(X)` expects the key absent / `undefined`,
// not `null`. For nullable columns use:
//
// - `Schema.NullOr(X)` when the domain value is `X | null`
// - `Schema.optional(Schema.NullOr(X))` when both omit and SQL NULL are allowed
//
// Do **not** strip nulls in a generic row transform before decode — that breaks `NullOr` fields
// that require the key to be present as `null`.
//
// ### Sync decode exception
//
// `decodeUnknownSync` inside repos via `decodeSqlRow` is the intended pattern.
// Do not use sync Schema decode in HTTP handlers or agent loops — keep those Effect-shaped.
//</skill-gen>

/**
 * Prep a SQL row for Schema decode: parse TEXT columns that store JSON.
 * Does **not** drop `null` — use `Schema.NullOr` / `Schema.optional(Schema.NullOr(...))`
 * on the domain schema so SQL NULL is a first-class encoded value.
 */
export const sqlRowTransform = (
  jsonTextKeys: ReadonlyArray<string> = []
): ReturnType<typeof SchemaTransformation.transform> =>
  SchemaTransformation.transform({
    decode: (row: unknown) => {
      if (
        jsonTextKeys.length === 0 ||
        row === null ||
        typeof row !== 'object' ||
        Array.isArray(row)
      ) {
        return row;
      }
      const out: Record<string, unknown> = { ...row };
      for (const key of jsonTextKeys) {
        const value = out[key];
        if (typeof value === 'string') {
          out[key] = JSON.parse(value);
        }
      }
      return out;
    },
    encode: (row: unknown) => row
  });

/**
 * Decode an unknown SQL row through `schema` (prefer `Schema.encodeKeys` for
 * snake_case column names).
 */
export const decodeSqlRow = <A>(
  schema: Schema.Codec<A, unknown>,
  jsonTextKeys: ReadonlyArray<string> = []
): ((row: unknown) => A) =>
  Schema.decodeUnknownSync(
    Schema.Unknown.pipe(
      Schema.decodeTo(
        schema as Schema.Codec<A, unknown>,
        sqlRowTransform(jsonTextKeys)
      )
    )
  );
