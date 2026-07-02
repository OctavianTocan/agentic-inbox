import { afterEach, describe, expect, it, vi } from 'vitest';
import { inboxClient } from '@/lib/inbox/client';
import type { TriageRunEvent } from '@/lib/inbox/types';

/** Builds a browser-like SSE response from raw message blocks. */
function sseResponse(blocks: readonly string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const block of blocks) {
          controller.enqueue(encoder.encode(`${block}\n\n`));
        }
        controller.close();
      }
    }),
    { status: 200 }
  );
}

/** Collects one async event stream into a stable array for assertions. */
async function collect(
  stream: AsyncIterable<TriageRunEvent>
): Promise<readonly TriageRunEvent[]> {
  const events: TriageRunEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe('inboxClient.runTriage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps triage SSE events and requires an explicit done event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          'data: {"type":"started","emailId":"e-001"}',
          'data: {"type":"done","processed":80}'
        ])
      )
    );

    await expect(collect(inboxClient.runTriage())).resolves.toEqual([
      { type: 'started', emailId: 'e-001' },
      { type: 'done', processed: 80 }
    ]);
  });

  it('throws when the triage SSE stream emits an API error event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          'event: error\n' +
            'data: {"_tag":"TriageRunFailed","detail":"Database unavailable"}'
        ])
      )
    );

    await expect(collect(inboxClient.runTriage())).rejects.toThrow(
      'Database unavailable'
    );
  });

  it('throws when the triage stream closes before done', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse(['data: {"type":"started","emailId":"e-001"}'])
      )
    );

    await expect(collect(inboxClient.runTriage())).rejects.toThrow(
      'Triage run ended before completion'
    );
  });
});
