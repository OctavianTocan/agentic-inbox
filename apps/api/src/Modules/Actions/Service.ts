import type { LedgerEntry } from '@app/api-core/Modules/Actions/Domain';
import {
  ActionNotFound,
  ActionNotUndoable
} from '@app/api-core/Modules/Actions/Errors';
import type { Decision } from '@app/api-core/Modules/Triage/Domain';
import { Context, Effect, Layer } from 'effect';
import type { ActorType, EmailIdType, LedgerEntryIdType } from '@/Lib/Ids';
import { DecisionsRepo, DecisionsRepoLive } from '@/Modules/Triage/Repo';
import { ActionLedgerRepo, ActionLedgerRepoLive } from './Repo';

/** Arguments for simulating a reply to an email. */
export type SendReplyInput = {
  readonly emailId: EmailIdType;
  readonly actor: ActorType;
  readonly body: string;
  readonly summary?: string | undefined;
};

/** Arguments for archiving or flagging an email. */
export type FileInput = {
  readonly emailId: EmailIdType;
  readonly actor: ActorType;
  readonly summary?: string | undefined;
};

/** Shared tool logic invoked by both agent toolkits and HTTP handlers; every mutation appends to the ledger. */
export class ActionService extends Context.Service<
  ActionService,
  {
    readonly recordTriage: (decision: Decision) => Effect.Effect<Decision>;
    readonly sendReply: (input: SendReplyInput) => Effect.Effect<LedgerEntry>;
    readonly archive: (input: FileInput) => Effect.Effect<LedgerEntry>;
    readonly flagForReview: (input: FileInput) => Effect.Effect<LedgerEntry>;
    readonly undoAction: (
      entryId: LedgerEntryIdType,
      actor: ActorType
    ) => Effect.Effect<LedgerEntry, ActionNotFound | ActionNotUndoable>;
  }
>()('@apps/api/Actions/ActionService') {}

/** `ActionService` without its repos; wire with {@link ActionServiceLive} or test repos. */
export const ActionServiceBody: Layer.Layer<
  ActionService,
  never,
  ActionLedgerRepo | DecisionsRepo
> = Layer.effect(
  ActionService,
  Effect.gen(function* () {
    const ledger = yield* ActionLedgerRepo;
    const decisions = yield* DecisionsRepo;

    const recordTriage = Effect.fn('ActionService.recordTriage')(
      (decision: Decision) => decisions.upsert(decision)
    );

    const sendReply = Effect.fn('ActionService.sendReply')(
      (input: SendReplyInput) =>
        ledger.append({
          actor: input.actor,
          emailId: input.emailId,
          action: 'send_reply',
          summary: input.summary ?? `Replied to ${input.emailId}`,
          payload: { body: input.body }
        })
    );

    const archive = Effect.fn('ActionService.archive')((input: FileInput) =>
      ledger.append({
        actor: input.actor,
        emailId: input.emailId,
        action: 'archive',
        summary: input.summary ?? `Archived ${input.emailId}`,
        payload: {}
      })
    );

    const flagForReview = Effect.fn('ActionService.flagForReview')(
      (input: FileInput) =>
        ledger.append({
          actor: input.actor,
          emailId: input.emailId,
          action: 'flag_for_review',
          summary: input.summary ?? `Flagged ${input.emailId} for review`,
          payload: {}
        })
    );

    const undoAction = Effect.fn('ActionService.undoAction')(function* (
      entryId: LedgerEntryIdType,
      actor: ActorType
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
        emailId: original.emailId,
        action: 'undo',
        summary: `Undid ${original.action} on ${original.emailId}`,
        payload: { undoneAction: original.action },
        undoes: entryId
      });
    });

    return {
      recordTriage,
      sendReply,
      archive,
      flagForReview,
      undoAction
    } as const;
  })
);

/** `ActionService` alongside its repos, so orchestrators and handlers share one datastore. */
export const ActionServiceLive = Layer.provide(ActionServiceBody, [
  DecisionsRepoLive,
  ActionLedgerRepoLive
]);
