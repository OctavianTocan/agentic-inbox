import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpTransport } from '@/lib/chat/http-transport';
import type { ChatTransportEvent } from '@/lib/chat/transport';

/** Builds a browser-like SSE response from raw event payloads. */
function sseResponse(payloads: readonly string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const payload of payloads) {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }
        controller.close();
      }
    }),
    { status: 200 }
  );
}

/** Collects one async event stream into a stable array for assertions. */
async function collect(
  stream: AsyncIterable<ChatTransportEvent>
): Promise<readonly ChatTransportEvent[]> {
  const events: ChatTransportEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe('createHttpTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps backend SSE events and reuses the returned conversation id', async () => {
    const requestBodies: string[] = [];
    const responses = [
      sseResponse([
        '{"type":"text_delta","delta":"Hello"}',
        '{"type":"tool_call","toolCallId":"call-1","toolName":"search_emails","input":{"query":"attention"}}',
        '{"type":"tool_result","toolCallId":"call-1","output":{"count":3}}',
        '{"type":"done","conversationId":"conv-1"}'
      ]),
      sseResponse(['{"type":"done","conversationId":"conv-1"}'])
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        requestBodies.push(String(init?.body ?? ''));
        const response = responses.shift();
        if (response === undefined) {
          return new Response(null, { status: 500 });
        }
        return response;
      })
    );

    const transport = createHttpTransport();
    const first = await collect(
      transport.send({ text: 'What needs attention?', history: [] })
    );
    const second = await collect(
      transport.send({ text: 'Continue', history: [] })
    );

    expect(first).toEqual([
      { type: 'text-delta', delta: 'Hello' },
      {
        type: 'tool-call-start',
        toolCallId: 'call-1',
        toolName: 'search_emails'
      },
      {
        type: 'tool-call-args',
        toolCallId: 'call-1',
        args: { query: 'attention' }
      },
      {
        type: 'tool-result',
        toolCallId: 'call-1',
        output: { count: 3 }
      },
      { type: 'done', conversationId: 'conv-1' }
    ]);
    expect(second).toEqual([{ type: 'done', conversationId: 'conv-1' }]);
    expect(requestBodies).toEqual([
      '{"message":"What needs attention?"}',
      '{"message":"Continue","conversationId":"conv-1"}'
    ]);
  });
});
