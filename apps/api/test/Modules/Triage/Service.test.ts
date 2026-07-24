import { LedgerEntry } from '@app/api-core/Modules/Actions/Domain';
import { ActionNotFound } from '@app/api-core/Modules/Actions/Errors';
import {
  type Email,
  Email as EmailSchema
} from '@app/api-core/Modules/Emails/Domain';
import { EmailNotFound } from '@app/api-core/Modules/Emails/Errors';
import { Classification } from '@app/api-core/Modules/Triage/Domain';
import { type Cause, Effect, Exit, Layer, Stream } from 'effect';
import { describe, expect, it } from 'vitest';
import type { ActorType, EmailIdType, LedgerEntryIdType } from '@/Lib/Ids';
import { LedgerRepo, LedgerRepoBody } from '@/Modules/Actions/Repo';
import { LedgerService, LedgerServiceBody } from '@/Modules/Actions/Service';
import { TriageAgent } from '@/Modules/Agent/TriageAgent';
import { ConversationsRepo, ConversationsRepoBody } from '@/Modules/Chat/Repo';
import { EmailsService } from '@/Modules/Emails/Service';
import { AttemptsRepo, AttemptsRepoBody } from '@/Modules/Triage/Attempts/Repo';
import {
  ClassificationsRepo,
  ClassificationsRepoBody
} from '@/Modules/Triage/Classifications/Repo';
import {
  InboxOrchestrator,
  InboxOrchestratorBody
} from '@/Modules/Triage/Service';
import { runDb } from '../../support/Database';

const EMAIL_ID: EmailIdType = 'e-service-test';
const EMAIL = new EmailSchema({
  id: EMAIL_ID,
  from: 'Sam Builder <sam@example.com>',
  to: ['pm@example.com'],
  cc: [],
  subject: 'Question about order PB-001',
  body: 'Please confirm the delivery note before packing.',
  timestamp: '2026-05-01T12:00:00Z',
  inReplyTo: null
});
const DECISION = new Classification({
  emailId: EMAIL_ID,
  category: 'request',
  severity: 'medium',
  confidence: 0.95,
  whyPreview: 'Customer request needs confirmation',
  rationale: 'The sender asks for a routine clarification before packing.',
  keyFacts: ['Order PB-001', 'delivery note', 'before packing'],
  isSensitive: false,
  policyReasons: []
});

const emptyLedger: ReadonlyArray<LedgerEntry> = [];

const AgentLayer = Layer.succeed(TriageAgent, {
  triageEmail: (_email: Email) =>
    Effect.succeed({
      classification: DECISION,
      actions: [],
      approval: null
    })
});

const EmailsLayer = Layer.succeed(EmailsService, {
  list: () => Effect.succeed([EMAIL]),
  get: (id: EmailIdType) => Effect.succeed(id === EMAIL_ID ? EMAIL : null),
  thread: (id: EmailIdType) => Effect.succeed(id === EMAIL_ID ? [EMAIL] : [])
});

const ActionsLayer = Layer.succeed(LedgerService, {
  recordTriage: (classification: Classification) =>
    Effect.succeed(classification),
  sendReply: () => Effect.die(new Error('sendReply is not used in this test')),
  archive: () => Effect.die(new Error('archive is not used in this test')),
  flagForReview: () =>
    Effect.die(new Error('flagForReview is not used in this test')),
  listLedger: (_emailId?: EmailIdType) => Effect.succeed(emptyLedger),
  undoAction: (_entryId: LedgerEntryIdType, _actor: ActorType) =>
    Effect.die(new Error('undoAction is not used in this test')),
  clearLedgerForEmail: (_emailId: EmailIdType) =>
    Effect.die(new Error('clearLedgerForEmail is not used in this test')),
  clearLedger: () =>
    Effect.die(new Error('clearLedger is not used in this test'))
});

const ConversationsLayer = Layer.succeed(ConversationsRepo, {
  save: () => Effect.die(new Error('save is not used in this test')),
  get: () => Effect.succeed(null),
  listAwaitingApproval: () => Effect.succeed([]),
  claimApproval: () => Effect.succeed(null),
  deleteByEmail: (_emailId: EmailIdType) =>
    Effect.die(new Error('deleteByEmail is not used in this test')),
  deleteTriage: () =>
    Effect.die(new Error('deleteTriage is not used in this test'))
});

