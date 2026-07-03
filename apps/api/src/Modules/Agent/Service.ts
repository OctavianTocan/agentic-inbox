import {
  type ApprovalDecisionRequest,
  ApprovalRequest,
  type LedgerEntry
} from '@app/api-core/Modules/Actions/Domain';
import {
  type ActionNotFound,
  type ActionNotUndoable,
  ApprovalAlreadyResolved,
  ApprovalNotFound
} from '@app/api-core/Modules/Actions/Errors';
import {
  ChatDone,
  type ChatRequest,
  type ChatStreamEvent,
  ChatTextDelta,
  ChatToolCall,
  ChatToolResult
} from '@app/api-core/Modules/Chat/Domain';
import type { Email } from '@app/api-core/Modules/Emails/Domain';
import { Decision } from '@app/api-core/Modules/Triage/Domain';
import { TriageActed } from '@app/api-core/Modules/Triage/Events';
import { type Config, Context, Effect, Layer, Schedule, Schema } from 'effect';
import { type AiError, LanguageModel, Prompt } from 'effect/unstable/ai';
import type { EmailIdType } from '@/Lib/Ids';
import { isSensitive } from '@/Modules/Actions/Policy';
import { ActionService, ActionServiceLive } from '@/Modules/Actions/Service';
import { ConversationsRepo, ConversationsRepoLive } from '@/Modules/Chat/Repo';
import { EmailsService, EmailsServiceLive } from '@/Modules/Emails/Service';
import {
  ToolModel,
  ToolModelLive,
  TriageModel,
  TriageModelLive
} from './Model';
import {
  CHAT_SYSTEM_PROMPT,
  TRIAGE_SYSTEM_PROMPT,
  triageActionPrompt,
  triageDecisionPrompt
} from './Prompts';
import {
  ChatToolkit,
  makeChatHandlers,
  makeTriageHandlers,
  makeTriageToolkit,
  TriageToolkit
} from './Toolkit';

const MAX_AGENT_TURNS = 6;
const retrySchedule = Schedule.exponential('250 millis').pipe(Schedule.take(3));
const encodePrompt = Schema.encodeSync(Prompt.Prompt);
const decodePrompt = Schema.decodeUnknownSync(Prompt.Prompt);

type PendingApproval = {
  readonly approvalId: string;
  readonly toolCallId: string;
};

type ChatEvent = Schema.Schema.Type<typeof ChatStreamEvent>;

type LoopResult = {
  readonly prompt: Prompt.Prompt;
  readonly pending: PendingApproval | null;
  readonly chatEvents: ReadonlyArray<ChatEvent>;
};

/** Runs model decisions, tool calls, and approval resume for the inbox agents. */
export class AgentService extends Context.Service<
  AgentService,
  {
    readonly triageEmail: (email: Email) => Effect.Effect<
      {
        readonly decision: Decision;
        readonly actions: ReadonlyArray<TriageActed>;
        readonly approval: ApprovalRequest | null;
      },
      Config.ConfigError | ActionNotFound | ActionNotUndoable | AiError.AiError
    >;
    readonly resolveApproval: (
      approvalId: string,
      input: ApprovalDecisionRequest
    ) => Effect.Effect<
      LedgerEntry,
      | ApprovalNotFound
      | ApprovalAlreadyResolved
      | ActionNotFound
      | ActionNotUndoable
      | Config.ConfigError
      | AiError.AiError
    >;
    readonly chat: (
      input: ChatRequest
    ) => Effect.Effect<
      ReadonlyArray<ChatEvent>,
      | Config.ConfigError
      | ApprovalNotFound
      | ActionNotFound
      | ActionNotUndoable
      | AiError.AiError
    >;
  }
>()('@apps/api/Agent/AgentService') {}

/** `AgentService` without its dependencies; use {@link AgentServiceLive}. */
export const AgentServiceBody: Layer.Layer<
  AgentService,
  never,
  ActionService | ConversationsRepo | EmailsService | TriageModel | ToolModel
