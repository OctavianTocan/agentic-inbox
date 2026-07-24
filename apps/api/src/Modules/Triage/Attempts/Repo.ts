import { Attempt } from '@app/api-core/Modules/Triage/Attempts/Domain';
import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { decodeSqlRow } from '@/Infrastructure/Database/DecodeSqlRow';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type { AttemptIdType, EmailIdType } from '@/Lib/Ids';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and docs/agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// ## Example: Attempts sub-module
//
// `$$directory` holds the attempts aggregate. Repo methods are whole-entity only
// (`create` / `upsert` / `get` / optional `listByEmail` / wipe deletes).
// Status and pending transitions belong in InboxOrchestrator, which
// build an updated `Attempt` and upsert — never `updateStatus` on the repo.
//</skill-gen>

const runColumns =
  'id, email_id, status, proposal, proposal_summary, pending, decision_snapshot, policy_version, prompt_version, graph_version, error, created_at, updated_at';

const jsonOrNull = (value: unknown): string | null =>
  value === undefined ? null : JSON.stringify(value);

/** SQL row → `Attempt` (snake_case encoded keys; NULL optionals stripped). */
const AttemptFromRow = Attempt.pipe(
  Schema.encodeKeys({
    emailId: 'email_id',
    nextAction: 'proposal',
    proposalSummary: 'proposal_summary',
    decisionSnapshot: 'decision_snapshot',
    policyVersion: 'policy_version',
    promptVersion: 'prompt_version',
    graphVersion: 'graph_version',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  })
);

const decodeAttempt = decodeSqlRow(AttemptFromRow, ['error']);

/** Persistence for triage attempts (one attempt per id / thread id). */
export class AttemptsRepo extends Context.Service<
  AttemptsRepo,
  {
    readonly create: (attempt: Attempt) => Effect.Effect<Attempt>;
    readonly upsert: (attempt: Attempt) => Effect.Effect<Attempt>;
    readonly get: (id: AttemptIdType) => Effect.Effect<Attempt | null>;
    readonly listByEmail: (
      emailId: EmailIdType
    ) => Effect.Effect<ReadonlyArray<Attempt>>;
    readonly deleteByEmail: (emailId: EmailIdType) => Effect.Effect<void>;
    readonly deleteAll: () => Effect.Effect<void>;
  }
>()('@apps/api/Triage/Attempts/AttemptsRepo') {}

/** `AttemptsRepo` without a client; wire with {@link AttemptsRepoLive} or a test DB layer. */
export const AttemptsRepoBody: Layer.Layer<
  AttemptsRepo,
  never,
  PgClient.PgClient
> = Layer.effect(
  AttemptsRepo,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const getById = (id: AttemptIdType) =>
      sql`SELECT ${sql.literal(runColumns)} FROM triage_runs WHERE id = ${id}`.pipe(
        Effect.orDie
      );

    const create = Effect.fn('AttemptsRepo.create')(function* (
      attempt: Attempt
    ) {
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);

      yield* sql`
        INSERT INTO triage_runs
          (id, email_id, status, proposal, proposal_summary, pending, decision_snapshot, policy_version, prompt_version, graph_version, error, created_at, updated_at)
        VALUES (
          ${attempt.id},
          ${attempt.emailId},
          ${attempt.status},
          ${attempt.nextAction},
          ${attempt.proposalSummary},
          ${jsonOrNull(attempt.pending)}::jsonb,
          ${jsonOrNull(attempt.decisionSnapshot)}::jsonb,
          ${attempt.policyVersion ?? null},
          ${attempt.promptVersion ?? null},
          ${attempt.graphVersion ?? null},
          ${jsonOrNull(attempt.error)},
          ${ts},
          ${ts}
        )
      `.pipe(sql.withTransaction, Effect.orDie);

      const rows = yield* getById(attempt.id);
      return decodeAttempt(rows[0]);
    });

    const upsert = Effect.fn('AttemptsRepo.upsert')(function* (
      attempt: Attempt
    ) {
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);

      yield* sql`
        INSERT INTO triage_runs
          (id, email_id, status, proposal, proposal_summary, pending, decision_snapshot, policy_version, prompt_version, graph_version, error, created_at, updated_at)
        VALUES (
          ${attempt.id},
          ${attempt.emailId},
          ${attempt.status},
          ${attempt.nextAction},
          ${attempt.proposalSummary},
          ${jsonOrNull(attempt.pending)}::jsonb,
          ${jsonOrNull(attempt.decisionSnapshot)}::jsonb,
          ${attempt.policyVersion ?? null},
          ${attempt.promptVersion ?? null},
          ${attempt.graphVersion ?? null},
          ${jsonOrNull(attempt.error)},
          ${ts},
          ${ts}
        )
        ON CONFLICT (id) DO UPDATE SET
          email_id = EXCLUDED.email_id,
          status = EXCLUDED.status,
          proposal = EXCLUDED.proposal,
          proposal_summary = EXCLUDED.proposal_summary,
          pending = EXCLUDED.pending,
          decision_snapshot = EXCLUDED.decision_snapshot,
          policy_version = EXCLUDED.policy_version,
          prompt_version = EXCLUDED.prompt_version,
          graph_version = EXCLUDED.graph_version,
          error = EXCLUDED.error,
          updated_at = EXCLUDED.updated_at
      `.pipe(sql.withTransaction, Effect.orDie);

      const rows = yield* getById(attempt.id);
      return decodeAttempt(rows[0]);
    });

    const get = Effect.fn('AttemptsRepo.get')(function* (id: AttemptIdType) {
      const rows = yield* getById(id);
      return rows[0] ? decodeAttempt(rows[0]) : null;
    });

    const listByEmail = Effect.fn('AttemptsRepo.listByEmail')(function* (
      emailId: EmailIdType
    ) {
      const rows = yield* sql`
        SELECT ${sql.literal(runColumns)}
        FROM triage_runs
        WHERE email_id = ${emailId}
        ORDER BY created_at ASC
      `.pipe(Effect.orDie);
      return rows.map((row) => decodeAttempt(row));
    });

    const deleteByEmail = Effect.fn('AttemptsRepo.deleteByEmail')(function* (
      emailId: EmailIdType
    ) {
      yield* sql`DELETE FROM triage_runs WHERE email_id = ${emailId}`.pipe(
        Effect.orDie
      );
    });

    const deleteAll = Effect.fn('AttemptsRepo.deleteAll')(function* () {
      yield* sql`DELETE FROM triage_runs`.pipe(Effect.orDie);
    });

    return {
      create,
      upsert,
      get,
      listByEmail,
      deleteByEmail,
      deleteAll
    } as const;
  })
);

/** Production `AttemptsRepo` backed by Postgres. */
export const AttemptsRepoLive = Layer.provide(AttemptsRepoBody, DatabaseLive);
