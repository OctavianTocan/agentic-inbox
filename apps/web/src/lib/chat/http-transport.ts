import type {
  ChatTransport,
  ChatTransportEvent,
  ChatTransportRequest
} from './transport';

const CHAT_ENDPOINT = '/api/v1/chat';

/** Object-like value that can be safely indexed by string keys. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a string property from an unknown event record. */
function stringField(
  record: Readonly<Record<string, unknown>>,
  key: string
): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/** Converts one backend chat event payload into frontend transport events. */
function eventsFromPayload(
  payload: Readonly<Record<string, unknown>>
): readonly ChatTransportEvent[] {
  const type = stringField(payload, 'type');
  if (type === 'text_delta') {
    const delta = stringField(payload, 'delta');
    return delta === null ? [] : [{ type: 'text-delta', delta }];
  }
  if (type === 'reasoning_delta') {
    const delta = stringField(payload, 'delta');
    return delta === null ? [] : [{ type: 'text-delta', delta }];
  }
  if (type === 'tool_call') {
    const toolCallId = stringField(payload, 'toolCallId');
    const toolName = stringField(payload, 'toolName');
    if (toolCallId === null || toolName === null) {
      return [];
    }
    return [
      { type: 'tool-call-start', toolCallId, toolName },
      { type: 'tool-call-args', toolCallId, args: payload.input ?? {} }
    ];
  }
  if (type === 'tool_result') {
    const toolCallId = stringField(payload, 'toolCallId');
    return toolCallId === null
      ? []
      : [{ type: 'tool-result', toolCallId, output: payload.output }];
  }
  if (type === 'done') {
    const conversationId = stringField(payload, 'conversationId');
    return conversationId === null
      ? [{ type: 'done' }]
      : [{ type: 'done', conversationId }];
  }
  return [];
}

/** Parses one SSE message block into frontend transport events. */
function eventsFromSseBlock(block: string): readonly ChatTransportEvent[] {
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n');
  if (data.length === 0 || data === '[DONE]') {
    return [];
  }
  const parsed: unknown = JSON.parse(data);
  return isRecord(parsed) ? eventsFromPayload(parsed) : [];
}

/** Streams SSE response bytes into frontend transport events. */
async function* eventsFromResponse(
  response: Response
): AsyncIterable<ChatTransportEvent> {
  if (response.body === null) {
    throw new Error('Chat response had no body');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        yield* eventsFromSseBlock(block);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      yield* eventsFromSseBlock(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}

/** Builds a fetch-backed chat transport for the `/chat` SSE endpoint. */
export function createHttpTransport(): ChatTransport {
  let conversationId: string | null = null;

  return {
    async *send(
      request: ChatTransportRequest
    ): AsyncIterable<ChatTransportEvent> {
      const payload =
        conversationId === null
          ? { message: request.text }
          : { message: request.text, conversationId };
      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      };
      if (request.signal !== undefined) {
        init.signal = request.signal;
      }
      const response = await fetch(CHAT_ENDPOINT, init);
      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(message || `HTTP ${response.status}`);
      }
      for await (const event of eventsFromResponse(response)) {
        if (event.type === 'done' && event.conversationId !== undefined) {
          conversationId = event.conversationId;
        }
        yield event;
      }
    }
  };
}
