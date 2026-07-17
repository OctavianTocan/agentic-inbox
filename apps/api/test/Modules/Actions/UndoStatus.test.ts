import { Email as EmailSchema } from '@app/api-core/Modules/Emails/Domain';
import { Decision } from '@app/api-core/Modules/Triage/Domain';
import { Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import type { EmailIdType } from '@/Lib/Ids';
import { ActionLedgerRepo, ActionLedgerRepoBody } from '@/Modules/Actions/Repo';
import { ActionService, ActionServiceBody } from '@/Modules/Actions/Service';
import { AgentService } from '@/Modules/Agent/Service';
import { ConversationsRepoBody } from '@/Modules/Chat/Repo';
import { EmailsService } from '@/Modules/Emails/Service';
import {
  DecisionsRepo,
  DecisionsRepoBody
} from '@/Modules/Triage/Decisions/Repo';
import { TriageService, TriageServiceBody } from '@/Modules/Triage/Service';
import { runDb } from '../../support/Database';

const EMAIL_ID: EmailIdType = 'e-014';

const routineDecision = new Decision({
  emailId: EMAIL_ID,
  category: 'request',
  severity: 'medium',
  confidence: 0.9,
  whyPreview: 'Customer request needs confirmation',
  rationale: 'Sender asks for a routine clarification.',
  keyFacts: ['detail'],
  isSensitive: false,
  policyReasons: []
});

const EMAIL = new EmailSchema({
  id: EMAIL_ID,
  from: 'Sam Builder <sam@example.com>',
  to: ['pm@example.com'],
  cc: [],
  subject: 'Question about order PB-014',
  body: 'Please confirm the detail.',
  timestamp: '2026-05-01T12:00:00Z',
  inReplyTo: null
});

const RealActionsLayer = ActionServiceBody.pipe(
  Layer.provideMerge(Layer.mergeAll(ActionLedgerRepoBody, DecisionsRepoBody))
);

describe('undo write path', () => {
  it('stamps undoneBy on the original entry and links the undo back to it', async () => {
    const result = await runDb(
      Effect.gen(function* () {
        const actions = yield* ActionService;
        const ledger = yield* ActionLedgerRepo;
        const original = yield* actions.sendReply({
          emailId: EMAIL_ID,
          actor: 'batch_agent',
          body: 'Confirmed.'
        });
        const undo = yield* actions.undoAction(original.id, 'user');
        const originalAfter = yield* ledger.get(original.id);
        return { original, undo, originalAfter };
      }).pipe(Effect.provide(RealActionsLayer))
    );

    expect(result.undo.action).toBe('undo');
    expect(result.undo.undoes).toBe(result.original.id);
    // The original send is now marked undone by the new undo entry.
    expect(result.originalAfter?.undoneBy).toBe(result.undo.id);
  });
});

describe('inbox status after undo', () => {
  it('flips a done_for_you email back to needs_attention once its send is undone', async () => {
    const EmailsLayer = Layer.succeed(EmailsService, {
      list: () => Effect.succeed([EMAIL]),
      get: (id: EmailIdType) => Effect.succeed(id === EMAIL_ID ? EMAIL : null),
      thread: (id: EmailIdType) =>
        Effect.succeed(id === EMAIL_ID ? [EMAIL] : [])
    });
    const AgentLayer = Layer.succeed(AgentService, {
      triageEmail: () => Effect.die(new Error('triageEmail not used')),
      resolveApproval: () => Effect.die(new Error('resolveApproval not used')),
      chat: () => Effect.die(new Error('chat not used'))
    });
    const ServiceLayer = TriageServiceBody.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          AgentLayer,
          EmailsLayer,
          DecisionsRepoBody,
          RealActionsLayer,
          ConversationsRepoBody
        )
      )
    );

    const { before, after } = await runDb(
      Effect.gen(function* () {
        const triage = yield* TriageService;
        const decisions = yield* DecisionsRepo;
        const actions = yield* ActionService;

        yield* decisions.upsert(routineDecision);
        const sent = yield* actions.sendReply({
          emailId: EMAIL_ID,
          actor: 'batch_agent',
          body: 'Confirmed.'
        });

        const before = yield* triage.inbox();
        yield* actions.undoAction(sent.id, 'user');
        const after = yield* triage.inbox();
        return { before, after };
      }).pipe(Effect.provide(ServiceLayer))
    );

    const statusOf = (inbox: typeof before): string | undefined =>
      inbox.items.find((item) => item.email.id === EMAIL_ID)?.status;

    expect(statusOf(before)).toBe('done_for_you');
    expect(before.summary.handled).toBe(1);
    // After undo the send no longer counts; the email needs attention again.
    expect(statusOf(after)).toBe('needs_attention');
    expect(after.summary.handled).toBe(0);
    expect(after.summary.needsAttention).toBe(1);
  });
});
