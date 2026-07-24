import { Attempt } from '@app/api-core/Modules/Triage/Attempts/Domain';
import { type Context, Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import type { AttemptIdType, EmailIdType, LedgerEntryIdType } from '@/Lib/Ids';
import { LedgerRepo, LedgerRepoBody } from '@/Modules/Actions/Repo';
import { LedgerService, LedgerServiceBody } from '@/Modules/Actions/Service';
import { AttemptsRepo, AttemptsRepoBody } from '@/Modules/Triage/Attempts/Repo';
import { runDb } from '../../support/Database';

type Actions = Context.Service.Shape<typeof LedgerService>;
type Ledger = Context.Service.Shape<typeof LedgerRepo>;

const ServiceLayer = LedgerServiceBody.pipe(Layer.provideMerge(LedgerRepoBody));

const withService = <A, E>(
  use: (services: {
    readonly actions: Actions;
    readonly ledger: Ledger;
  }) => Effect.Effect<A, E>
): Promise<A> =>
  runDb(
    Effect.gen(function* () {
      const actions = yield* LedgerService;
      const ledger = yield* LedgerRepo;
      return yield* use({ actions, ledger });
    }).pipe(Effect.provide(ServiceLayer))
  );

const EMAIL: EmailIdType = 'e-014';
const MISSING_ID = '00000000-0000-0000-0000-000000000000' as LedgerEntryIdType;
const ATTEMPT_ID = '11111111-1111-1111-1111-111111111111' as AttemptIdType;

describe('LedgerService', () => {
  it('sendReply appends a send_reply entry carrying the draft body', async () => {
    const { entry, ledgerRows } = await withService(({ actions, ledger }) =>
      Effect.gen(function* () {
        const entry = yield* actions.sendReply({
          emailId: EMAIL,
          actor: 'batch_agent',
          body: 'Confirmed.'
        });
        const ledgerRows = yield* ledger.listByEmail(EMAIL);
        return { entry, ledgerRows };
      })
    );

    expect(entry.action).toBe('send_reply');
    expect(entry.payload).toEqual({ body: 'Confirmed.' });
    expect(entry.runId).toBeNull();
    expect(ledgerRows).toHaveLength(1);
  });

  it('sendReply stamps runId on the ledger row when provided', async () => {
    const WithRunsLayer = Layer.mergeAll(ServiceLayer, AttemptsRepoBody);
    const entry = await runDb(
      Effect.gen(function* () {
        const runs = yield* AttemptsRepo;
        const actions = yield* LedgerService;
        yield* runs.create(
          new Attempt({
            id: ATTEMPT_ID,
            emailId: EMAIL,
            status: 'running',
            createdAt: '2026-05-01T12:00:00Z',
            updatedAt: '2026-05-01T12:00:00Z',
            nextAction: 'send_reply',
            proposalSummary: 'In progress',
            pending: null,
            decisionSnapshot: null,
            policyVersion: null,
            promptVersion: null,
            error: null
          })
        );
        return yield* actions.sendReply({
          emailId: EMAIL,
          actor: 'batch_agent',
          body: 'Confirmed with attempt.',
          runId: ATTEMPT_ID
        });
      }).pipe(Effect.provide(WithRunsLayer))
    );

    expect(entry.runId).toBe(ATTEMPT_ID);
  });

  it('undoAction appends an undo linked to the original and marks it undone', async () => {
    const { original, undo } = await withService(({ actions }) =>
      Effect.gen(function* () {
        const original = yield* actions.archive({
          emailId: EMAIL,
          actor: 'batch_agent'
        });
        const undo = yield* actions.undoAction(original.id, 'user');
        return { original, undo };
      })
    );

    expect(undo.action).toBe('undo');
    expect(undo.undoes).toBe(original.id);
  });

  it('rejects undoing an already-undone action', async () => {
    const error = await withService(({ actions }) =>
      Effect.gen(function* () {
        const original = yield* actions.archive({
          emailId: EMAIL,
          actor: 'batch_agent'
        });
        yield* actions.undoAction(original.id, 'user');
        return yield* actions.undoAction(original.id, 'user');
      }).pipe(Effect.flip)
    );

    expect(error._tag).toBe('ActionNotUndoable');
  });

  it('rejects undoing an unknown action', async () => {
    const error = await withService(({ actions }) =>
      actions.undoAction(MISSING_ID, 'user').pipe(Effect.flip)
    );
    expect(error._tag).toBe('ActionNotFound');
  });

  it('rejects undoing an undo entry', async () => {
    const error = await withService(({ actions }) =>
      Effect.gen(function* () {
        const original = yield* actions.archive({
          emailId: EMAIL,
          actor: 'batch_agent'
        });
        const undo = yield* actions.undoAction(original.id, 'user');
        return yield* actions.undoAction(undo.id, 'user');
      }).pipe(Effect.flip)
    );
    expect(error._tag).toBe('ActionNotUndoable');
  });
});