const ServiceLayer = InboxOrchestratorBody.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AgentLayer,
      EmailsLayer,
      ClassificationsRepoBody,
      AttemptsRepoBody,
      ActionsLayer,
      ConversationsLayer
    )
  )
);

const decisionFor = (emailId: EmailIdType): Classification =>
  new Classification({
    emailId,
    category: 'request',
    severity: 'medium',
    confidence: 0.9,
    whyPreview: 'needs confirmation',
    rationale: 'The sender asks for a design clarification.',
    keyFacts: ['detail'],
    isSensitive: false,
    policyReasons: []
  });

const emailFor = (id: EmailIdType): Email =>
  new EmailSchema({
    id,
    from: 'Sam Builder <sam@example.com>',
    to: ['pm@example.com'],
    cc: [],
    subject: `Question about ${id}`,
    body: 'Please confirm the detail.',
    timestamp: '2026-05-01T12:00:00Z',
    inReplyTo: null
  });

describe('InboxOrchestrator', () => {
  it('persists generated decisions even when no action tool records triage', async () => {
    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* InboxOrchestrator;
        const decisions = yield* ClassificationsRepo;
        const stream = yield* triage.run();
        const events = yield* Stream.runCollect(stream);
        const stored = yield* decisions.get(EMAIL_ID);
        const inbox = yield* triage.inbox();
        return { events, stored, inbox };
      }).pipe(Effect.provide(ServiceLayer))
    );

    expect(result.events.map((event) => event.type)).toEqual([
      'started',
      'decision',
      'done'
    ]);
    expect(result.stored?.emailId).toBe(EMAIL_ID);
    expect(result.inbox.summary.processed).toBe(1);
  });

  it('mints a completed Attempt row after a successful triage walk', async () => {
    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* InboxOrchestrator;
        const runs = yield* AttemptsRepo;
        const stream = yield* triage.run();
        yield* Stream.runCollect(stream);
        return yield* runs.listByEmail(EMAIL_ID);
      }).pipe(Effect.provide(ServiceLayer))
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe('completed');
    expect(result[0]?.nextAction).toBe('no_action');
    expect(result[0]?.decisionSnapshot).not.toBeNull();
    expect(result[0]?.error).toBeNull();
  });

  it('finalizes the Attempt as failed when TriageAgent fails', async () => {
    const FailAgentLayer = Layer.succeed(TriageAgent, {
      triageEmail: () =>
        Effect.fail(
          new ActionNotFound({
            entryId: '00000000-0000-0000-0000-000000000001' as LedgerEntryIdType
          })
        )
    });
    const FailServiceLayer = InboxOrchestratorBody.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          FailAgentLayer,
          EmailsLayer,
          ClassificationsRepoBody,
          AttemptsRepoBody,
          ActionsLayer,
          ConversationsLayer
        )
      )
    );

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* InboxOrchestrator;
        const runs = yield* AttemptsRepo;
        const stream = yield* triage.run();
        const events = yield* Stream.runCollect(stream);
        const attemptRows = yield* runs.listByEmail(EMAIL_ID);
        return { events: [...events], attemptRows };
      }).pipe(Effect.provide(FailServiceLayer))
    );

    expect(result.events.map((event) => event.type)).toEqual([
      'started',
      'failed',
      'done'
    ]);
    expect(result.attemptRows).toHaveLength(1);
    expect(result.attemptRows[0]?.status).toBe('failed');
    expect(result.attemptRows[0]?.error).not.toBeNull();
  });

  it('mints an Attempt on retriage as well as batch', async () => {
    const targetId: EmailIdType = 'e-retriage-run';
    const target = emailFor(targetId);
    const RetriageEmailsLayer = Layer.succeed(EmailsService, {
      list: () => Effect.succeed([target]),
      get: (id: EmailIdType) => Effect.succeed(id === targetId ? target : null),
      thread: (id: EmailIdType) =>
        Effect.succeed(id === targetId ? [target] : [])
    });
    const RetriageAgentLayer = Layer.succeed(TriageAgent, {
      triageEmail: (_email: Email) =>
        Effect.succeed({
          classification: decisionFor(targetId),
          actions: [],
          approval: null
        })
    });
    const RetriageServiceLayer = InboxOrchestratorBody.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          RetriageAgentLayer,
          RetriageEmailsLayer,
          ClassificationsRepoBody,
          AttemptsRepoBody,
          LedgerServiceBody.pipe(Layer.provideMerge(LedgerRepoBody)),
          ConversationsRepoBody
        )
      )
    );

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* InboxOrchestrator;
        const runs = yield* AttemptsRepo;
        yield* triage.retriage(targetId);
        return yield* runs.listByEmail(targetId);
      }).pipe(Effect.provide(RetriageServiceLayer))
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe('completed');
  });

  it('processes only undecided emails and reports their count as done.processed', async () => {
    const emailIds: readonly EmailIdType[] = [
      'e-batch-1',
      'e-batch-2',
      'e-batch-3',
      'e-batch-4'
    ];
    const allEmails = emailIds.map(emailFor);
    const decisionByEmail = new Map(
      emailIds.map((id) => [id, decisionFor(id)] as const)
    );

    const MultiEmailsLayer = Layer.succeed(EmailsService, {
      list: () => Effect.succeed(allEmails),
      get: (id: EmailIdType) =>
        Effect.succeed(allEmails.find((email) => email.id === id) ?? null),
      thread: (id: EmailIdType) =>
        Effect.succeed(allEmails.filter((email) => email.id === id))
    });
    const MultiAgentLayer = Layer.succeed(TriageAgent, {
      triageEmail: (email: Email) =>
        Effect.succeed({
          classification:
            decisionByEmail.get(email.id) ?? decisionFor(email.id),
          actions: [],
          approval: null
        })
    });
    const MultiServiceLayer = InboxOrchestratorBody.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          MultiAgentLayer,
          MultiEmailsLayer,
          ClassificationsRepoBody,
          AttemptsRepoBody,
          ActionsLayer,
          ConversationsLayer
        )
      )
    );

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* InboxOrchestrator;
        const decisions = yield* ClassificationsRepo;
        yield* decisions.upsert(decisionFor('e-batch-1'));
        const stream = yield* triage.run();
        const events = yield* Stream.runCollect(stream);
        const eventList = [...events];
        const processed = eventList
          .filter((event) => event.type === 'done')
          .map((event) => event.processed);
        const startedIds = eventList
          .filter((event) => event.type === 'started')
          .map((event) => event.emailId);
        return { processed, startedIds };
      }).pipe(Effect.provide(MultiServiceLayer))
    );

    // Three of four emails are undecided; done.processed must equal that count
    // so the frontend progress bar can reach 100%.
    expect(result.processed).toEqual([3]);
    expect([...result.startedIds].sort()).toEqual([
      'e-batch-2',
      'e-batch-3',
      'e-batch-4'
    ]);
  });
});