> = Layer.effect(
  AgentService,
  Effect.gen(function* () {
    const actions = yield* ActionService;
    const conversations = yield* ConversationsRepo;
    const emails = yield* EmailsService;
    const triageModel = yield* TriageModel;
    const toolModel = yield* ToolModel;

    /** Generates and normalizes the decision for one email. */
    const generateDecision = Effect.fn('AgentService.generateDecision')(
      function* (email: Email) {
        const response = yield* LanguageModel.generateObject({
          objectName: 'CogramInboxDecision',
          schema: Decision,
          prompt: [
            {
              role: 'system',
              content:
                'You classify construction project inbox emails. Return only the requested structured object.'
            },
            { role: 'user', content: triageDecisionPrompt(email) }
          ]
        }).pipe(Effect.retry({ schedule: retrySchedule }));

        return normalizeDecision(email, response.value);
      }
    );

    /**
     * Runs the native Effect AI tool loop until completion or approval pause.
     *
     * In triage mode the caller passes a per-email toolkit whose send/archive
     * tools require approval only for sensitive emails; chat mode uses the
     * static chat toolkit.
     */
    const runLoop = Effect.fn('AgentService.runLoop')(function* (
      initialPrompt: Prompt.Prompt,
      mode: 'triage' | 'chat',
      triageToolkit: typeof TriageToolkit
    ): Effect.fn.Return<
      LoopResult,
      Config.ConfigError | ActionNotFound | ActionNotUndoable | AiError.AiError,
      never
    > {
      const step = Effect.fnUntraced(function* (
        prompt: Prompt.Prompt,
        turn: number,
        chatEvents: ReadonlyArray<ChatEvent>
      ): Effect.fn.Return<
        LoopResult,
        | Config.ConfigError
        | ActionNotFound
        | ActionNotUndoable
        | AiError.AiError,
        never
      > {
        if (turn >= MAX_AGENT_TURNS) {
          return { prompt, pending: null, chatEvents };
        }

        const response =
          mode === 'triage'
            ? yield* LanguageModel.generateText({
                toolkit: triageToolkit,
                prompt,
                concurrency: 4
              }).pipe(
                Effect.retry({ schedule: retrySchedule }),
                Effect.provide(
                  triageToolkit.toLayer(
                    makeTriageHandlers(actions, 'batch_agent')
                  )
                ),
                Effect.provideService(LanguageModel.LanguageModel, toolModel)
              )
            : yield* LanguageModel.generateText({
                toolkit: ChatToolkit,
                prompt,
                concurrency: 4
              }).pipe(
                Effect.retry({ schedule: retrySchedule }),
                Effect.provide(
                  ChatToolkit.toLayer(
                    makeChatHandlers(actions, emails, 'chat_agent')
                  )
                ),
                Effect.provideService(LanguageModel.LanguageModel, toolModel)
              );
        const nextPrompt = Prompt.concat(
          prompt,
          Prompt.fromResponseParts(response.content)
        );
        const pending = findPendingApproval(response.content);
        const nextEvents = [
          ...chatEvents,
          ...chatEventsFromParts(response.content)
        ];
        if (pending !== null) {
          return { prompt: nextPrompt, pending, chatEvents: nextEvents };
        }
        if (response.toolCalls.length === 0) {
          return { prompt: nextPrompt, pending: null, chatEvents: nextEvents };
        }
        return yield* step(nextPrompt, turn + 1, nextEvents);
      });

      return yield* step(initialPrompt, 0, []);
    });

    const triageEmail = Effect.fn('AgentService.triageEmail')(function* (
      email: Email
    ) {
      const before = yield* actions.listLedger(email.id);
      const decision = yield* generateDecision(email).pipe(
        Effect.provideService(LanguageModel.LanguageModel, triageModel)
      );
      const prompt = Prompt.make([
        { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
        { role: 'user', content: triageActionPrompt(email, decision) }
      ]);
      const result = yield* runLoop(
        prompt,
        'triage',
        makeTriageToolkit(decision.isSensitive)
      );
      const approval =
        result.pending === null
          ? null
          : approvalRequestFromPrompt(email.id, result.prompt, result.pending);

      if (approval !== null) {
        yield* conversations.save({
          status: 'awaiting_approval',
          prompt: encodePrompt(result.prompt),
          pending: result.pending,
          emailId: email.id
        });
      } else {
        yield* conversations.save({
          status: 'complete',
          prompt: encodePrompt(result.prompt),
          emailId: email.id
        });
      }

      const after = yield* actions.listLedger(email.id);
      const beforeIds = new Set(before.map((entry) => entry.id));
      const newActions = after
        .filter((entry) => !beforeIds.has(entry.id))
        .map((entry) => new TriageActed({ entry }));
      return { decision, actions: newActions, approval };
    });

    const resolveApproval = Effect.fn('AgentService.resolveApproval')(
      function* (approvalId: string, input: ApprovalDecisionRequest) {
        const record = yield* conversations.claimApproval(approvalId);
        if (record === null) {
          const awaiting = yield* conversations.listAwaitingApproval();
          const exists = awaiting.some(
            (item) => item.pending?.approvalId === approvalId
          );
          return yield* Effect.fail(
            exists
              ? new ApprovalAlreadyResolved({ approvalId })
              : new ApprovalNotFound({ approvalId })
          );
        }

        const decoded = decodePrompt(record.prompt);
        const prompt =
          input.verdict === 'approve' &&
          input.editedBody !== undefined &&
          record.pending !== null
            ? withSendReplyBody(
                decoded,
                record.pending.toolCallId,
                input.editedBody
              )
            : decoded;
        const resumed = Prompt.concat(
          prompt,
          Prompt.make([
            {
              role: 'tool',
              content: [
                Prompt.makePart('tool-approval-response', {
                  approvalId,
                  approved: input.verdict === 'approve'
                })
              ]
            }
          ])
        );
        const result = yield* runLoop(resumed, 'chat', TriageToolkit);
        yield* conversations.save({
          id: record.id,
          status: result.pending === null ? 'complete' : 'awaiting_approval',
          prompt: encodePrompt(result.prompt),
          pending: result.pending,
          emailId: record.emailId
        });

        const emailId = record.emailId ?? emailIdFromPrompt(prompt);
        if (emailId === null) {
          return yield* Effect.die(
            new Error(
              `Approval ${approvalId} resolved but its conversation carries no email id; refusing to attribute the outcome to an arbitrary email.`
            )
          );
        }
        const latest = yield* actions.listLedger(emailId);
        const entry = latest[0];
        if (entry !== undefined) {
          return entry;
        }
        return yield* actions.flagForReview({
          emailId,
          actor: 'user',
          summary:
            input.verdict === 'approve'
              ? `Approved ${approvalId}`
              : `Denied ${approvalId}`
        });
      }
    );

    const chat = Effect.fn('AgentService.chat')(function* (input: ChatRequest) {
      const existing =
        input.conversationId === undefined
          ? null
          : yield* conversations.get(input.conversationId);
      if (input.conversationId !== undefined && existing === null) {
        return yield* Effect.fail(
          new ApprovalNotFound({ approvalId: input.conversationId })
        );
      }

      const basePrompt =
        existing === null
          ? Prompt.make([{ role: 'system', content: CHAT_SYSTEM_PROMPT }])
          : decodePrompt(existing.prompt);
      const prompt = Prompt.concat(
        basePrompt,
        Prompt.make([{ role: 'user', content: input.message }])
      );
      const result = yield* runLoop(prompt, 'chat', TriageToolkit);
      const saved = yield* conversations.save({
        id: existing?.id,
        status: result.pending === null ? 'complete' : 'awaiting_approval',
        prompt: encodePrompt(result.prompt),
        pending: result.pending,
        emailId: existing?.emailId
      });
      return [
        ...result.chatEvents,
        new ChatDone({ type: 'done', conversationId: saved.id })
      ];
    });

    return { triageEmail, resolveApproval, chat } as const;
  })
);

/** Production `AgentService` with repos, dataset, action logic, and model layers. */
export const AgentServiceLive = Layer.provide(AgentServiceBody, [
  ActionServiceLive,
  ConversationsRepoLive,
  EmailsServiceLive,
  TriageModelLive,
  ToolModelLive
]);

/** Clamps model-only constraints and applies deterministic sensitivity policy. */
const normalizeDecision = (email: Email, decision: Decision): Decision => {
  const confidence = Math.max(0, Math.min(1, decision.confidence));
  const whyPreview =
    decision.whyPreview.length > 65
      ? decision.whyPreview.slice(0, 65)
      : decision.whyPreview;
  return new Decision({
    emailId: email.id,
    category: decision.category,
    severity: decision.severity,
    confidence,
    whyPreview,
    rationale: decision.rationale,
    keyFacts: decision.keyFacts,
    isSensitive: isSensitive({
      category: decision.category,
      confidence,
      emailBody: `${email.subject}\n${email.body}`
    })
  });
};

/** Returns the first approval request part from a model response. */
const findPendingApproval = (
  parts: ReadonlyArray<{ readonly type: string }>
): PendingApproval | null => {
  for (const part of parts) {
    if (
      part.type === 'tool-approval-request' &&
      'approvalId' in part &&
      'toolCallId' in part &&
      typeof part.approvalId === 'string' &&
      typeof part.toolCallId === 'string'
    ) {
      return { approvalId: part.approvalId, toolCallId: part.toolCallId };
    }
  }
  return null;
};

/** Converts response parts into chat stream events. */
const chatEventsFromParts = (
  parts: ReadonlyArray<{ readonly type: string }>
): ReadonlyArray<ChatEvent> =>
  parts.flatMap<ChatEvent>((part) => {
    if (
      part.type === 'text' &&
      'text' in part &&
      typeof part.text === 'string'
    ) {
      return [new ChatTextDelta({ type: 'text_delta', delta: part.text })];
    }
    if (
      part.type === 'tool-call' &&
      'id' in part &&
      'name' in part &&
      'params' in part &&
      typeof part.id === 'string' &&
      typeof part.name === 'string'
    ) {
      return [
        new ChatToolCall({
          type: 'tool_call',
          toolCallId: part.id,
          toolName: part.name,
          input: toRecord(part.params)
        })
      ];
    }
    if (
      part.type === 'tool-result' &&
      'id' in part &&
      'result' in part &&
      typeof part.id === 'string'
    ) {
      return [
        new ChatToolResult({
          type: 'tool_result',
          toolCallId: part.id,
          output: part.result
        })
      ];
    }
    return [];
  });

/** Builds a UI approval request from the paused prompt. */
const approvalRequestFromPrompt = (
  fallbackEmailId: EmailIdType,
  prompt: Prompt.Prompt,
  pending: PendingApproval
): ApprovalRequest => {
  const toolCall = findToolCall(prompt, pending.toolCallId);
  const payload = toRecord(toolCall?.params);
  const emailId = readEmailId(payload) ?? fallbackEmailId;
  return new ApprovalRequest({
    id: pending.approvalId,
    emailId,
    action: actionFromToolName(toolCall?.name),
    summary: summaryFromToolCall(toolCall?.name, payload),
    payload,
    createdAt: new Date().toISOString()
  });
};

/**
 * Rewrites the `body` param of one paused `send_reply` tool call so the resumed
 * send executes with the reviewer's edited text instead of the agent's draft.
 *
 * @param prompt - The paused conversation prompt to rebuild.
 * @param toolCallId - Id of the tool call whose body should be replaced.
 * @param body - The reviewer's edited reply body.
 * @returns A new prompt with the target tool call's body swapped; unchanged if no such call exists.
 */
export const withSendReplyBody = (
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
      return Prompt.makePart('tool-call', {
        id: part.id,
        name: part.name,
        params: { ...toRecord(part.params), body },
        providerExecuted: part.providerExecuted
      });
    });
    return Prompt.makeMessage('assistant', { content });
  });
  return Prompt.fromMessages(messages);
};

