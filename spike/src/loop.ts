import { Effect, Schema } from 'effect';
import {
  LanguageModel,
  Prompt,
  type Response,
  type Tool,
  type Toolkit
} from 'effect/unstable/ai';
import { InboxToolkit } from './toolkit.ts';

type LoopServices =
  | LanguageModel.LanguageModel
  | Tool.HandlersFor<Toolkit.Tools<typeof InboxToolkit>>;

export const MAX_TURNS = 6;

export type LoopResult =
  | {
      readonly _tag: 'done';
      readonly prompt: Prompt.Prompt;
      readonly text: string;
      readonly turns: number;
    }
  | {
      readonly _tag: 'awaiting-approval';
      readonly prompt: Prompt.Prompt;
      readonly approvals: ReadonlyArray<{
        readonly approvalId: string;
        readonly toolCallId: string;
      }>;
      readonly turns: number;
    };

const pendingApprovals = (
  content: ReadonlyArray<Response.AnyPart>
): ReadonlyArray<{
  readonly approvalId: string;
  readonly toolCallId: string;
}> =>
  content
    .filter(
      (part): part is Response.ToolApprovalRequestPart =>
        part.type === 'tool-approval-request'
    )
    .map((part) => ({
      approvalId: part.approvalId,
      toolCallId: part.toolCallId
    }));

/**
 * Runs the agent loop from an accumulated prompt until the model stops calling
 * tools, an approval is requested, or {@link MAX_TURNS} is reached.
 *
 * @param initial - Conversation state to continue from (system + user, or a resumed history).
 * @param turn - Current turn index, used to enforce the turn cap.
 * @returns Either the completed conversation, or a paused state carrying the pending approvals.
 */
export const runLoop = (
  initial: Prompt.Prompt,
  turn = 0
): Effect.Effect<LoopResult, unknown, LoopServices> =>
  Effect.gen(function* () {
    if (turn >= MAX_TURNS) {
      return {
        _tag: 'done',
        prompt: initial,
        text: '[turn cap reached]',
        turns: turn
      } as const;
    }

    const response = yield* LanguageModel.generateText({
      toolkit: InboxToolkit,
      prompt: initial
    });

    const nextPrompt = Prompt.concat(
      initial,
      Prompt.fromResponseParts(response.content)
    );
    const approvals = pendingApprovals(response.content);
    if (approvals.length > 0) {
      return {
        _tag: 'awaiting-approval',
        prompt: nextPrompt,
        approvals,
        turns: turn + 1
      } as const;
    }

    const madeToolCall = response.content.some(
      (part) => part.type === 'tool-call' || part.type === 'tool-result'
    );
    if (!madeToolCall) {
      return {
        _tag: 'done',
        prompt: nextPrompt,
        text: response.text,
        turns: turn + 1
      } as const;
    }

    return yield* runLoop(nextPrompt, turn + 1);
  });

const PromptCodec = Prompt.Prompt;

/** Serializes accumulated conversation state to a JSON-encodable value. */
export const encodePrompt = Schema.encodeSync(PromptCodec);

/** Restores conversation state produced by {@link encodePrompt}. */
export const decodePrompt = Schema.decodeSync(PromptCodec);