const ledgerEntryFor = (
  emailId: EmailIdType,
  action: LedgerEntry['action']
): LedgerEntry =>
  new LedgerEntry({
    id: `l-${emailId}-${action}`,
    runId: null,
    actor: 'batch_agent',
    emailId,
    action,
    actionRevision: 1,
    summary: `${action} for ${emailId}`,
    payload: {},
    undoneBy: null,
    undoes: null,
    createdAt: '2026-05-01T12:05:00Z'
  });

const sensitiveDecisionFor = (emailId: EmailIdType): Classification =>
  new Classification({
    emailId,
    category: 'financial',
    severity: 'high',
    confidence: 0.9,
    whyPreview: 'Billing request carries financial exposure',
    rationale: 'A billing request can cost real money; defer to the human.',
    keyFacts: ['billing request'],
    isSensitive: true,
    policyReasons: []
  });

const inboxWithLedger = (
  classification: Classification,
  ledger: ReadonlyArray<LedgerEntry>
) => {
  const email = emailFor(classification.emailId);
  const EmailsLayerOne = Layer.succeed(EmailsService, {
    list: () => Effect.succeed([email]),
    get: (id: EmailIdType) => Effect.succeed(id === email.id ? email : null),
    thread: (id: EmailIdType) => Effect.succeed(id === email.id ? [email] : [])
  });
  const LedgerActionsLayer = Layer.succeed(LedgerService, {
    recordTriage: (recorded: Classification) => Effect.succeed(recorded),
    sendReply: () =>
      Effect.die(new Error('sendReply is not used in this test')),
    archive: () => Effect.die(new Error('archive is not used in this test')),
    flagForReview: () =>
      Effect.die(new Error('flagForReview is not used in this test')),
    listLedger: (_emailId?: EmailIdType) => Effect.succeed(ledger),
    undoAction: (_entryId: LedgerEntryIdType, _actor: ActorType) =>
      Effect.die(new Error('undoAction is not used in this test')),
    clearLedgerForEmail: (_emailId: EmailIdType) =>
      Effect.die(new Error('clearLedgerForEmail is not used in this test')),
    clearLedger: () =>
      Effect.die(new Error('clearLedger is not used in this test'))
  });
  const Layered = InboxOrchestratorBody.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        AgentLayer,
        EmailsLayerOne,
        ClassificationsRepoBody,
        AttemptsRepoBody,
        LedgerActionsLayer,
        ConversationsLayer
      )
    )
  );
  return runDb(
    Effect.gen(function* () {
      const triage = yield* InboxOrchestrator;
      const decisions = yield* ClassificationsRepo;
      yield* decisions.upsert(classification);
      const inbox = yield* triage.inbox();
      return inbox;
    }).pipe(Effect.provide(Layered))
  );
};