/** Finds a tool call in a prompt by id. */
const findToolCall = (
  prompt: Prompt.Prompt,
  toolCallId: string
): { readonly name: string; readonly params: unknown } | null => {
  for (const message of prompt.content) {
    if (message.role !== 'assistant') {
      continue;
    }
    for (const part of message.content) {
      if (
        part.type === 'tool-call' &&
        part.id === toolCallId &&
        typeof part.name === 'string'
      ) {
        return { name: part.name, params: part.params };
      }
    }
  }
  return null;
};

/** Reads an email id out of the first matching tool call in a prompt. */
const emailIdFromPrompt = (prompt: Prompt.Prompt): EmailIdType | null => {
  for (const message of prompt.content) {
    if (message.role !== 'assistant') {
      continue;
    }
    for (const part of message.content) {
      if (part.type === 'tool-call') {
        const emailId = readEmailId(toRecord(part.params));
        if (emailId !== null) {
          return emailId;
        }
      }
    }
  }
  return null;
};

/** Converts a tool name into an action kind accepted by the ledger contract. */
const actionFromToolName = (
  name: string | undefined
): ApprovalRequest['action'] => {
  if (
    name === 'send_reply' ||
    name === 'archive' ||
    name === 'flag_for_review' ||
    name === 'undo'
  ) {
    return name;
  }
  return 'flag_for_review';
};

/** Builds a short human label for a pending tool call. */
const summaryFromToolCall = (
  name: string | undefined,
  payload: Readonly<Record<string, unknown>>
): string => {
  if (name === 'send_reply') {
    return `Send reply: ${stringField(payload, 'summary') ?? 'draft response'}`;
  }
  if (name === 'archive') {
    return `Archive: ${stringField(payload, 'summary') ?? 'file email'}`;
  }
  if (name === 'undo') {
    return `Undo action ${stringField(payload, 'entryId') ?? ''}`.trim();
  }
  return stringField(payload, 'summary') ?? 'Needs human review';
};

/** Returns a record view for object-like tool params. */
const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }
  return {};
};

/** Reads a string field from a record. */
const stringField = (
  record: Readonly<Record<string, unknown>>,
  key: string
): string | null => {
  const value = record[key];
  return typeof value === 'string' ? value : null;
};

/** Reads a tool payload email id after the tool schema has validated it. */
const readEmailId = (
  record: Readonly<Record<string, unknown>>
): EmailIdType | null => {
  const value = stringField(record, 'emailId');
  return value === null ? null : Schema.decodeUnknownSync(Schema.String)(value);
};
