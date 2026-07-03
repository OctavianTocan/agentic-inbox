import {
  Category,
  Confidence,
  Decision,
  Severity,
  WhyPreview
} from '@app/api-core/Modules/Triage/Domain';
import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type { EmailIdType } from '@/Lib/Ids';

const decodeCategory = Schema.decodeUnknownSync(Category);
const decodeSeverity = Schema.decodeUnknownSync(Severity);
const decodeConfidence = Schema.decodeUnknownSync(Confidence);
const decodeWhyPreview = Schema.decodeUnknownSync(WhyPreview);

/** Maps a SQL row to a `Decision`. */
const decodeDecision = (row: Record<string, unknown>): Decision =>
  new Decision({
    emailId: row.email_id as EmailIdType,
    category: decodeCategory(row.category),
    severity: decodeSeverity(row.severity),
    confidence: decodeConfidence(row.confidence),
    whyPreview: decodeWhyPreview(row.why_preview),
    rationale: row.rationale as string,
    keyFacts: row.key_facts as ReadonlyArray<string>,
    isSensitive: row.is_sensitive as boolean
  });

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
          (email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive, created_at)
        VALUES (
          ${decision.emailId}, ${decision.category}, ${decision.severity}, ${decision.confidence},
          ${decision.whyPreview}, ${decision.rationale}, ${JSON.stringify(decision.keyFacts)}::jsonb,
          ${decision.isSensitive}, ${ts}
        )
        ON CONFLICT (email_id) DO UPDATE SET
          category = EXCLUDED.category,
          severity = EXCLUDED.severity,
          confidence = EXCLUDED.confidence,
          why_preview = EXCLUDED.why_preview,
          rationale = EXCLUDED.rationale,
          key_facts = EXCLUDED.key_facts,
          is_sensitive = EXCLUDED.is_sensitive
      `.pipe(sql.withTransaction, Effect.orDie);

      const rows = yield* sql`
        SELECT email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive
        FROM decisions WHERE email_id = ${decision.emailId}
      `.pipe(Effect.orDie);
      return decodeDecision(rows[0] as Record<string, unknown>);
    });

    const get = Effect.fn('DecisionsRepo.get')(function* (
      emailId: EmailIdType
    ) {
      const rows = yield* sql`
        SELECT email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive
        FROM decisions WHERE email_id = ${emailId}
      `.pipe(Effect.orDie);
      return rows[0]
        ? decodeDecision(rows[0] as Record<string, unknown>)
        : null;
    });

    const list = Effect.fn('DecisionsRepo.list')(function* () {
      const rows = yield* sql`
        SELECT email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive
        FROM decisions ORDER BY created_at ASC
      `.pipe(Effect.orDie);
      return rows.map((row) => decodeDecision(row as Record<string, unknown>));
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