describe('InboxOrchestrator inbox status mapping', () => {
  it('marks a sensitive email with a flag_for_review entry as needs_attention', async () => {
    const emailId: EmailIdType = 'e-flagged-sensitive';
    const inbox = await inboxWithLedger(sensitiveDecisionFor(emailId), [
      ledgerEntryFor(emailId, 'flag_for_review')
    ]);

    const item = inbox.items.find((entry) => entry.email.id === emailId);
    expect(item?.status).toBe('needs_attention');
    expect(inbox.summary.needsAttention).toBe(1);
    expect(inbox.summary.handled).toBe(0);
  });

  it('keeps a routine email with an executed send_reply as done_for_you', async () => {
    const emailId: EmailIdType = 'e-replied-routine';
    const inbox = await inboxWithLedger(decisionFor(emailId), [
      ledgerEntryFor(emailId, 'send_reply')
    ]);

    const item = inbox.items.find((entry) => entry.email.id === emailId);
    expect(item?.status).toBe('done_for_you');
    expect(inbox.summary.handled).toBe(1);
    expect(inbox.summary.needsAttention).toBe(0);
  });

  it('keeps a routine email with an archive as filed', async () => {
    const emailId: EmailIdType = 'e-archived-routine';
    const inbox = await inboxWithLedger(decisionFor(emailId), [
      ledgerEntryFor(emailId, 'archive')
    ]);

    const item = inbox.items.find((entry) => entry.email.id === emailId);
    expect(item?.status).toBe('filed');
    expect(inbox.summary.filed).toBe(1);
  });
});

