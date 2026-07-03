import { Decision } from '@app/api-core/Modules/Triage/Domain';
import { Effect, Layer } from 'effect';
import { LanguageModel, Prompt } from 'effect/unstable/ai';
import { describe, expect, it } from 'vitest';
import { ActionLedgerRepoBody } from '@/Modules/Actions/Repo';
import { ActionService, ActionServiceBody } from '@/Modules/Actions/Service';
import { makeTriageHandlers, makeTriageToolkit } from '@/Modules/Agent/Toolkit';
import { DecisionsRepoBody } from '@/Modules/Triage/Repo';
import { runDb } from '../../support/Database';
import {
  hasApprovalResponse,
  hasToolResult,
  makeLanguageModelFake,
  textPart,
  toolCallPart
} from '../../support/LanguageModelFake';

const ActionsLayer = ActionServiceBody.pipe(
  Layer.provideMerge(Layer.mergeAll(ActionLedgerRepoBody, DecisionsRepoBody))
);

const routineDecisionJson = JSON.stringify({
  emailId: 'e-001',
  category: 'rfi',
  severity: 'medium',
  confidence: 0.9,
  whyPreview: 'RFI needs a slab edge confirmation',
  rationale: 'Sender asks for a design clarification before layout.',
  keyFacts: ['RFI-001'],
  isSensitive: false
});

describe('triage decision via generateObject (fake model)', () => {
  it('decodes the structured decision the model returns for an email', async () => {
    // The decision call is generateObject; the fake serves it through the same
    // provider hook with responseFormat json, proving the decision half of the
    // spine runs without a live provider (TASK req 1: the agent decides).
    const fake = makeLanguageModelFake({
      generateText: () => [],
      decisionJson: routineDecisionJson
    });
    const decision = await Effect.runPromise(
      Effect.gen(function* () {
        const model = yield* LanguageModel.LanguageModel;
        const response = yield* model.generateObject({
          objectName: 'Decision',
          schema: Decision,
          prompt: [{ role: 'user', content: 'classify e-001' }]
        });
        return response.value;
      }).pipe(Effect.provide(fake))
    );

    expect(decision.category).toBe('rfi');
    expect(decision.isSensitive).toBe(false);
  });
});

describe('routine triage tool loop (fake model)', () => {
  it('executes send_reply autonomously and writes exactly one ledger entry', async () => {
    // TASK req 1: routine work is done for the PM. A non-sensitive toolkit must
    // let the model's send_reply run through to the ledger with no approval.
    const toolkit = makeTriageToolkit(false);
    const fake = makeLanguageModelFake({
      generateText: (prompt) =>
        hasToolResult(prompt)
          ? [textPart('Replied to the RFI.')]
          : [
              toolCallPart({
                id: 'call-1',
                name: 'send_reply',
                params: { emailId: 'e-001', body: 'Confirmed the slab edge.' }
              })
            ]
    });

    const { parts, ledger } = await runDb(
      Effect.gen(function* () {
        const actions = yield* ActionService;
        const response = yield* LanguageModel.generateText({
          toolkit,
          prompt: [{ role: 'user', content: 'reply to e-001' }],
          concurrency: 1
        }).pipe(
          Effect.provide(
            toolkit.toLayer(makeTriageHandlers(actions, 'batch_agent'))
          ),
          Effect.provide(fake)
        );
        const ledger = yield* actions.listLedger('e-001');
        return { parts: response.content.map((p) => p.type), ledger };
      }).pipe(Effect.provide(ActionsLayer))
    );

    expect(parts).not.toContain('tool-approval-request');
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.action).toBe('send_reply');
    expect(ledger[0]?.payload).toEqual({ body: 'Confirmed the slab edge.' });
  });
});

describe('sensitive triage tool loop (fake model)', () => {
  it('pauses send_reply for approval and never writes a ledger send', async () => {
    // TASK req 2 (the money invariant): a sensitive email must never be
    // auto-actioned. Even when the model calls send_reply, the gate must turn it
    // into a pending approval and leave the ledger empty.
    const toolkit = makeTriageToolkit(true);
    const fake = makeLanguageModelFake({
      generateText: () => [
        toolCallPart({
          id: 'call-1',
          name: 'send_reply',
          params: {
            emailId: 'e-050',
            body: 'We accept responsibility for the injury.'
          }
        })
      ]
    });

    const { parts, ledger } = await runDb(
      Effect.gen(function* () {
        const actions = yield* ActionService;
        const response = yield* LanguageModel.generateText({
          toolkit,
          prompt: [{ role: 'user', content: 'reply to e-050' }],
          concurrency: 1
        }).pipe(
          Effect.provide(
            toolkit.toLayer(makeTriageHandlers(actions, 'batch_agent'))
          ),
          Effect.provide(fake)
        );
        const ledger = yield* actions.listLedger('e-050');
        return { parts: response.content.map((p) => p.type), ledger };
      }).pipe(Effect.provide(ActionsLayer))
    );

    expect(parts).toContain('tool-approval-request');
    expect(ledger).toHaveLength(0);
  });
});

