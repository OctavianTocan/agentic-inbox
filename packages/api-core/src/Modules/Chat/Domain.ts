import { Schema } from 'effect';

/** Who authored a chat message. */
export const ChatRole: Schema.Literals<readonly ['user', 'assistant']> =
  Schema.Literals(['user', 'assistant']).annotate({
    identifier: 'ChatRole',
    description: 'Author of a chat message.'
  });

/** Plain-text segment of an assistant or user message. */
export class TextPart extends Schema.Class<TextPart>('TextPart')({
  type: Schema.tag('text'),
  text: Schema.String
}) {}

/** Model reasoning segment surfaced to the UI. */
export class ReasoningPart extends Schema.Class<ReasoningPart>('ReasoningPart')(
  {
    type: Schema.tag('reasoning'),
    text: Schema.String
  }
) {}

/** Tool invocation segment rendered as a labeled badge in the UI. */
export class ToolPart extends Schema.Class<ToolPart>('ToolPart')({
  type: Schema.tag('dynamic-tool'),
  toolName: Schema.String.annotate({
    description: 'Name of the invoked tool.'
  }),
  toolCallId: Schema.String.annotate({
    description: 'Correlates the call with its result.'
  }),
  input: Schema.Record(Schema.String, Schema.Unknown).annotate({
    description: 'Arguments passed to the tool.'
  }),
  output: Schema.optional(Schema.Unknown).annotate({
    description: 'Tool result once available.'
  })
}) {}

/** A segment of a chat message. */
export const ChatPart: Schema.Union<
  readonly [typeof TextPart, typeof ReasoningPart, typeof ToolPart]
> = Schema.Union([TextPart, ReasoningPart, ToolPart]).annotate({
  identifier: 'ChatPart'
});

/** One turn in the sidepanel conversation. */
export class ChatMessage extends Schema.Class<ChatMessage>('ChatMessage')({
  id: Schema.String,
  role: ChatRole,
  parts: Schema.Array(ChatPart)
}) {}

/** Request body for sending a chat message. */
export class ChatRequest extends Schema.Class<ChatRequest>('ChatRequest')({
  message: Schema.String.pipe(Schema.check(Schema.isNonEmpty())).annotate({
    description: 'The user prompt to send to the chat agent.'
  }),
  conversationId: Schema.optional(Schema.String).annotate({
    description:
      'Existing conversation to continue, or omit to start a new one.'
  })
}) {}

/** Incremental text delta emitted by the chat stream. */
export class ChatTextDelta extends Schema.Class<ChatTextDelta>('ChatTextDelta')(
  {
    type: Schema.tag('text_delta'),
    delta: Schema.String
  }
) {}

/** Incremental reasoning delta emitted by the chat stream. */
export class ChatReasoningDelta extends Schema.Class<ChatReasoningDelta>(
  'ChatReasoningDelta'
)({
  type: Schema.tag('reasoning_delta'),
  delta: Schema.String
}) {}

/** A tool call started by the chat agent. */
export class ChatToolCall extends Schema.Class<ChatToolCall>('ChatToolCall')({
  type: Schema.tag('tool_call'),
  toolCallId: Schema.String,
  toolName: Schema.String,
  input: Schema.Record(Schema.String, Schema.Unknown)
}) {}

/** The result of a chat agent tool call. */
export class ChatToolResult extends Schema.Class<ChatToolResult>(
  'ChatToolResult'
)({
  type: Schema.tag('tool_result'),
  toolCallId: Schema.String,
  output: Schema.Unknown
}) {}

/** Terminal event signalling the chat turn is complete. */
export class ChatDone extends Schema.Class<ChatDone>('ChatDone')({
  type: Schema.tag('done'),
  conversationId: Schema.String
}) {}

/** A single event in the chat SSE stream. */
export const ChatStreamEvent: Schema.Union<
  readonly [
    typeof ChatTextDelta,
    typeof ChatReasoningDelta,
    typeof ChatToolCall,
    typeof ChatToolResult,
    typeof ChatDone
  ]
> = Schema.Union([
  ChatTextDelta,
  ChatReasoningDelta,
  ChatToolCall,
  ChatToolResult,
  ChatDone
]).annotate({
  identifier: 'ChatStreamEvent',
  description: 'Discriminated event emitted over the chat SSE stream.'
});
