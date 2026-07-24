import { LedgerEntry } from '@app/api-core/Modules/Actions/Domain';
import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { decodeSqlRow } from '@/Infrastructure/Database/DecodeSqlRow';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type {
  ActionKindType,
  ActorType,
  EmailIdType,
  LedgerEntryIdType,
  RunIdType
} from '@/Lib/Ids';

const ledgerColumns =
  'id, run_id, actor, email_id, action, action_revision, summary, payload, undone_by, undoes, created_at';

/** SQL row → `LedgerEntry` (snake_case encoded keys). */
const LedgerEntryFromRow = LedgerEntry.pipe(
  Schema.encodeKeys({
    runId: 'run_id',
    emailId: 'email_id',
    actionRevision: 'action_revision',
    undoneBy: 'undone_by',
    createdAt: 'created_at'
  })
);

const decodeEntry = decodeSqlRow(LedgerEntryFromRow);
/** Fields an actor supplies when appending an action; id, timestamp, and undo pointers are set by the repo. */
export type AppendLedgerEntry = {
  readonly actor: ActorType;
  readonly runId?: RunIdType | undefined;
  readonly emailId: EmailIdType;
  readonly action: ActionKindType;
  readonly actionRevision?: number | undefined;
  readonly summary: string;
  readonly payload: Record<string, unknown>;
  readonly undoes?: LedgerEntryIdType | undefined;
};

/** Append-only store of executed actions with undo linkage; powers the trace and undo. */
//<skill-gen>
// ---
// name: domain-backend
// description: "Use when designing Effect HTTP API surfaces (HttpApi, HttpApiClient, branded params, typed errors), Effect Config / AppConfig, module boundaries (Domain/Errors/Api/Service/Repo), sub-modules, Postgres persistence, or reviewing backend layout in apps/api or packages/api-core. Prefer repos/effect-smol and docs/agent-patterns/ for Effect idioms. NOT for visual UI."
// ---
//
// ## Append-only ledger exception
//
// `$$file` is not an upsert aggregate. Effects are immutable rows: use `append`
// (+ get/list/delete for wipe). Idempotency is `(run_id, action, action_revision)`
// at the DB layer, not an in-place update of a prior row.
//</skill-gen>
export class ActionLedgerRepo extends Context.Service<
  ActionLedgerRepo,
  {
    readonly append: (entry: AppendLedgerEntry) => Effect.Effect<LedgerEntry>;
    readonly get: (id: LedgerEntryIdType) => Effect.Effect<LedgerEntry | null>;
    readonly listByEmail: (
      emailId: EmailIdType
    ) => Effect.Effect<ReadonlyArray<LedgerEntry>>;
    readonly list: () => Effect.Effect<ReadonlyArray<LedgerEntry>>;
    readonly deleteByEmail: (emailId: EmailIdType) => Effect.Effect<void>;
    readonly deleteAll: () => Effect.Effect<void>;
  }
>()('@apps/api/Actions/ActionLedgerRepo') {}

/** `ActionLedgerRepo` without a client; wire with {@link ActionLedgerRepoLive} or a test DB layer. */
export const ActionLedgerRepoBody: Layer.Layer<
  ActionLedgerRepo,
  never,
  PgClient.PgClient
> = Layer.effect(
  ActionLedgerRepo,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const getById = (id: LedgerEntryIdType) =>
      sql`SELECT ${sql.literal(ledgerColumns)} FROM action_ledger WHERE id = ${id}`.pipe(
        Effect.orDie
      );

    const append = Effect.fn('ActionLedgerRepo.append')(function* (
      entry: AppendLedgerEntry
    ) {
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);
      const id = crypto.randomUUID() as LedgerEntryIdType;
      const undoesId = entry.undoes ?? null;
      const runId = entry.runId ?? null;
      const actionRevision = entry.actionRevision ?? 1;

      // An undo entry inserts itself and stamps the original's undone_by
      // pointer in one transaction, so the two rows always agree.
      yield* Effect.gen(function* () {
        yield* sql`
          INSERT INTO action_ledger (id, run_id, actor, email_id, action, action_revision, summary, payload, undoes, created_at)
          VALUES (${id}, ${runId}, ${entry.actor}, ${entry.emailId}, ${entry.action}, ${actionRevision}, ${entry.summary}, ${JSON.stringify(entry.payload)}::jsonb, ${undoesId}, ${ts})
        `;
        if (undoesId !== null) {
          yield* sql`UPDATE action_ledger SET undone_by = ${id} WHERE id = ${undoesId}`;
        }
      }).pipe(sql.withTransaction, Effect.orDie);

      const rows = yield* getById(id);
      return decodeEntry(rows[0]);
    });

    const get = Effect.fn('ActionLedgerRepo.get')(function* (
      id: LedgerEntryIdType
    ) {
      const rows = yield* getById(id);
      return rows[0] ? decodeEntry(rows[0]) : null;
    });

    const listByEmail = Effect.fn('ActionLedgerRepo.listByEmail')(function* (
      emailId: EmailIdType
    ) {
      const rows =
        yield* sql`SELECT ${sql.literal(ledgerColumns)} FROM action_ledger WHERE email_id = ${emailId} ORDER BY created_at DESC`.pipe(
          Effect.orDie
        );
      return rows.map((row) => decodeEntry(row));
    });

    const list = Effect.fn('ActionLedgerRepo.list')(function* () {
      const rows =
        yield* sql`SELECT ${sql.literal(ledgerColumns)} FROM action_ledger ORDER BY created_at DESC`.pipe(
          Effect.orDie
        );
      return rows.map((row) => decodeEntry(row));
    });

    const deleteByEmail = Effect.fn('ActionLedgerRepo.deleteByEmail')(
      function* (emailId: EmailIdType) {
        yield* sql`DELETE FROM action_ledger WHERE email_id = ${emailId}`.pipe(
          Effect.orDie
        );
      }
    );

    const deleteAll = Effect.fn('ActionLedgerRepo.deleteAll')(function* () {
      yield* sql`DELETE FROM action_ledger`.pipe(Effect.orDie);
    });

    return {
      append,
      get,
      listByEmail,
      list,
      deleteByEmail,
      deleteAll
    } as const;
  })
);

/** Production `ActionLedgerRepo` backed by Postgres. */
export const ActionLedgerRepoLive = Layer.provide(
  ActionLedgerRepoBody,
  DatabaseLive
);