describe('approval resume with edited body (fake model)', () => {
  it('sends the reviewer edit, not the agent draft, when the approval is resumed', async () => {
    // TASK req 2/3 (human-in-the-loop spine): a sensitive send pauses; the
    // reviewer approves with edits; the resumed loop must execute the send with
    // the EDITED body. This mirrors resolveApproval appending a
    // tool-approval-response and re-running the loop.
    const toolkit = makeTriageToolkit(true);
    const agentDraft = 'We accept responsibility for the injury.';
    const editedBody = 'Thanks for the report; our safety lead will follow up.';
    const fake = makeLanguageModelFake({
      generateText: (prompt) =>
        hasApprovalResponse(prompt)
          ? [textPart('Sent the approved reply.')]
          : [
              toolCallPart({
                id: 'call-1',
                name: 'send_reply',
                params: { emailId: 'e-050', body: agentDraft }
              })
            ]
    });

    const ledger = await runDb(
      Effect.gen(function* () {
        const actions = yield* ActionService;
        const handlers = toolkit.toLayer(
          makeTriageHandlers(actions, 'batch_agent')
        );
        const initialPrompt = Prompt.make([
          { role: 'user', content: 'reply to e-050' }
        ]);

        const paused = yield* LanguageModel.generateText({
          toolkit,
          prompt: initialPrompt,
          concurrency: 1
        }).pipe(Effect.provide(handlers), Effect.provide(fake));

        const approvalRequest = paused.content.find(
          (part) => part.type === 'tool-approval-request'
        );
        if (approvalRequest === undefined) {
          return yield* Effect.die(new Error('expected a pending approval'));
        }

        // Rebuild the paused prompt with the reviewer edit swapped into the
        // send_reply tool call, exactly as resolveApproval's withSendReplyBody does.
        const pausedPrompt = Prompt.concat(
          initialPrompt,
          Prompt.fromResponseParts(paused.content)
        );
        const edited = withEditedSendBody(pausedPrompt, 'call-1', editedBody);
        const resumed = Prompt.concat(
          edited,
          Prompt.make([
            {
              role: 'tool',
              content: [
                Prompt.makePart('tool-approval-response', {
                  approvalId: approvalRequest.approvalId,
                  approved: true
                })
              ]
            }
          ])
        );

        yield* LanguageModel.generateText({
          toolkit,
          prompt: resumed,
          concurrency: 1
        }).pipe(Effect.provide(handlers), Effect.provide(fake));

        return yield* actions.listLedger('e-050');
      }).pipe(Effect.provide(ActionsLayer))
    );

    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.action).toBe('send_reply');
    expect(ledger[0]?.payload).toEqual({ body: editedBody });
  });

  it('does not send when the approval is denied', async () => {
    // TASK req 2: a denied approval must not execute the gated send; the ledger
    // stays empty and the pause simply ends with no action taken.
    const toolkit = makeTriageToolkit(true);
    const fake = makeLanguageModelFake({
      generateText: (prompt) =>
        hasApprovalResponse(prompt)
          ? [textPart('Left the email for the human.')]
          : [
              toolCallPart({
                id: 'call-1',
                name: 'send_reply',
                params: { emailId: 'e-050', body: 'auto draft' }
              })
            ]
    });

    const ledger = await runDb(
      Effect.gen(function* () {
        const actions = yield* ActionService;
        const handlers = toolkit.toLayer(
          makeTriageHandlers(actions, 'batch_agent')
        );
        const initialPrompt = Prompt.make([
          { role: 'user', content: 'reply to e-050' }
        ]);

        const paused = yield* LanguageModel.generateText({
          toolkit,
          prompt: initialPrompt,
          concurrency: 1
        }).pipe(Effect.provide(handlers), Effect.provide(fake));

        const approvalRequest = paused.content.find(
          (part) => part.type === 'tool-approval-request'
        );
        if (approvalRequest === undefined) {
          return yield* Effect.die(new Error('expected a pending approval'));
        }

        const resumed = Prompt.concat(
          Prompt.concat(
            initialPrompt,
            Prompt.fromResponseParts(paused.content)
          ),
          Prompt.make([
            {
              role: 'tool',
              content: [
                Prompt.makePart('tool-approval-response', {
                  approvalId: approvalRequest.approvalId,
                  approved: false
                })
              ]
            }
          ])
        );

        yield* LanguageModel.generateText({
          toolkit,
          prompt: resumed,
          concurrency: 1
        }).pipe(Effect.provide(handlers), Effect.provide(fake));

        return yield* actions.listLedger('e-050');
      }).pipe(Effect.provide(ActionsLayer))
    );

    expect(ledger).toHaveLength(0);
  });
});

/** Swaps the `body` param of one send_reply tool call in a paused prompt. */
const withEditedSendBody = (
  prompt: Prompt.Prompt,
  toolCallId: string,
  body: string
): Prompt.Prompt => {
  const messages = prompt.content.map((message) => {
    if (message.role !== 'assistant') {
      return message;
    }
    const content = message.content.map((part) => {
      if (part.type !== 'tool-call' || part.id !== toolCallId) {
        return part;
      }
      const params =
        typeof part.params === 'object' &&
        part.params !== null &&
        !Array.isArray(part.params)
          ? { ...part.params, body }
          : { body };
      return Prompt.makePart('tool-call', {
        id: part.id,
        name: part.name,
        params,
        providerExecuted: part.providerExecuted
      });
    });
    return Prompt.makeMessage('assistant', { content });
  });
  return Prompt.fromMessages(messages);
};
