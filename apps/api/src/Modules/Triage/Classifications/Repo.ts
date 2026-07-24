import { Classification } from '@app/api-core/Modules/Triage/Domain';
import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { decodeSqlRow } from '@/Infrastructure/Database/DecodeSqlRow';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type { EmailIdType } from '@/Lib/Ids';

/** SQL row → `Classification` (snake_case encoded keys). */
const ClassificationFromRow = Classification.pipe(
  Schema.encodeKeys({
    emailId: 'email_id',
    whyPreview: 'why_preview',
    keyFacts: 'key_facts',
    isSensitive: 'is_sensitive',
    policyReasons: 'policy_reasons'
  })
);

const decodeClassification = decodeSqlRow(ClassificationFromRow);

/** Persistence for per-email triage classifications, keyed by email id. */
export class ClassificationsRepo extends Context.Service<
  ClassificationsRepo,
  {
    readonly upsert: (
      classification: Classification
    ) => Effect.Effect<Classification>;
    readonly get: (
      emailId: EmailIdType
    ) => Effect.Effect<Classification | null>;
    readonly list: () => Effect.Effect<ReadonlyArray<Classification>>;
    readonly deleteByEmail: (emailId: EmailIdType) => Effect.Effect<void>;
    readonly deleteAll: () => Effect.Effect<void>;
  }
>()('@apps/api/Triage/ClassificationsRepo') {}

/** `ClassificationsRepo` without a client; wire with {@link ClassificationsRepoLive} or a test DB layer. */
export const ClassificationsRepoBody: Layer.Layer<
  ClassificationsRepo,
  never,
  PgClient.PgClient
> = Layer.effect(
  ClassificationsRepo,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const upsert = Effect.fn('ClassificationsRepo.upsert')(function* (
      classification: Classification
    ) {
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);

      yield* sql`
        INSERT INTO decisions
          (email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive, created_at, policy_reasons)
        VALUES (
          ${classification.emailId}, ${classification.category}, ${classification.severity}, ${classification.confidence},
          ${classification.whyPreview}, ${classification.rationale}, ${JSON.stringify(classification.keyFacts)}::jsonb,
          ${classification.isSensitive}, ${ts}, ${JSON.stringify(classification.policyReasons)}::jsonb
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
        FROM decisions WHERE email_id = ${classification.emailId}
      `.pipe(Effect.orDie);
      return decodeClassification(rows[0]);
    });

    const get = Effect.fn('ClassificationsRepo.get')(function* (
      emailId: EmailIdType
    ) {
      const rows = yield* sql`
        SELECT email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive, policy_reasons
        FROM decisions WHERE email_id = ${emailId}
      `.pipe(Effect.orDie);
      return rows[0] ? decodeClassification(rows[0]) : null;
    });

    const list = Effect.fn('ClassificationsRepo.list')(function* () {
      const rows = yield* sql`
        SELECT email_id, category, severity, confidence, why_preview, rationale, key_facts, is_sensitive, policy_reasons
        FROM decisions ORDER BY created_at ASC
      `.pipe(Effect.orDie);
      return rows.map((row) => decodeClassification(row));
    });

    const deleteByEmail = Effect.fn('ClassificationsRepo.deleteByEmail')(
      function* (emailId: EmailIdType) {
        yield* sql`DELETE FROM decisions WHERE email_id = ${emailId}`.pipe(
          Effect.orDie
        );
      }
    );

    const deleteAll = Effect.fn('ClassificationsRepo.deleteAll')(function* () {
      yield* sql`DELETE FROM decisions`.pipe(Effect.orDie);
    });

    return { upsert, get, list, deleteByEmail, deleteAll } as const;
  })
);

/** Production `ClassificationsRepo` backed by Postgres. */
export const ClassificationsRepoLive = Layer.provide(
  ClassificationsRepoBody,
  DatabaseLive
);
