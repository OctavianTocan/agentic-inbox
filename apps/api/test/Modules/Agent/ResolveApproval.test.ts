import { ApprovalDecisionRequest } from '@app/api-core/Modules/Actions/Domain';
import {
  ApprovalAlreadyResolved,
  ApprovalNotFound
} from '@app/api-core/Modules/Actions/Errors';
import { Email as EmailSchema } from '@app/api-core/Modules/Emails/Domain';
import { type Cause, Effect, Exit, Layer } from 'effect';
import { LanguageModel } from 'effect/unstable/ai';
import { describe, expect, it } from 'vitest';
import type { EmailIdType } from '@/Lib/Ids';
import { ActionLedgerRepoBody } from '@/Modules/Actions/Repo';
import { ActionService, ActionServiceBody } from '@/Modules/Actions/Service';
import { ToolModel, TriageModel } from '@/Modules/Agent/Model';
import { AgentService, AgentServiceBody } from '@/Modules/Agent/Service';
import { ConversationsRepoBody } from '@/Modules/Chat/Repo';
import { EmailsService } from '@/Modules/Emails/Service';
import { DecisionsRepoBody } from '@/Modules/Triage/Repo';
import { runDb } from '../../support/Database';
import {
  type GenerateTextScript,
  hasApprovalResponse,
  makeLanguageModelFake,
  textPart,
  toolCallPart
} from '../../support/LanguageModelFake';

const SENSITIVE_EMAIL_ID: EmailIdType = 'e-050';
const SENSITIVE_EMAIL = new EmailSchema({
  id: SENSITIVE_EMAIL_ID,
  from: 'Owner <owner@example.com>',
  to: ['pm@example.com'],
  cc: [],
  subject: 'Safety incident on site',
  body: 'A worker was injured near the east wall pour. Please respond.',
  timestamp: '2026-05-01T12:00:00Z',
  inReplyTo: null
});

const AGENT_DRAFT = 'We accept responsibility for the injury.';

const sensitiveDecisionJson = JSON.stringify({
  emailId: SENSITIVE_EMAIL_ID,
  category: 'safety',
  severity: 'high',
  confidence: 0.95,
  whyPreview: 'Safety incident with legal exposure',
  rationale: 'A safety incident can create legal exposure; defer to the human.',
  keyFacts: ['injury', 'east wall'],
  isSensitive: true
});

const EmailsLayer = Layer.succeed(EmailsService, {
  list: () => Effect.succeed([SENSITIVE_EMAIL]),
  get: (id: EmailIdType) =>
    Effect.succeed(id === SENSITIVE_EMAIL_ID ? SENSITIVE_EMAIL : null),
  thread: (id: EmailIdType) =>
    Effect.succeed(id === SENSITIVE_EMAIL_ID ? [SENSITIVE_EMAIL] : [])
});

/** Rebinds the scripted fake under both agent model roles so the real service resolves its `TriageModel`/`ToolModel` deps. */
const modelLayers = (
  script: GenerateTextScript
): Layer.Layer<TriageModel | ToolModel> => {
  const fake = makeLanguageModelFake({
    generateText: script,
    decisionJson: sensitiveDecisionJson
  });
  return Layer.mergeAll(
    Layer.effect(TriageModel, LanguageModel.LanguageModel).pipe(
      Layer.provide(fake)
    ),
    Layer.effect(ToolModel, LanguageModel.LanguageModel).pipe(
      Layer.provide(fake)
    )
  );
};

/** Assembles the real `AgentService` over test repos with the scripted fake driving both model roles. */
const agentLayer = (script: GenerateTextScript) =>
  AgentServiceBody.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        ActionServiceBody.pipe(
          Layer.provideMerge(
            Layer.mergeAll(ActionLedgerRepoBody, DecisionsRepoBody)
          )
        ),
        ConversationsRepoBody,
        EmailsLayer,
        modelLayers(script)
      )
    )
  );

/** Scripts a sensitive send_reply that pauses, then a closing line once the approval resumes. */
const pauseThenSendScript: GenerateTextScript = (prompt) =>
  hasApprovalResponse(prompt)
    ? [textPart('Handled the approved decision.')]
    : [
        toolCallPart({
          id: 'call-1',
          name: 'send_reply',
          params: { emailId: SENSITIVE_EMAIL_ID, body: AGENT_DRAFT }
        })
      ];