describe('InboxOrchestrator fresh re-run', () => {
  it('clears prior decisions, ledger, and triage conversations, then re-processes every email', async () => {
    const emailIds: readonly EmailIdType[] = [
      'e-fresh-1',
      'e-fresh-2',
      'e-fresh-3'
    ];
    const allEmails = emailIds.map(emailFor);
    const decisionByEmail = new Map(
      emailIds.map((id) => [id, decisionFor(id)] as const)
    );

    const FreshEmailsLayer = Layer.succeed(EmailsService, {
      list: () => Effect.succeed(allEmails),
      get: (id: EmailIdType) =>
        Effect.succeed(allEmails.find((email) => email.id === id) ?? null),
      thread: (id: EmailIdType) =>
        Effect.succeed(allEmails.filter((email) => email.id === id))
    });
    const FreshAgentLayer = Layer.succeed(TriageAgent, {
      triageEmail: (email: Email) =>
        Effect.succeed({
          classification:
            decisionByEmail.get(email.id) ?? decisionFor(email.id),
          actions: [],
          approval: null
        })
    });
    // Real repos + LedgerService so deleteAll / clearLedger / deleteTriage
    // actually hit the test database; only the model-driven layers are stubbed.
    const FreshServiceLayer = InboxOrchestratorBody.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          FreshAgentLayer,
          FreshEmailsLayer,
          ClassificationsRepoBody,
          AttemptsRepoBody,
          LedgerServiceBody.pipe(Layer.provideMerge(LedgerRepoBody)),
          ConversationsRepoBody
        )
      )
    );

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* InboxOrchestrator;
        const decisions = yield* ClassificationsRepo;
        const ledger = yield* LedgerRepo;
        const conversations = yield* ConversationsRepo;

        // Seed stale state: two decisions on unrelated ids, one ledger row, and
        // one triage conversation. A non-fresh run would skip decided emails.
        yield* decisions.upsert(decisionFor('e-stale-1'));
        yield* decisions.upsert(decisionFor('e-stale-2'));
        yield* ledger.append({
          actor: 'batch_agent',
          emailId: 'e-stale-1',
          action: 'send_reply',
          summary: 'stale reply',
          payload: {}
        });
        yield* conversations.save({
          status: 'complete',
          prompt: { content: [] },
          emailId: 'e-stale-1'
        });

        const stream = yield* triage.run(true);
        const events = yield* Stream.runCollect(stream);
        const eventList = [...events];

        const decisionsAfter = yield* decisions.list();
        const ledgerAfter = yield* ledger.list();
        const conversationsAfter = yield* conversations.listAwaitingApproval();
        return { eventList, decisionsAfter, ledgerAfter, conversationsAfter };
      }).pipe(Effect.provide(FreshServiceLayer))
    );

    const processed = result.eventList
      .filter((event) => event.type === 'done')
      .map((event) => event.processed);
    const decidedIds = result.decisionsAfter
      .map((decision) => decision.emailId)
      .sort();

    // Fresh wiped the two stale decisions and re-triaged all three emails.
    expect(processed).toEqual([3]);
    expect(decidedIds).toEqual(['e-fresh-1', 'e-fresh-2', 'e-fresh-3']);
    // The stale ledger row is gone; a fresh run with no auto-actions leaves it empty.
    expect(result.ledgerAfter).toHaveLength(0);
  });
});

