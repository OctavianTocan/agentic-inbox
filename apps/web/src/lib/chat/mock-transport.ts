import type {
  ChatTransport,
  ChatTransportEvent,
  ChatTransportRequest
} from './transport';

type ScriptStep =
  | { readonly kind: 'delay'; readonly ms: number }
  | { readonly kind: 'event'; readonly event: ChatTransportEvent };

const TOOL_CALL_ID = 'call_search_emails';

/** Scripted turn: a thinking pause, a search_emails tool round, then a streamed answer. */
const SCRIPT: readonly ScriptStep[] = [
  { kind: 'delay', ms: 500 },
  {
    kind: 'event',
    event: {
      type: 'tool-call-start',
      toolCallId: TOOL_CALL_ID,
      toolName: 'search_emails'
    }
  },
  { kind: 'delay', ms: 250 },
  {
    kind: 'event',
    event: {
      type: 'tool-call-args',
      toolCallId: TOOL_CALL_ID,
      args: { query: 'needs attention', status: 'needs-attention' }
    }
  },
  { kind: 'delay', ms: 650 },
  {
    kind: 'event',
    event: {
      type: 'tool-result',
      toolCallId: TOOL_CALL_ID,
      output: {
        matches: [
          { id: 'e-014', subject: 'Refund request for a duplicate charge' },
          { id: 'e-016', subject: 'Safety incident at the print studio' },
          { id: 'e-031', subject: 'Customer escalation about a late order' }
        ]
      }
    }
  },
  { kind: 'delay', ms: 300 },
  { kind: 'event', event: { type: 'text-delta', delta: 'Three items ' } },
  { kind: 'delay', ms: 120 },
  { kind: 'event', event: { type: 'text-delta', delta: 'need your ' } },
  { kind: 'delay', ms: 120 },
  { kind: 'event', event: { type: 'text-delta', delta: 'attention:\n\n' } },
  { kind: 'delay', ms: 140 },
  {
    kind: 'event',
    event: {
      type: 'text-delta',
      delta: '1. **Duplicate charge** — a customer asks for a refund.\n'
    }
  },
  { kind: 'delay', ms: 160 },
  {
    kind: 'event',
    event: {
      type: 'text-delta',
      delta: '2. **Safety incident** at the print studio.\n'
    }
  },
  { kind: 'delay', ms: 160 },
  {
    kind: 'event',
    event: {
      type: 'text-delta',
      delta: '3. **Customer escalation** about a late order.\n'
    }
  },
  { kind: 'delay', ms: 180 },
  {
    kind: 'event',
    event: {
      type: 'text-delta',
      delta: '\nWant me to draft a reply to any of these?'
    }
  },
  { kind: 'event', event: { type: 'done' } }
];

/** Resolves after `ms`, rejecting early if the signal aborts. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * In-memory transport that replays a fixed scripted turn with realistic
 * pacing and one tool call. Stands in for the fetch-based transport until the
 * backend `/chat` stream lands.
 */
export function createMockTransport(): ChatTransport {
  return {
    async *send({
      signal
    }: ChatTransportRequest): AsyncIterable<ChatTransportEvent> {
      for (const step of SCRIPT) {
        if (step.kind === 'delay') {
          await wait(step.ms, signal);
          continue;
        }
        yield step.event;
      }
    }
  };
}
