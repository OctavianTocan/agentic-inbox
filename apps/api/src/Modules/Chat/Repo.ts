import { EmailId } from '@app/api-core/Modules/Emails/Domain';
import { PgClient } from '@effect/sql-pg';
import { Context, DateTime, Effect, Layer, Schema } from 'effect';
import { decodeSqlRow } from '@/Infrastructure/Database/DecodeSqlRow';
import { DatabaseLive } from '@/Infrastructure/Database/Postgres';
import type { EmailIdType } from '@/Lib/Ids';

/** Lifecycle of a stored agent conversation. */
export const ConversationStatus: Schema.Literals<
  readonly ['active', 'awaiting_approval', 'complete']
> = Schema.Literals(['active', 'awaiting_approval', 'complete']);

/** The tool approval a paused conversation is blocked on, if any. */
export const PendingApproval = Schema.Struct({
  approvalId: Schema.String,
  toolCallId: Schema.String
});

export type PendingApproval = Schema.Schema.Type<typeof PendingApproval>;

/** A persisted agent conversation: its encoded prompt state and any pending approval. */
export const ConversationRecord = Schema.Struct({
  id: Schema.String,
  status: ConversationStatus,
  prompt: Schema.Unknown,
  pending: Schema.NullOr(PendingApproval),
  emailId: Schema.NullOr(EmailId),
  createdAt: Schema.String,
  updatedAt: Schema.String
}).pipe(
  Schema.encodeKeys({
    emailId: 'email_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  })
);

export type ConversationRecord = Schema.Schema.Type<typeof ConversationRecord>;

/** Fields supplied when persisting a conversation; id and timestamps are managed by the repo on insert. */
export type SaveConversation = {
  readonly id?: string | undefined;
  readonly status: Schema.Schema.Type<typeof ConversationStatus>;
  readonly prompt: unknown;
  readonly pending?: PendingApproval | null | undefined;
  readonly emailId?: EmailIdType | null | undefined;
};

const conversationColumns =
  'id, status, prompt, pending, email_id, created_at, updated_at';

const decodeConversation = decodeSqlRow(ConversationRecord);

/** Persistence for agent conversations so paused approvals survive restarts. */
export class ConversationsRepo extends Context.Service<
  ConversationsRepo,
  {
    readonly save: (
      input: SaveConversation
    ) => Effect.Effect<ConversationRecord>;
    readonly get: (id: string) => Effect.Effect<ConversationRecord | null>;
    readonly listAwaitingApproval: () => Effect.Effect<
      ReadonlyArray<ConversationRecord>
    >;
    readonly claimApproval: (
      approvalId: string
    ) => Effect.Effect<ConversationRecord | null>;
    readonly deleteByEmail: (emailId: EmailIdType) => Effect.Effect<void>;
    readonly deleteTriage: () => Effect.Effect<void>;
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
      return decodeConversation(rows[0]);
    });

    const get = Effect.fn('ConversationsRepo.get')(function* (id: string) {
      const rows = yield* getById(id);
      return rows[0] ? decodeConversation(rows[0]) : null;
    });

    const listAwaitingApproval = Effect.fn(
      'ConversationsRepo.listAwaitingApproval'
    )(function* () {
      const rows =
        yield* sql`SELECT ${sql.literal(conversationColumns)} FROM conversations WHERE status = 'awaiting_approval' ORDER BY created_at ASC`.pipe(
          Effect.orDie
        );
      return rows.map((row) => decodeConversation(row));
    });

    const claimApproval = Effect.fn('ConversationsRepo.claimApproval')(
      function* (approvalId: string) {
        const now = yield* DateTime.now;
        const ts = DateTime.formatIso(now);
        const rows = yield* sql`
          WITH target AS (
            SELECT ${sql.literal(conversationColumns)}
            FROM conversations
            WHERE status = 'awaiting_approval'
              AND pending ->> 'approvalId' = ${approvalId}
            FOR UPDATE
          ),
          updated AS (
            UPDATE conversations
            SET status = 'active',
                pending = NULL,
                updated_at = ${ts}
            WHERE id IN (SELECT id FROM target)
            RETURNING id, status, prompt, pending, email_id, created_at, updated_at
          )
          SELECT
            updated.id,
            updated.status,
            target.prompt,
            target.pending,
            updated.email_id,
            updated.created_at,
            updated.updated_at
          FROM updated
          JOIN target ON target.id = updated.id
        `.pipe(sql.withTransaction, Effect.orDie);

        return rows[0] ? decodeConversation(rows[0]) : null;
      }
    );

    const deleteByEmail = Effect.fn('ConversationsRepo.deleteByEmail')(
      function* (emailId: EmailIdType) {
        yield* sql`DELETE FROM conversations WHERE email_id = ${emailId}`.pipe(
          Effect.orDie
        );
      }
    );

    const deleteTriage = Effect.fn('ConversationsRepo.deleteTriage')(
      function* () {
        yield* sql`DELETE FROM conversations WHERE email_id IS NOT NULL`.pipe(
          Effect.orDie
        );
      }
    );

    return {
      save,
      get,
      listAwaitingApproval,
      claimApproval,
      deleteByEmail,
      deleteTriage
    } as const;
  })
);

/** Production `ConversationsRepo` backed by Postgres. */
export const ConversationsRepoLive = Layer.provide(
  ConversationsRepoBody,
  DatabaseLive
);
