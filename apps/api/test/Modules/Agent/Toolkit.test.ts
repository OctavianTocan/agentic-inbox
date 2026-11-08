import { LedgerEntry } from '@app/api-core/Modules/Actions/Domain';
import { type Context, Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { ActorType, EmailIdType } from '@/Lib/Ids';
import type { ActionService } from '@/Modules/Actions/Service';
import {
  ListLedger,
  makeChatHandlers,
  makeTriageToolkit
} from '@/Modules/Agent/Toolkit';
import type { EmailsService } from '@/Modules/Emails/Service';

/** Resolves the send/archive approval gate for a triage toolkit built for the given sensitivity. */
const gateFor = async (
  sensitive: boolean,
  tool: 'send_reply' | 'archive'
): Promise<boolean> => {
  const toolkit = makeTriageToolkit(sensitive);
  const needsApproval = toolkit.tools[tool].needsApproval;
  if (typeof needsApproval !== 'function') {
    throw new Error('expected a dynamic approval gate');
  }
  const emailId: EmailIdType = 'e-001';
  const params =
    tool === 'send_reply'
      ? { emailId, body: 'ack' }
      : { emailId, summary: 'filed' };
  const result = needsApproval(params, { toolCallId: 'call-1', messages: [] });
  return Effect.isEffect(result) ? Effect.runPromise(result) : result;
};

describe('makeTriageToolkit approval gate', () => {
  it('lets routine send_reply and archive execute without approval', async () => {
    // The brief requires routine work to be done for the PM, not queued: a
    // non-sensitive decision must never pause the send/archive tools.
    expect(await gateFor(false, 'send_reply')).toBe(false);
    expect(await gateFor(false, 'archive')).toBe(false);
  });

  it('forces approval for send_reply and archive on a sensitive email', async () => {
    // Sensitive emails must never be auto-actioned: even if the model calls
    // send_reply or archive, the gate must convert it to a pending approval.
    expect(await gateFor(true, 'send_reply')).toBe(true);
    expect(await gateFor(true, 'archive')).toBe(true);
  });
});

const ledgerEntry = (emailId: EmailIdType): LedgerEntry =>
  Schema.decodeUnknownSync(LedgerEntry)({
    id: 'l-1',
    runId: null,
    actor: 'batch_agent',
    emailId,
    action: 'send_reply',
    actionRevision: 1,
    summary: 'Replied',
    payload: {},
    undoneBy: null,
    undoes: null,
    createdAt: '2026-05-01T12:00:00Z'
  });

describe('list_ledger null tolerance', () => {
  it('accepts an explicit null emailId as an unfiltered query', async () => {
    // The model sometimes passes emailId: null to mean "no filter". The schema
    // must decode it, and the handler must query the whole ledger (undefined).
    const decoded = Schema.decodeUnknownSync(ListLedger.parametersSchema)({
      emailId: null
    });
    expect(decoded.emailId).toBeNull();

    const calls: Array<EmailIdType | undefined> = [];
    const actions: Partial<Context.Service.Shape<typeof ActionService>> = {
      listLedger: (emailId?: EmailIdType) => {
        calls.push(emailId);
        return Effect.succeed<ReadonlyArray<LedgerEntry>>([
          ledgerEntry('e-001')
        ]);
      }
    };
    const emails: Partial<Context.Service.Shape<typeof EmailsService>> = {};
    const actor: ActorType = 'chat_agent';
    const handlers = makeChatHandlers(
      { ...emptyActions, ...actions },
      { ...emptyEmails, ...emails },
      actor
    );

    const result = await Effect.runPromise(
      handlers.list_ledger(
        { emailId: null },
        { preliminary: () => Effect.void }
      )
    );
    expect(calls).toEqual([undefined]);
    expect(result[0]?.emailId).toBe('e-001');
  });
});

/** Every action method fails loudly; individual tests override the ones they exercise. */
const emptyActions: Context.Service.Shape<typeof ActionService> = {
  recordTriage: () => Effect.die(new Error('recordTriage not used')),
  sendReply: () => Effect.die(new Error('sendReply not used')),
  archive: () => Effect.die(new Error('archive not used')),
  flagForReview: () => Effect.die(new Error('flagForReview not used')),
  listLedger: () => Effect.die(new Error('listLedger not used')),
  undoAction: () => Effect.die(new Error('undoAction not used')),
  clearLedgerForEmail: () =>
    Effect.die(new Error('clearLedgerForEmail not used')),
  clearLedger: () => Effect.die(new Error('clearLedger not used'))
};

/** Every emails method fails loudly; individual tests override the ones they exercise. */
const emptyEmails: Context.Service.Shape<typeof EmailsService> = {
  list: () => Effect.die(new Error('list not used')),
  get: () => Effect.die(new Error('get not used')),
  thread: () => Effect.die(new Error('thread not used'))
};
