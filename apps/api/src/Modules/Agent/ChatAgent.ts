import type {
  ApprovalDecisionRequest,
  LedgerEntry
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
  type ChatStreamEvent
} from '@app/api-core/Modules/Chat/Domain';
import { type Config, Context, Effect, Layer, type Schema } from 'effect';
import { type AiError, Prompt } from 'effect/unstable/ai';
import type { EmailIdType } from '@/Lib/Ids';
import { LedgerService, LedgerServiceLive } from '@/Modules/Actions/Service';
import { ConversationsRepo, ConversationsRepoLive } from '@/Modules/Chat/Repo';
import { EmailsService, EmailsServiceLive } from '@/Modules/Emails/Service';
import {
  type ChatEvent,
  decodePrompt,
  emailIdFromPrompt,
  encodePrompt,
  type LoopResult,
  runLoop,
  withSendReplyBody
} from './Loop';
import { ToolModel, ToolModelLive } from './Model';
import { CHAT_SYSTEM_PROMPT } from './Prompts';
import { TriageToolkit } from './Toolkit';

type ChatEventType = ChatEvent;

/** Handles chat turns and approval resume for the inbox. */
export class ChatAgent extends Context.Service<
  ChatAgent,
  {
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
      ReadonlyArray<Schema.Schema.Type<typeof ChatStreamEvent>>,
      | Config.ConfigError
      | ApprovalNotFound
      | ActionNotFound
      | ActionNotUndoable
      | AiError.AiError
    >;
  }
>()('@apps/api/Agent/ChatAgent') {}

/** `ChatAgent` without its dependencies; use {@link ChatAgentLive}. */
export const ChatAgentBody: Layer.Layer<
  ChatAgent,
  never,
  LedgerService | ConversationsRepo | EmailsService | ToolModel
> = Layer.effect(
  ChatAgent,
  Effect.gen(function* () {
    const actions = yield* LedgerService;
    const conversations = yield* ConversationsRepo;
    const emails = yield* EmailsService;
    const toolModel = yield* ToolModel;

    /** Persists a loop result as complete or awaiting_approval. */
    const saveLoopResult = Effect.fn('ChatAgent.saveLoopResult')(function* (
      result: LoopResult,
      options: {
        readonly id?: string | undefined;
        readonly emailId?: EmailIdType | null | undefined;
      } = {}
    ) {
      return yield* conversations.save({
        id: options.id,
        status: result.pending === null ? 'complete' : 'awaiting_approval',
        prompt: encodePrompt(result.prompt),
        pending: result.pending,
        emailId: options.emailId
      });
    });

    /** Prefer the newest ledger row; otherwise synthesize a review flag. */
    const latestEntryOrFlag = Effect.fn('ChatAgent.latestEntryOrFlag')(
      function* (
        emailId: EmailIdType,
        approvalId: string,
        verdict: ApprovalDecisionRequest['verdict']
      ) {
        const latest = yield* actions.listLedger(emailId);
        const entry = latest[0];
        if (entry !== undefined) {
          return entry;
        }
        return yield* actions.flagForReview({
          emailId,
          actor: 'user',
          summary:
            verdict === 'approve'
              ? `Approved ${approvalId}`
              : `Denied ${approvalId}`
        });
      }
    );

    const resolveApproval = Effect.fn('ChatAgent.resolveApproval')(function* (
      approvalId: string,
      input: ApprovalDecisionRequest
    ) {
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
      const result = yield* runLoop(
        toolModel,
        actions,
        resumed,
        'chat',
        TriageToolkit,
        undefined,
        emails
      );
      yield* saveLoopResult(result, {
        id: record.id,
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
      return yield* latestEntryOrFlag(emailId, approvalId, input.verdict);
    });

    const chat = Effect.fn('ChatAgent.chat')(function* (input: ChatRequest) {
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
      const result = yield* runLoop(
        toolModel,
        actions,
        prompt,
        'chat',
        TriageToolkit,
        undefined,
        emails
      );
      const saved = yield* saveLoopResult(result, {
        id: existing?.id,
        emailId: existing?.emailId
      });
      return [
        ...result.chatEvents,
        new ChatDone({ type: 'done', conversationId: saved.id })
      ] satisfies ReadonlyArray<ChatEventType>;
    });

    return { resolveApproval, chat } as const;
  })
);

/** Production `ChatAgent` with repos, dataset, ledger, and model layers. */
export const ChatAgentLive = Layer.provide(ChatAgentBody, [
  LedgerServiceLive,
  ConversationsRepoLive,
  EmailsServiceLive,
  ToolModelLive
]);
