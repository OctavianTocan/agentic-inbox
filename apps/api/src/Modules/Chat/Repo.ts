import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type { EmailIdType } from '@/Lib/Ids';

/** Lifecycle of a stored agent conversation. */
export const ConversationStatus: Schema.Literals<
  readonly ['active', 'paused', 'complete']
> = Schema.Literals(['active', 'paused', 'complete']);

/** The tool approval a paused conversation is blocked on, if any. */
export type PendingApproval = {
  readonly approvalId: string;
  readonly toolCallId: string;
};

/** A persisted agent conversation: its encoded prompt state and any pending approval. */
export type ConversationRecord = {
  readonly id: string;
  readonly status: Schema.Schema.Type<typeof ConversationStatus>;
  readonly prompt: unknown;
  readonly pending: PendingApproval | null;
  readonly emailId: EmailIdType | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Fields supplied when persisting a conversation; id and timestamps are managed by the repo on insert. */
export type SaveConversation = {
  readonly id?: string | undefined;
  readonly status: Schema.Schema.Type<typeof ConversationStatus>;
  readonly prompt: unknown;
  readonly pending?: PendingApproval | null | undefined;
  readonly emailId?: EmailIdType | null | undefined;
};

const decodeStatus = Schema.decodeUnknownSync(ConversationStatus);

const conversationColumns =
  'id, status, prompt, pending, email_id, created_at, updated_at';

/** Maps a SQL row to a `ConversationRecord`. */
const decodeConversation = (
  row: Record<string, unknown>
): ConversationRecord => ({
  id: row.id as string,
  status: decodeStatus(row.status),
  prompt: row.prompt,
  pending: (row.pending as PendingApproval | null) ?? null,
  emailId: (row.email_id as EmailIdType | null) ?? null,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string
});

/** Persistence for agent conversations so paused approvals survive restarts. */
export class ConversationsRepo extends Context.Service<
  ConversationsRepo,
  {
    readonly save: (
      input: SaveConversation
    ) => Effect.Effect<ConversationRecord>;
    readonly get: (id: string) => Effect.Effect<ConversationRecord | null>;
    readonly listPaused: () => Effect.Effect<ReadonlyArray<ConversationRecord>>;
  }
>()('@apps/api/Chat/ConversationsRepo') {}

/** `ConversationsRepo` without a client; wire with {@link ConversationsRepoLive} or a test DB layer. */
export const ConversationsRepoBody: Layer.Layer<
  ConversationsRepo,
  never,
  PgClient.PgClient
> = Layer.effect(
  ConversationsRepo,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const getById = (id: string) =>
      sql`SELECT ${sql.literal(conversationColumns)} FROM conversations WHERE id = ${id}`.pipe(
        Effect.orDie
      );

    const save = Effect.fn('ConversationsRepo.save')(function* (
      input: SaveConversation
    ) {
      const now = yield* DateTime.now;
      const ts = DateTime.formatIso(now);
      const id = input.id ?? (crypto.randomUUID() as string);
      const pending = input.pending ?? null;
      const emailId = input.emailId ?? null;

      yield* sql`
        INSERT INTO conversations (id, status, prompt, pending, email_id, created_at, updated_at)
        VALUES (${id}, ${input.status}, ${JSON.stringify(input.prompt)}::jsonb, ${pending === null ? null : JSON.stringify(pending)}::jsonb, ${emailId}, ${ts}, ${ts})
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          prompt = EXCLUDED.prompt,
          pending = EXCLUDED.pending,
          email_id = EXCLUDED.email_id,
          updated_at = EXCLUDED.updated_at
      `.pipe(sql.withTransaction, Effect.orDie);

      const rows = yield* getById(id);
      return decodeConversation(rows[0] as Record<string, unknown>);
    });

    const get = Effect.fn('ConversationsRepo.get')(function* (id: string) {
      const rows = yield* getById(id);
      return rows[0]
        ? decodeConversation(rows[0] as Record<string, unknown>)
        : null;
    });

    const listPaused = Effect.fn('ConversationsRepo.listPaused')(function* () {
      const rows =
        yield* sql`SELECT ${sql.literal(conversationColumns)} FROM conversations WHERE status = 'paused' ORDER BY created_at ASC`.pipe(
          Effect.orDie
        );
      return rows.map((row) =>
        decodeConversation(row as Record<string, unknown>)
      );
    });

    return { save, get, listPaused } as const;
  })
);

/** Production `ConversationsRepo` backed by Postgres. */
export const ConversationsRepoLive = Layer.provide(
  ConversationsRepoBody,
  DatabaseLive
);
