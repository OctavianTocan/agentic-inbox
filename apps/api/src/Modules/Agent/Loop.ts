import {
  ApprovalRequest,
  type LedgerEntry
} from '@app/api-core/Modules/Actions/Domain';
import {
  type ChatStreamEvent,
  ChatTextDelta,
  ChatToolCall,
  ChatToolResult
} from '@app/api-core/Modules/Chat/Domain';
import { type Config, type Context, Effect, Schedule, Schema } from 'effect';
import { type AiError, LanguageModel, Prompt } from 'effect/unstable/ai';
import type { AttemptIdType, EmailIdType } from '@/Lib/Ids';
import type { LedgerService } from '@/Modules/Actions/Service';
import type { EmailsService } from '@/Modules/Emails/Service';
import {
  ChatToolkit,
  makeChatHandlers,
  makeTriageHandlers,
  type TriageToolkit
} from './Toolkit';
export type TriageEmailOptions = {
  /** Attempt id minted by InboxOrchestrator (wire: runId). */
  readonly runId?: AttemptIdType | undefined;
};

export const MAX_AGENT_TURNS = 6;

/** Longer backoff than the old 250ms ramp — free OpenRouter keys reject bursts. */
export const retrySchedule = Schedule.exponential('2 seconds').pipe(
  Schedule.take(2)
);

export const encodePrompt = Schema.encodeSync(Prompt.Prompt);
export const decodePrompt = Schema.decodeUnknownSync(Prompt.Prompt);

export type PendingApproval = {
  readonly approvalId: string;
  readonly toolCallId: string;
};

export type ChatEvent = Schema.Schema.Type<typeof ChatStreamEvent>;

export type LoopResult = {
  readonly prompt: Prompt.Prompt;
  readonly pending: PendingApproval | null;
  readonly chatEvents: ReadonlyArray<ChatEvent>;
};

type LedgerActions = Context.Service.Shape<typeof LedgerService>;

/** Runs generateText with retry + tool model. */
export const generateToolTurn =
  (toolModel: LanguageModel.Service) =>
  <A, E, R>(turn: Effect.Effect<A, E, R>) =>
    turn.pipe(
      Effect.retry({ schedule: retrySchedule }),
      Effect.provideService(LanguageModel.LanguageModel, toolModel)
    );

/**
 * Runs the native Effect AI tool loop until completion or approval pause.
 *
 * @param toolModel - Model used for tool-calling turns.
 * @param actions - Ledger service for tool handlers.
 * @param initialPrompt - Starting prompt for the loop.
 * @param mode - Triage vs chat toolkit selection.
 * @param triageToolkit - Toolkit used when mode is triage (or chat resume on TriageToolkit).
 * @param runId - Attempt id for triage ledger rows; omit for chat-only walks.
 * @param emails - Email dataset; required when mode is chat.
 */
export const runLoop = Effect.fn('AgentLoop.runLoop')(function* (
  toolModel: LanguageModel.Service,
  actions: LedgerActions,
  initialPrompt: Prompt.Prompt,
  mode: 'triage' | 'chat',
  triageToolkit: typeof TriageToolkit,
  runId?: AttemptIdType,
  emails?: Context.Service.Shape<typeof EmailsService>
): Effect.fn.Return<
  LoopResult,
  | Config.ConfigError
  | AiError.AiError
  | import('@app/api-core/Modules/Actions/Errors').ActionNotFound
  | import('@app/api-core/Modules/Actions/Errors').ActionNotUndoable,
  never
> {
  const generateTurn = generateToolTurn(toolModel);

  const step = Effect.fnUntraced(function* (
    prompt: Prompt.Prompt,
    turn: number,
    chatEvents: ReadonlyArray<ChatEvent>
  ): Effect.fn.Return<
    LoopResult,
    | Config.ConfigError
    | AiError.AiError
    | import('@app/api-core/Modules/Actions/Errors').ActionNotFound
    | import('@app/api-core/Modules/Actions/Errors').ActionNotUndoable,
    never
  > {
    if (turn >= MAX_AGENT_TURNS) {
      return { prompt, pending: null, chatEvents };
    }

    const response =
      mode === 'triage'
        ? yield* generateTurn(
            LanguageModel.generateText({
              toolkit: triageToolkit,
              prompt,
              concurrency: 4
            }).pipe(
              Effect.provide(
                triageToolkit.toLayer(
                  makeTriageHandlers(actions, 'batch_agent', runId)
                )
              )
            )
          )
        : yield* generateTurn(
            LanguageModel.generateText({
              toolkit: ChatToolkit,
              prompt,
              concurrency: 4
            }).pipe(
              Effect.provide(
                ChatToolkit.toLayer(
                  makeChatHandlers(actions, emails!, 'chat_agent')
                )
              )
            )
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

/** Returns the first approval request part from a model response. */
export const findPendingApproval = (
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
export const chatEventsFromParts = (
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
export const approvalRequestFromPrompt = (
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
    actionRevision: 1,
    createdAt: new Date().toISOString()
  });
};

/**
 * Rewrites the `body` param of one paused `send_reply` tool call so the resumed
 * send executes with the reviewer's edited text instead of the agent's draft.
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
export const findToolCall = (
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
export const emailIdFromPrompt = (
  prompt: Prompt.Prompt
): EmailIdType | null => {
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

/** Ledger rows written since `before`. */
export const actedSince = (
  actions: LedgerActions,
  emailId: EmailIdType,
  before: ReadonlyArray<LedgerEntry>
) =>
  Effect.gen(function* () {
    const after = yield* actions.listLedger(emailId);
    const beforeIds = new Set(before.map((entry: LedgerEntry) => entry.id));
    return after.filter((entry: LedgerEntry) => !beforeIds.has(entry.id));
  });

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
