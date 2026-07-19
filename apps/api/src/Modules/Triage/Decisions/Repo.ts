//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces, module boundaries (Domain.ts / Errors.ts / Api.ts / Service.ts / Repo.ts), sub-modules, error shapes, Postgres persistence, or reviewing backend package layout in apps/api or packages/api-core. NOT for visual UI — use domain-design / domain-frontend."
// ---
//
// ## Repo surface (mutable aggregates)
//
// Persist whole entities. Services mutate in memory, then call `upsert` / `create`.
// Do **not** add per-field writers (`updateStatus`, `setPending`, `complete`, …).
//
// Canonical shape (see `$$file`):
//
// - `upsert` / `create`
// - `get` / `list*`
// - `deleteByEmail` / `deleteAll` (demo wipe)
//
// Append-only stores (action ledger) use `append` instead of upsert.
// Atomic claim/CAS methods are OK when concurrency requires them — not as a substitute for upsert.
//
// ## Sub-modules
//
// When a module needs a second Domain/Repo aggregate, nest it:
// `Modules/Triage/Decisions/`, `Modules/Triage/Runs/` — mirror in `packages/api-core`
// (`Triage/Runs/Domain.ts`). Prefer that over a second flat `Repo.ts` at the parent.
//
// ## Example: Schema row decode in `$$file`
//
// `DecisionFromRow = Decision.pipe(Schema.encodeKeys({…}))` then
// `decodeSqlRow(DecisionFromRow)` — see also `Infrastructure/Database/DecodeSqlRow.ts`.
//</skill-gen>

import { Decision } from '@app/api-core/Modules/Triage/Domain';
import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { decodeSqlRow } from '@/Infrastructure/Database/DecodeSqlRow';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type { EmailIdType } from '@/Lib/Ids';

/** SQL row → `Decision` (snake_case encoded keys). */
const DecisionFromRow = Decision.pipe(
  Schema.encodeKeys({
    emailId: 'email_id',
    whyPreview: 'why_preview',
    keyFacts: 'key_facts',
    isSensitive: 'is_sensitive',
    policyReasons: 'policy_reasons'
  })
);

const decodeDecision = decodeSqlRow(DecisionFromRow);
/** Persistence for per-email triage decisions, keyed by email id. */
export class DecisionsRepo extends Context.Service<
  DecisionsRepo,
  {
    readonly upsert: (decision: Decision) => Effect.Effect<Decision>;
    readonly get: (emailId: EmailIdType) => Effect.Effect<Decision | null>;
    readonly list: () => Effect.Effect<ReadonlyArray<Decision>>;
    readonly deleteByEmail: (emailId: EmailIdType) => Effect.Effect<void>;
    readonly deleteAll: () => Effect.Effect<void>;
  }
>()('@apps/api/Triage/DecisionsRepo') {}

/** `DecisionsRepo` without a client; wire with {@link DecisionsRepoLive} or a test DB layer. */
export const DecisionsRepoBody: Layer.Layer<
  DecisionsRepo,
  never,
  PgClient.PgClient
> = Layer.effect(
  DecisionsRepo,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const upsert = Effect.fn('DecisionsRepo.upsert')(function* (
      decision: Decision
    ) {
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);

      yield* sql`
        INSERT INTO decisions
          (email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive, created_at, policy_reasons)
        VALUES (
          ${decision.emailId}, ${decision.category}, ${decision.severity}, ${decision.confidence},
          ${decision.whyPreview}, ${decision.rationale}, ${JSON.stringify(decision.keyFacts)}::jsonb,
          ${decision.isSensitive}, ${ts}, ${JSON.stringify(decision.policyReasons)}::jsonb
        )
        ON CONFLICT (email_id) DO UPDATE SET
          category = EXCLUDED.category,
          severity = EXCLUDED.severity,
          confidence = EXCLUDED.confidence,
          why_preview = EXCLUDED.why_preview,
          rationale = EXCLUDED.rationale,
          key_facts = EXCLUDED.key_facts,
          is_sensitive = EXCLUDED.is_sensitive,
          policy_reasons = EXCLUDED.policy_reasons
      `.pipe(sql.withTransaction, Effect.orDie);

      const rows = yield* sql`
        SELECT email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive, policy_reasons
        FROM decisions WHERE email_id = ${decision.emailId}
      `.pipe(Effect.orDie);
      return decodeDecision(rows[0]);
    });

    const get = Effect.fn('DecisionsRepo.get')(function* (
      emailId: EmailIdType
    ) {
      const rows = yield* sql`
        SELECT email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive, policy_reasons
        FROM decisions WHERE email_id = ${emailId}
      `.pipe(Effect.orDie);
      return rows[0] ? decodeDecision(rows[0]) : null;
    });

    const list = Effect.fn('DecisionsRepo.list')(function* () {
      const rows = yield* sql`
        SELECT email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive, policy_reasons
        FROM decisions ORDER BY created_at ASC
      `.pipe(Effect.orDie);
      return rows.map((row) => decodeDecision(row));
    });

    const deleteByEmail = Effect.fn('DecisionsRepo.deleteByEmail')(function* (
      emailId: EmailIdType
    ) {
      yield* sql`DELETE FROM decisions WHERE email_id = ${emailId}`.pipe(
        Effect.orDie
      );
    });

    const deleteAll = Effect.fn('DecisionsRepo.deleteAll')(function* () {
      yield* sql`DELETE FROM decisions`.pipe(Effect.orDie);
    });

    return { upsert, get, list, deleteByEmail, deleteAll } as const;
  })
);

/** Production `DecisionsRepo` backed by Postgres. */
export const DecisionsRepoLive = Layer.provide(DecisionsRepoBody, DatabaseLive);