describe('InboxOrchestrator per-email re-triage', () => {
  it('clears one email’s stale decision and ledger, then writes a fresh decision', async () => {
    const targetId: EmailIdType = 'e-retriage-1';
    const otherId: EmailIdType = 'e-retriage-2';
    const target = emailFor(targetId);
    const other = emailFor(otherId);

    // The agent regenerates a distinct decision so the test can prove the row
    // was actually re-derived, not left untouched.
    const freshDecision = new Classification({
      emailId: targetId,
      category: 'status_update',
      severity: 'low',
      confidence: 0.99,
      whyPreview: 're-triaged fresh',
      rationale: 'A second pass reclassified this email.',
      keyFacts: ['re-triaged'],
      isSensitive: false,
      policyReasons: []
    });
    const RetriageEmailsLayer = Layer.succeed(EmailsService, {
      list: () => Effect.succeed([target, other]),
      get: (id: EmailIdType) =>
        Effect.succeed(
          [target, other].find((email) => email.id === id) ?? null
        ),
      thread: (id: EmailIdType) =>
        Effect.succeed([target, other].filter((email) => email.id === id))
    });
    const RetriageAgentLayer = Layer.succeed(TriageAgent, {
      triageEmail: (_email: Email) =>
        Effect.succeed({
          classification: freshDecision,
          actions: [],
          approval: null
        })
    });
    const RetriageServiceLayer = InboxOrchestratorBody.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          RetriageAgentLayer,
          RetriageEmailsLayer,
          ClassificationsRepoBody,
          AttemptsRepoBody,
          LedgerServiceBody.pipe(Layer.provideMerge(LedgerRepoBody)),
          ConversationsRepoBody
        )
      )
    );

    const result = await runDb(
      Effect.gen(function* () {
        const triage = yield* InboxOrchestrator;
        const decisions = yield* ClassificationsRepo;
        const ledger = yield* LedgerRepo;
        const conversations = yield* ConversationsRepo;

        // Seed the target as already decided with a stale category, an executed
        // ledger row, and a triage conversation. Also seed an unrelated email so
        // the test proves re-triage is scoped to one email, not the whole inbox.
        yield* decisions.upsert(sensitiveDecisionFor(targetId));
        yield* decisions.upsert(decisionFor(otherId));
        const staleEntry = yield* ledger.append({
          actor: 'batch_agent',
          emailId: targetId,
          action: 'flag_for_review',
          summary: 'stale flag',
          payload: {}
        });
        const otherEntry = yield* ledger.append({
          actor: 'batch_agent',
          emailId: otherId,
          action: 'send_reply',
          summary: 'other reply',
          payload: {}
        });
        yield* conversations.save({
          status: 'awaiting_approval',
          prompt: { content: [] },
          pending: { approvalId: 'ap-1', toolCallId: 'tc-1' },
          emailId: targetId
        });

        const inbox = yield* triage.retriage(targetId);
        const targetDecision = yield* decisions.get(targetId);
        const targetLedger = yield* ledger.listByEmail(targetId);
        const otherLedger = yield* ledger.listByEmail(otherId);
        const awaiting = yield* conversations.listAwaitingApproval();
        return {
          inbox,
          targetDecision,
          targetLedger,
          otherLedger,
          awaiting,
          staleEntryId: staleEntry.id,
          otherEntryId: otherEntry.id
        };
      }).pipe(Effect.provide(RetriageServiceLayer))
    );

    // The stale sensitive decision was replaced by the agent's fresh one.
    expect(result.targetDecision?.category).toBe('status_update');
    expect(result.targetDecision?.whyPreview).toBe('re-triaged fresh');
    // The target's prior ledger row and awaiting approval are gone.
    expect(result.targetLedger).toHaveLength(0);
    expect(result.awaiting).toHaveLength(0);
    // The unrelated email is untouched: its decision, ledger, and status remain.
    expect(result.otherLedger.map((entry) => entry.id)).toEqual([
      result.otherEntryId
    ]);
    const otherItem = result.inbox.items.find(
      (item) => item.email.id === otherId
    );
    expect(otherItem?.classification?.category).toBe('request');
  });

  it('fails with EmailNotFound for an id outside the dataset', async () => {
    const inbox = await inboxWithLedger(decisionFor('e-present'), []);
    const presentId = inbox.items[0]?.email.id;
    expect(presentId).toBe('e-present');

    const EmptyAgentLayer = Layer.succeed(TriageAgent, {
      triageEmail: () =>
        Effect.die(new Error('triageEmail must not run for a missing email'))
    });
    const MissingEmailsLayer = Layer.succeed(EmailsService, {
      list: () => Effect.succeed([]),
      get: (_id: EmailIdType) => Effect.succeed(null),
      thread: (_id: EmailIdType) => Effect.succeed([])
    });
    const MissingServiceLayer = InboxOrchestratorBody.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          EmptyAgentLayer,
          MissingEmailsLayer,
          ClassificationsRepoBody,
          AttemptsRepoBody,
          LedgerServiceBody.pipe(Layer.provideMerge(LedgerRepoBody)),
          ConversationsRepoBody
        )
      )
    );

    const exit = await runDb(
      Effect.gen(function* () {
        const triage = yield* InboxOrchestrator;
        return yield* Effect.exit(triage.retriage('e-missing'));
      }).pipe(Effect.provide(MissingServiceLayer))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = exit.cause.reasons.find(
        (reason): reason is Cause.Fail<EmailNotFound> =>
          reason._tag === 'Fail' && reason.error instanceof EmailNotFound
      );
      expect(failure?.error.emailId).toBe('e-missing');
    }
  });
});
