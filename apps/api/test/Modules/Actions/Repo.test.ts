import { type Context, Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import type { EmailIdType, LedgerEntryIdType } from '@/Lib/Ids';
import { LedgerRepo, LedgerRepoBody } from '@/Modules/Actions/Repo';
import { runDb } from '../../support/Database';

type Ledger = Context.Service.Shape<typeof LedgerRepo>;

const runLedger = <A, E>(
  build: (repo: Ledger) => Effect.Effect<A, E>
): Promise<A> =>
  runDb(
    Effect.gen(function* () {
      const repo = yield* LedgerRepo;
      return yield* build(repo);
    }).pipe(Effect.provide(LedgerRepoBody))
  );

const EMAIL: EmailIdType = 'e-001';

describe('LedgerRepo', () => {
  it('appends entries and returns them newest-first', async () => {
    const entries = await runLedger((repo) =>
      Effect.gen(function* () {
        yield* repo.append({
          actor: 'batch_agent',
          emailId: EMAIL,
          action: 'send_reply',
          summary: 'Replied',
          payload: { body: 'hi' }
        });
        yield* repo.append({
          actor: 'batch_agent',
          emailId: EMAIL,
          action: 'archive',
          summary: 'Archived',
          payload: {}
        });
        return yield* repo.listByEmail(EMAIL);
      })
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]?.action).toBe('archive');
    expect(entries[1]?.action).toBe('send_reply');
    expect(entries[1]?.undoneBy).toBeNull();
    expect(entries[1]?.undoes).toBeNull();
  });

  it('round-trips the JSONB payload', async () => {
    const entry = await runLedger((repo) =>
      repo.append({
        actor: 'chat_agent',
        emailId: EMAIL,
        action: 'send_reply',
        summary: 'Replied',
        payload: { body: 'Confirming honed limestone.', cc: ['pm@firm.com'] }
      })
    );

    expect(entry.payload).toEqual({
      body: 'Confirming honed limestone.',
      cc: ['pm@firm.com']
    });
  });

  it('links an undo to its original on both rows', async () => {
    const result = await runLedger((repo) =>
      Effect.gen(function* () {
        const original = yield* repo.append({
          actor: 'batch_agent',
          emailId: EMAIL,
          action: 'send_reply',
          summary: 'Replied',
          payload: { body: 'hi' }
        });
        const undo = yield* repo.append({
          actor: 'user',
          emailId: EMAIL,
          action: 'undo',
          summary: 'Undid reply',
          payload: {},
          undoes: original.id
        });
        const reloaded = yield* repo.get(original.id);
        return { original, undo, reloaded };
      })
    );

    expect(result.undo.undoes).toBe(result.original.id);
    expect(result.reloaded?.undoneBy).toBe(result.undo.id);
  });

  it('returns null for an unknown entry id', async () => {
    const missing = await runLedger((repo) =>
      repo.get('00000000-0000-0000-0000-000000000000' as LedgerEntryIdType)
    );
    expect(missing).toBeNull();
  });
});
