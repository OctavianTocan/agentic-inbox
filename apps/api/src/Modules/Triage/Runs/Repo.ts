import { TriageRun } from '@app/api-core/Modules/Triage/Runs/Domain';
import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { decodeSqlRow } from '@/Infrastructure/Database/DecodeSqlRow';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type { EmailIdType, RunIdType } from '@/Lib/Ids';

//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// ## Example: Triage runs sub-module
//
// `$$directory` holds the runs aggregate. Repo methods are whole-entity only
// (`create` / `upsert` / `get` / optional `listByEmail` / wipe deletes).
// Status and pending transitions belong in `TriageService` / the engine, which
// build an updated `TriageRun` and upsert — never `updateStatus` on the repo.
// Public HTTP stays intent-shaped (`run triage`, `resume by runId`), not CRUD on runs.
//</skill-gen>

const runColumns =
  'id, email_id, status, proposal, proposal_summary, pending, decision_snapshot, policy_version, prompt_version, graph_version, error, created_at, updated_at';

const jsonOrNull = (value: unknown): string | null =>
  value === undefined ? null : JSON.stringify(value);

/** SQL row → `TriageRun` (snake_case encoded keys; NULL optionals stripped). */
const TriageRunFromRow = TriageRun.pipe(
  Schema.encodeKeys({
    emailId: 'email_id',
    proposalSummary: 'proposal_summary',
    decisionSnapshot: 'decision_snapshot',
    policyVersion: 'policy_version',
    promptVersion: 'prompt_version',
    graphVersion: 'graph_version',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  })
);

const decodeRun = decodeSqlRow(TriageRunFromRow, ['error']);

/** Persistence for triage runs (one attempt per `runId` / thread id). */
export class TriageRunsRepo extends Context.Service<
  TriageRunsRepo,
  {
    readonly create: (run: TriageRun) => Effect.Effect<TriageRun>;
    readonly upsert: (run: TriageRun) => Effect.Effect<TriageRun>;
    readonly get: (id: RunIdType) => Effect.Effect<TriageRun | null>;
    readonly listByEmail: (
      emailId: EmailIdType
    ) => Effect.Effect<ReadonlyArray<TriageRun>>;
    readonly deleteByEmail: (emailId: EmailIdType) => Effect.Effect<void>;
    readonly deleteAll: () => Effect.Effect<void>;
  }
>()('@apps/api/Triage/Runs/TriageRunsRepo') {}

/** `TriageRunsRepo` without a client; wire with {@link TriageRunsRepoLive} or a test DB layer. */
export const TriageRunsRepoBody: Layer.Layer<
  TriageRunsRepo,
  never,
  PgClient.PgClient
> = Layer.effect(
  TriageRunsRepo,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const getById = (id: RunIdType) =>
      sql`SELECT ${sql.literal(runColumns)} FROM triage_runs WHERE id = ${id}`.pipe(
        Effect.orDie
      );

    const create = Effect.fn('TriageRunsRepo.create')(function* (
      run: TriageRun
    ) {
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);

      yield* sql`
        INSERT INTO triage_runs
          (id, email_id, status, proposal, proposal_summary, pending, decision_snapshot, policy_version, prompt_version, graph_version, error, created_at, updated_at)
        VALUES (
          ${run.id},
          ${run.emailId},
          ${run.status},
          ${run.proposal},
          ${run.proposalSummary},
          ${jsonOrNull(run.pending)}::jsonb,
          ${jsonOrNull(run.decisionSnapshot)}::jsonb,
          ${run.policyVersion ?? null},
          ${run.promptVersion ?? null},
          ${run.graphVersion ?? null},
          ${jsonOrNull(run.error)},
          ${ts},
          ${ts}
        )
      `.pipe(sql.withTransaction, Effect.orDie);

      const rows = yield* getById(run.id);
      return decodeRun(rows[0]);
    });

    const upsert = Effect.fn('TriageRunsRepo.upsert')(function* (
      run: TriageRun
    ) {
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);

      yield* sql`
        INSERT INTO triage_runs
          (id, email_id, status, proposal, proposal_summary, pending, decision_snapshot, policy_version, prompt_version, graph_version, error, created_at, updated_at)
        VALUES (
          ${run.id},
          ${run.emailId},
          ${run.status},
          ${run.proposal},
          ${run.proposalSummary},
          ${jsonOrNull(run.pending)}::jsonb,
          ${jsonOrNull(run.decisionSnapshot)}::jsonb,
          ${run.policyVersion ?? null},
          ${run.promptVersion ?? null},
          ${run.graphVersion ?? null},
          ${jsonOrNull(run.error)},
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

      const rows = yield* getById(run.id);
      return decodeRun(rows[0]);
    });

    const get = Effect.fn('TriageRunsRepo.get')(function* (id: RunIdType) {
      const rows = yield* getById(id);
      return rows[0] ? decodeRun(rows[0]) : null;
    });

    const listByEmail = Effect.fn('TriageRunsRepo.listByEmail')(function* (
      emailId: EmailIdType
    ) {
      const rows = yield* sql`
        SELECT ${sql.literal(runColumns)}
        FROM triage_runs
        WHERE email_id = ${emailId}
        ORDER BY created_at ASC
      `.pipe(Effect.orDie);
      return rows.map((row) => decodeRun(row));
    });

    const deleteByEmail = Effect.fn('TriageRunsRepo.deleteByEmail')(function* (
      emailId: EmailIdType
    ) {
      yield* sql`DELETE FROM triage_runs WHERE email_id = ${emailId}`.pipe(
        Effect.orDie
      );
    });

    const deleteAll = Effect.fn('TriageRunsRepo.deleteAll')(function* () {
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

/** Production `TriageRunsRepo` backed by Postgres. */
export const TriageRunsRepoLive = Layer.provide(
  TriageRunsRepoBody,
  DatabaseLive
);
