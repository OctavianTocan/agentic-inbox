import type { LedgerEntry } from '@app/api-core/Modules/Actions/Domain';
import {
  ActionNotFound,
  ActionNotUndoable
} from '@app/api-core/Modules/Actions/Errors';
import type { Classification } from '@app/api-core/Modules/Triage/Domain';
import { Context, Effect, Layer } from 'effect';
import type {
  ActorType,
  AttemptIdType,
  EmailIdType,
  LedgerEntryIdType
} from '@/Lib/Ids';
import { LedgerRepo, LedgerRepoLive } from './Repo';

/** Arguments for simulating a reply to an email. */
export type SendReplyInput = {
  readonly emailId: EmailIdType;
  readonly actor: ActorType;
  readonly body: string;
  readonly summary?: string | undefined;
  /** Attempt id when this mutation is part of a triage walk (wire: runId). */
  readonly runId?: AttemptIdType | undefined;
};

/** Arguments for archiving or flagging an email. */
export type FileInput = {
  readonly emailId: EmailIdType;
  readonly actor: ActorType;
  readonly summary?: string | undefined;
  /** Attempt id when this mutation is part of a triage walk (wire: runId). */
  readonly runId?: AttemptIdType | undefined;
};

/** Shared tool logic invoked by both agent toolkits and HTTP handlers; every mutation appends to the ledger. */
export class LedgerService extends Context.Service<
  LedgerService,
  {
    /**
     * Acknowledgment-only for the `record_triage` tool. Classification
     * persistence is owned by InboxOrchestrator.
     */
    readonly recordTriage: (
      classification: Classification
    ) => Effect.Effect<Classification>;
    readonly sendReply: (input: SendReplyInput) => Effect.Effect<LedgerEntry>;
    readonly archive: (input: FileInput) => Effect.Effect<LedgerEntry>;
    readonly flagForReview: (input: FileInput) => Effect.Effect<LedgerEntry>;
    readonly listLedger: (
      emailId?: EmailIdType
    ) => Effect.Effect<ReadonlyArray<LedgerEntry>>;
    readonly undoAction: (
      entryId: LedgerEntryIdType,
      actor: ActorType,
      runId?: AttemptIdType
    ) => Effect.Effect<LedgerEntry, ActionNotFound | ActionNotUndoable>;
    readonly clearLedgerForEmail: (emailId: EmailIdType) => Effect.Effect<void>;
    readonly clearLedger: () => Effect.Effect<void>;
  }
>()('@apps/api/Actions/LedgerService') {}

/** `LedgerService` without its repos; wire with {@link LedgerServiceLive} or test repos. */
export const LedgerServiceBody: Layer.Layer<LedgerService, never, LedgerRepo> =
  Layer.effect(
    LedgerService,
    Effect.gen(function* () {
      const ledger = yield* LedgerRepo;

      const recordTriage = Effect.fn('LedgerService.recordTriage')(
        (classification: Classification) => Effect.succeed(classification)
      );

      const sendReply = Effect.fn('LedgerService.sendReply')(
        (input: SendReplyInput) =>
          ledger.append({
            actor: input.actor,
            runId: input.runId,
            emailId: input.emailId,
            action: 'send_reply',
            summary: input.summary ?? `Replied to ${input.emailId}`,
            payload: { body: input.body }
          })
      );

      const archive = Effect.fn('LedgerService.archive')((input: FileInput) =>
        ledger.append({
          actor: input.actor,
          runId: input.runId,
          emailId: input.emailId,
          action: 'archive',
          summary: input.summary ?? `Archived ${input.emailId}`,
          payload: {}
        })
      );

      const flagForReview = Effect.fn('LedgerService.flagForReview')(
        (input: FileInput) =>
          ledger.append({
            actor: input.actor,
            runId: input.runId,
            emailId: input.emailId,
            action: 'flag_for_review',
            summary: input.summary ?? `Flagged ${input.emailId} for review`,
            payload: {}
          })
      );

      const listLedger = Effect.fn('LedgerService.listLedger')(
        (emailId?: EmailIdType) =>
          emailId === undefined ? ledger.list() : ledger.listByEmail(emailId)
      );

      const undoAction = Effect.fn('LedgerService.undoAction')(function* (
        entryId: LedgerEntryIdType,
        actor: ActorType,
        runId?: AttemptIdType
      ) {
        const original = yield* ledger.get(entryId);
        if (original === null) {
          return yield* Effect.fail(new ActionNotFound({ entryId }));
        }
        if (original.action === 'undo') {
          return yield* Effect.fail(
            new ActionNotUndoable({
              entryId,
              reason: 'An undo action cannot itself be undone.'
            })
          );
        }
        if (original.undoneBy !== null) {
          return yield* Effect.fail(
            new ActionNotUndoable({
              entryId,
              reason: 'This action was already undone.'
            })
          );
        }
        return yield* ledger.append({
          actor,
          runId: runId ?? original.runId ?? undefined,
          emailId: original.emailId,
          action: 'undo',
          summary: `Undid ${original.action} on ${original.emailId}`,
          payload: { undoneAction: original.action },
          undoes: entryId
        });
      });

      const clearLedgerForEmail = Effect.fn(
        'LedgerService.clearLedgerForEmail'
      )((emailId: EmailIdType) => ledger.deleteByEmail(emailId));

      const clearLedger = Effect.fn('LedgerService.clearLedger')(function* () {
        yield* ledger.deleteAll();
      });

      return {
        recordTriage,
        sendReply,
        archive,
        flagForReview,
        listLedger,
        undoAction,
        clearLedgerForEmail,
        clearLedger
      } as const;
    })
  );

/** `LedgerService` alongside its repos, so orchestrators and handlers share one datastore. */
export const LedgerServiceLive = Layer.provide(LedgerServiceBody, [
  LedgerRepoLive
]);
