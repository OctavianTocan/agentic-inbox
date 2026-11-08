import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  DynamicToolUIPart,
  TextUIPart,
  UIMessage
} from '../src/ai-ui/types';
import { useChatAdapter } from '../src/lib/chat/adapter';
import type {
  ChatTransport,
  ChatTransportEvent
} from '../src/lib/chat/transport';

/** Transport whose events are pushed by the test, one awaited at a time. */
function createControllableTransport() {
  const queue: ChatTransportEvent[] = [];
  let resolveNext: (() => void) | null = null;

  const push = (event: ChatTransportEvent) => {
    queue.push(event);
    resolveNext?.();
    resolveNext = null;
  };

  const transport: ChatTransport = {
    async *send(): AsyncIterable<ChatTransportEvent> {
      while (true) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }
        const event = queue.shift();
        if (!event) {
          continue;
        }
        if (event.type === 'done') {
          return;
        }
        yield event;
      }
    }
  };

  return { transport, push };
}

/** The single assistant message's parts after the current render. */
function assistantParts(messages: readonly UIMessage[]) {
  const assistant = messages.find((message) => message.role === 'assistant');
  return assistant?.parts ?? [];
}

describe('useChatAdapter', () => {
  it('appends a user message and streams text deltas into one text part', async () => {
    const { transport, push } = createControllableTransport();
    const { result } = renderHook(() => useChatAdapter(transport));

    let send!: Promise<void>;
    act(() => {
      send = result.current.sendMessage({ content: 'hi' });
    });

    expect(result.current.messages[0]?.role).toBe('user');
    expect(result.current.status.type).toBe('submitting');

    act(() => {
      push({ type: 'text-delta', delta: 'Hel' });
    });
    await waitFor(() => {
      expect(result.current.status.type).toBe('streaming');
    });

    act(() => {
      push({ type: 'text-delta', delta: 'lo' });
    });
    await waitFor(() => {
      const parts = assistantParts(result.current.messages);
      expect(parts).toHaveLength(1);
      expect((parts[0] as TextUIPart).text).toBe('Hello');
    });

    act(() => {
      push({ type: 'done' });
    });
    await act(async () => {
      await send;
    });
    expect(result.current.status.type).toBe('ready');
    const finalText = assistantParts(result.current.messages)[0] as TextUIPart;
    expect(finalText.state).toBe('done');
  });

  it('advances a tool part through its input/output states', async () => {
    const { transport, push } = createControllableTransport();
    const { result } = renderHook(() => useChatAdapter(transport));

    let send!: Promise<void>;
    act(() => {
      send = result.current.sendMessage({ content: 'what needs attention?' });
    });

    act(() => {
      push({
        type: 'tool-call-start',
        toolCallId: 'c1',
        toolName: 'search_emails'
      });
    });
    await waitFor(() => {
      const part = assistantParts(result.current.messages)[0] as
        | DynamicToolUIPart
        | undefined;
      expect(part?.type).toBe('dynamic-tool');
      expect(part?.state).toBe('input-streaming');
    });

    act(() => {
      push({ type: 'tool-call-args', toolCallId: 'c1', args: { query: 'x' } });
    });
    await waitFor(() => {
      const part = assistantParts(result.current.messages)[0] as
        | DynamicToolUIPart
        | undefined;
      expect(part?.state).toBe('input-available');
      expect(part?.input).toEqual({ query: 'x' });
    });

    act(() => {
      push({ type: 'tool-result', toolCallId: 'c1', output: { count: 3 } });
    });
    await waitFor(() => {
      const part = assistantParts(result.current.messages)[0] as
        | DynamicToolUIPart
        | undefined;
      expect(part?.state).toBe('output-available');
      expect(part?.output).toEqual({ count: 3 });
      // Input from the earlier event survives onto the result state.
      expect(part?.input).toEqual({ query: 'x' });
      // One part reused by call id, not duplicated per event.
      expect(assistantParts(result.current.messages)).toHaveLength(1);
    });

    act(() => {
      push({ type: 'done' });
    });
    await act(async () => {
      await send;
    });
  });

  it('produces a fresh messages reference on every chunk', async () => {
    const { transport, push } = createControllableTransport();
    const { result } = renderHook(() => useChatAdapter(transport));

    let send!: Promise<void>;
    act(() => {
      send = result.current.sendMessage({ content: 'hi' });
    });

    act(() => {
      push({ type: 'text-delta', delta: 'a' });
    });
    let firstRef!: readonly UIMessage[];
    await waitFor(() => {
      expect(assistantParts(result.current.messages)).toHaveLength(1);
      firstRef = result.current.messages;
    });

    act(() => {
      push({ type: 'text-delta', delta: 'b' });
    });
    await waitFor(() => {
      // A new array identity forces React consumers to re-render on each delta.
      expect(result.current.messages).not.toBe(firstRef);
    });

    act(() => {
      push({ type: 'done' });
    });
    await act(async () => {
      await send;
    });
  });
});
