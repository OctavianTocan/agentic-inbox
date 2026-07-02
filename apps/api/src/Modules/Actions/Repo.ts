import {
  ActionKind,
  Actor,
  LedgerEntry
} from '@app/api-core/Modules/Actions/Domain';
import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type {
  ActionKindType,
  ActorType,
  EmailIdType,
  LedgerEntryIdType
} from '@/Lib/Ids';

const decodeActor = Schema.decodeUnknownSync(Actor);
const decodeAction = Schema.decodeUnknownSync(ActionKind);

const ledgerColumns =
  'id, actor, email_id, action, summary, payload, undone_by, undoes, created_at';

/** Maps a SQL row to a `LedgerEntry`. */
const decodeEntry = (row: Record<string, unknown>): LedgerEntry =>
  new LedgerEntry({
    id: row.id as LedgerEntryIdType,
    actor: decodeActor(row.actor),
    emailId: row.email_id as EmailIdType,
    action: decodeAction(row.action),
    summary: row.summary as string,
    payload: row.payload as Record<string, unknown>,
    undoneBy: (row.undone_by as LedgerEntryIdType | null) ?? null,
    undoes: (row.undoes as LedgerEntryIdType | null) ?? null,
    createdAt: row.created_at as string
  });

/** Fields an actor supplies when appending an action; id, timestamp, and undo pointers are set by the repo. */
export type AppendLedgerEntry = {
  readonly actor: ActorType;
  readonly emailId: EmailIdType;
  readonly action: ActionKindType;
  readonly summary: string;
  readonly payload: Record<string, unknown>;
  readonly undoes?: LedgerEntryIdType | undefined;
};

/** Append-only store of executed actions with undo linkage; powers the trace and undo. */
export class ActionLedgerRepo extends Context.Service<
  ActionLedgerRepo,
  {
    readonly append: (entry: AppendLedgerEntry) => Effect.Effect<LedgerEntry>;
    readonly get: (id: LedgerEntryIdType) => Effect.Effect<LedgerEntry | null>;
    readonly listByEmail: (
      emailId: EmailIdType
    ) => Effect.Effect<ReadonlyArray<LedgerEntry>>;
    readonly list: () => Effect.Effect<ReadonlyArray<LedgerEntry>>;
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

      // An undo entry inserts itself and stamps the original's undone_by
      // pointer in one transaction, so the two rows always agree.
      yield* Effect.gen(function* () {
        yield* sql`
          INSERT INTO action_ledger (id, actor, email_id, action, summary, payload, undoes, created_at)
          VALUES (${id}, ${entry.actor}, ${entry.emailId}, ${entry.action}, ${entry.summary}, ${JSON.stringify(entry.payload)}::jsonb, ${undoesId}, ${ts})
        `;
        if (undoesId !== null) {
          yield* sql`UPDATE action_ledger SET undone_by = ${id} WHERE id = ${undoesId}`;
        }
      }).pipe(sql.withTransaction, Effect.orDie);

      const rows = yield* getById(id);
      return decodeEntry(rows[0] as Record<string, unknown>);
    });

    const get = Effect.fn('ActionLedgerRepo.get')(function* (
      id: LedgerEntryIdType
    ) {
      const rows = yield* getById(id);
      return rows[0] ? decodeEntry(rows[0] as Record<string, unknown>) : null;
    });

    const listByEmail = Effect.fn('ActionLedgerRepo.listByEmail')(function* (
      emailId: EmailIdType
    ) {
      const rows =
        yield* sql`SELECT ${sql.literal(ledgerColumns)} FROM action_ledger WHERE email_id = ${emailId} ORDER BY created_at DESC`.pipe(
          Effect.orDie
        );
      return rows.map((row) => decodeEntry(row as Record<string, unknown>));
    });

    const list = Effect.fn('ActionLedgerRepo.list')(function* () {
      const rows =
        yield* sql`SELECT ${sql.literal(ledgerColumns)} FROM action_ledger ORDER BY created_at DESC`.pipe(
          Effect.orDie
        );
      return rows.map((row) => decodeEntry(row as Record<string, unknown>));
    });

    return { append, get, listByEmail, list } as const;
  })
);

/** Production `ActionLedgerRepo` backed by Postgres. */
export const ActionLedgerRepoLive = Layer.provide(
  ActionLedgerRepoBody,
  DatabaseLive
);