describe('AgentService.resolveApproval (real service, fake models)', () => {
  it('approve resumes the paused send and records exactly the sent reply in the ledger', async () => {
    // TASK req 2/3 (the HITL spine): a sensitive send pauses for the human; on
    // approve the resumed loop executes the send and the ledger carries it, so
    // the audit trail proves the human authorized this money-relevant action.
    const entry = await runDb(
      Effect.gen(function* () {
        const agent = yield* AgentService;
        const triaged = yield* agent.triageEmail(SENSITIVE_EMAIL);
        if (triaged.approval === null) {
          return yield* Effect.die(
            new Error('sensitive email must pause for approval')
          );
        }
        return yield* agent.resolveApproval(
          triaged.approval.id,
          new ApprovalDecisionRequest({ verdict: 'approve' })
        );
      }).pipe(Effect.provide(agentLayer(pauseThenSendScript)))
    );

    expect(entry.action).toBe('send_reply');
    expect(entry.payload).toEqual({ body: AGENT_DRAFT });
    expect(entry.emailId).toBe(SENSITIVE_EMAIL_ID);
  });

  it('approve with an edited body sends the reviewer edit, not the agent draft', async () => {
    // TASK req 3: the human can correct the agent before the send fires. The
    // resumed loop must execute with the reviewer's text so a wrong draft is
    // cheaply fixed rather than sent verbatim.
    const editedBody = 'Thanks for the report; our safety lead will follow up.';
    const entry = await runDb(
      Effect.gen(function* () {
        const agent = yield* AgentService;
        const triaged = yield* agent.triageEmail(SENSITIVE_EMAIL);
        if (triaged.approval === null) {
          return yield* Effect.die(
            new Error('sensitive email must pause for approval')
          );
        }
        return yield* agent.resolveApproval(
          triaged.approval.id,
          new ApprovalDecisionRequest({ verdict: 'approve', editedBody })
        );
      }).pipe(Effect.provide(agentLayer(pauseThenSendScript)))
    );

    expect(entry.action).toBe('send_reply');
    expect(entry.payload).toEqual({ body: editedBody });
  });

  it('deny resolves the conversation with no send in the ledger', async () => {
    // TASK req 2 (the money invariant): a denied sensitive action must never
    // execute. The resumed loop takes no send action, so the ledger holds no
    // send_reply for the email; the deferral is recorded as a flag instead.
    const denyScript: GenerateTextScript = (prompt) =>
      hasApprovalResponse(prompt)
        ? [textPart('Left the email for the human.')]
        : [
            toolCallPart({
              id: 'call-1',
              name: 'send_reply',
              params: { emailId: SENSITIVE_EMAIL_ID, body: AGENT_DRAFT }
            })
          ];

    const result = await runDb(
      Effect.gen(function* () {
        const agent = yield* AgentService;
        const actions = yield* ActionService;
        const triaged = yield* agent.triageEmail(SENSITIVE_EMAIL);
        if (triaged.approval === null) {
          return yield* Effect.die(
            new Error('sensitive email must pause for approval')
          );
        }
        const entry = yield* agent.resolveApproval(
          triaged.approval.id,
          new ApprovalDecisionRequest({ verdict: 'deny' })
        );
        const ledger = yield* actions.listLedger(SENSITIVE_EMAIL_ID);
        return { entry, ledger };
      }).pipe(Effect.provide(agentLayer(denyScript)))
    );

    // With no auto-action executed, resolveApproval falls back to recording a
    // flag_for_review so the deferral is still legible in the audit trail.
    expect(result.entry.action).toBe('flag_for_review');
    const sends = result.ledger.filter(
      (entry) => entry.action === 'send_reply'
    );
    expect(sends).toHaveLength(0);
  });

  it('fails with ApprovalNotFound for an approval id that never existed', async () => {
    // An unknown approval id is a typed, recoverable failure the HTTP layer maps
    // to a 404 — it must not crash the request or resume an arbitrary send.
    const exit = await runDb(
      Effect.gen(function* () {
        const agent = yield* AgentService;
        return yield* Effect.exit(
          agent.resolveApproval(
            'ap-does-not-exist',
            new ApprovalDecisionRequest({ verdict: 'approve' })
          )
        );
      }).pipe(Effect.provide(agentLayer(pauseThenSendScript)))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = exit.cause.reasons.find(
        (reason): reason is Cause.Fail<ApprovalNotFound> =>
          reason._tag === 'Fail' && reason.error instanceof ApprovalNotFound
      );
      expect(failure?.error.approvalId).toBe('ap-does-not-exist');
    }
  });

  it('fails with ApprovalNotFound when the same approval is resolved twice', async () => {
    // Resolving succeeds once; the second resolve of the same id must be a typed
    // failure, not a duplicate send. claimApproval flips the conversation off
    // awaiting_approval, so a repeat claim finds nothing and reports not-found.
    const exit = await runDb(
      Effect.gen(function* () {
        const agent = yield* AgentService;
        const triaged = yield* agent.triageEmail(SENSITIVE_EMAIL);
        if (triaged.approval === null) {
          return yield* Effect.die(
            new Error('sensitive email must pause for approval')
          );
        }
        yield* agent.resolveApproval(
          triaged.approval.id,
          new ApprovalDecisionRequest({ verdict: 'approve' })
        );
        return yield* Effect.exit(
          agent.resolveApproval(
            triaged.approval.id,
            new ApprovalDecisionRequest({ verdict: 'approve' })
          )
        );
      }).pipe(Effect.provide(agentLayer(pauseThenSendScript)))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const notFound = exit.cause.reasons.find(
        (reason): reason is Cause.Fail<ApprovalNotFound> =>
          reason._tag === 'Fail' && reason.error instanceof ApprovalNotFound
      );
      const alreadyResolved = exit.cause.reasons.find(
        (reason): reason is Cause.Fail<ApprovalAlreadyResolved> =>
          reason._tag === 'Fail' &&
          reason.error instanceof ApprovalAlreadyResolved
      );
      // A resolved conversation is off awaiting_approval, so the repeat claim
      // reports not-found rather than already-resolved.
      expect(notFound).toBeDefined();
      expect(alreadyResolved).toBeUndefined();
    }
  });
});
