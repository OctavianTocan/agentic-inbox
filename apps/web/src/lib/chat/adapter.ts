'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  ChatAdapter,
  CreateMessage,
  DynamicToolUIPart,
  TextUIPart,
  ThreadStatus,
  UIMessage,
  UIMessagePart
} from '@/ai-ui/types';
import type { ChatTransport, ChatTransportEvent } from './transport';

let messageCounter = 0;

/** Monotonic id for a freshly created message, unique within the session. */
function nextMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

/** History pairs sent to the transport: role plus concatenated text parts. */
function toHistory(
  messages: readonly UIMessage[]
): ReadonlyArray<{ role: 'user' | 'assistant'; text: string }> {
  return messages.flatMap((message) => {
    if (message.role === 'system') {
      return [];
    }
    const text = message.parts
      .flatMap((part) => (part.type === 'text' ? [part.text] : []))
      .join('');
    return [{ role: message.role, text }];
  });
}

/** Appends a text delta to the assistant message, extending its trailing text part. */
function applyTextDelta(
  parts: readonly UIMessagePart[],
  delta: string
): UIMessagePart[] {
  const last = parts.at(-1);
  if (last?.type === 'text') {
    const updated: TextUIPart = {
      ...last,
      text: last.text + delta,
      state: 'streaming'
    };
    return [...parts.slice(0, -1), updated];
  }
  const created: TextUIPart = { type: 'text', text: delta, state: 'streaming' };
  return [...parts, created];
}

/** Replaces the tool part matching `toolCallId`, or appends when absent. */
function upsertToolPart(
  parts: readonly UIMessagePart[],
  toolCallId: string,
  next: DynamicToolUIPart
): UIMessagePart[] {
  const index = parts.findIndex(
    (part) => part.type === 'dynamic-tool' && part.toolCallId === toolCallId
  );
  if (index === -1) {
    return [...parts, next];
  }
  return [...parts.slice(0, index), next, ...parts.slice(index + 1)];
}

/** Folds one transport event into the assistant message's parts, always returning fresh references. */
function reduceEvent(
  parts: readonly UIMessagePart[],
  event: ChatTransportEvent
): UIMessagePart[] {
  switch (event.type) {
    case 'text-delta':
      return applyTextDelta(parts, event.delta);
    case 'tool-call-start':
      return upsertToolPart(parts, event.toolCallId, {
        type: 'dynamic-tool',
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        state: 'input-streaming'
      });
    case 'tool-call-args':
      return upsertToolPart(parts, event.toolCallId, {
        type: 'dynamic-tool',
        toolName: findToolName(parts, event.toolCallId),
        toolCallId: event.toolCallId,
        state: 'input-available',
        input: event.args
      });
    case 'tool-result':
      return upsertToolPart(parts, event.toolCallId, {
        type: 'dynamic-tool',
        toolName: findToolName(parts, event.toolCallId),
        toolCallId: event.toolCallId,
        state: 'output-available',
        input: findToolInput(parts, event.toolCallId),
        output: event.output
      });
    default:
      return [...parts];
  }
}

/** Tool name recorded by an earlier event for `toolCallId`, or an empty string. */
function findToolName(
  parts: readonly UIMessagePart[],
  toolCallId: string
): string {
  const existing = parts.find(
    (part) => part.type === 'dynamic-tool' && part.toolCallId === toolCallId
  );
  return existing?.type === 'dynamic-tool' ? existing.toolName : '';
}

/** Tool input captured by an earlier `tool-call-args` event for `toolCallId`. */
function findToolInput(
  parts: readonly UIMessagePart[],
  toolCallId: string
): unknown {
  const existing = parts.find(
    (part) => part.type === 'dynamic-tool' && part.toolCallId === toolCallId
  );
  return existing?.type === 'dynamic-tool' ? existing.input : undefined;
}

/** Marks any streaming text part as done so the UI stops animating it. */
function finalizeParts(parts: readonly UIMessagePart[]): UIMessagePart[] {
  return parts.map((part) =>
    part.type === 'text' ? { ...part, state: 'done' } : part
  );
}

/**
 * Chat state store backed by a {@link ChatTransport}. Owns the message list
 * and thread status, streaming each turn into new array/object references so
 * React re-renders on every chunk.
 *
 * @param transport - Backend seam that streams one assistant turn per send.
 * @returns A {@link ChatAdapter} the ai-ui runtime and composer consume.
 */
export function useChatAdapter(transport: ChatTransport): ChatAdapter {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ThreadStatus>({ type: 'ready' });
  const [error, setError] = useState<Error | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<UIMessage[]>(messages);
  messagesRef.current = messages;

  const runTurn = useCallback(
    async (userText: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setError(undefined);

      const assistantId = nextMessageId('assistant');
      const assistant: UIMessage = {
        id: assistantId,
        role: 'assistant',
        parts: []
      };
      setMessages((prev) => [...prev, assistant]);

      /** Rewrites the in-flight assistant message's parts by id. */
      const updateAssistant = (
        map: (parts: readonly UIMessagePart[]) => UIMessagePart[]
      ) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, parts: map(message.parts) }
              : message
          )
        );
      };

      try {
        const stream = transport.send({
          text: userText,
          history: toHistory(messagesRef.current),
          signal: controller.signal
        });
        for await (const event of stream) {
          if (event.type === 'done') {
            break;
          }
          setStatus({ type: 'streaming', messageId: assistantId });
          updateAssistant((parts) => reduceEvent(parts, event));
        }
        updateAssistant(finalizeParts);
        setStatus({ type: 'ready' });
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          updateAssistant(finalizeParts);
          setStatus({ type: 'ready' });
          return;
        }
        const failure =
          caught instanceof Error ? caught : new Error('Chat turn failed');
        setError(failure);
        setStatus({ type: 'error', error: failure });
      } finally {
        abortRef.current = null;
      }
    },
    [transport]
  );

  const sendMessage = useCallback(
    async ({ content }: CreateMessage) => {
      const userMessage: UIMessage = {
        id: nextMessageId('user'),
        role: 'user',
        parts: [{ type: 'text', text: content, state: 'done' }]
      };
      setMessages((prev) => [...prev, userMessage]);
      setStatus({ type: 'submitting' });
      await runTurn(content);
    },
    [runTurn]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(async () => {
    const lastUser = [...messagesRef.current]
      .reverse()
      .find((message) => message.role === 'user');
    if (!lastUser) {
      return;
    }
    const lastUserText = lastUser.parts
      .flatMap((part) => (part.type === 'text' ? [part.text] : []))
      .join('');
    setMessages((prev) => {
      const lastUserIndex = prev.map((m) => m.role).lastIndexOf('user');
      return lastUserIndex === -1 ? prev : prev.slice(0, lastUserIndex + 1);
    });
    setStatus({ type: 'submitting' });
    await runTurn(lastUserText);
  }, [runTurn]);

  const edit = useCallback(
    async (messageId: string, content: string) => {
      const index = messagesRef.current.findIndex((m) => m.id === messageId);
      if (index === -1) {
        return;
      }
      const edited: UIMessage = {
        id: messageId,
        role: 'user',
        parts: [{ type: 'text', text: content, state: 'done' }]
      };
      setMessages((prev) => [...prev.slice(0, index), edited]);
      setStatus({ type: 'submitting' });
      await runTurn(content);
    },
    [runTurn]
  );

  const setMessagesExternal = useCallback<ChatAdapter['setMessages']>(
    (messagesOrUpdater) => {
      setMessages((prev) =>
        typeof messagesOrUpdater === 'function'
          ? messagesOrUpdater(prev)
          : messagesOrUpdater
      );
    },
    []
  );

  const addToolOutput = useCallback<ChatAdapter['addToolOutput']>(
    async (params) => {
      setMessages((prev) =>
        prev.map((message) => ({
          ...message,
          parts: message.parts.map((part) =>
            part.type === 'dynamic-tool' &&
            part.toolCallId === params.toolCallId
              ? applyToolOutput(part, params)
              : part
          )
        }))
      );
    },
    []
  );

  const clearError = useCallback(() => {
    setError(undefined);
    setStatus((prev) => (prev.type === 'error' ? { type: 'ready' } : prev));
  }, []);

  return useMemo<ChatAdapter>(
    () => ({
      messages,
      status,
      ...(error ? { error } : {}),
      sendMessage,
      stop,
      regenerate,
      edit,
      setMessages: setMessagesExternal,
      addToolOutput,
      clearError
    }),
    [
      messages,
      status,
      error,
      sendMessage,
      stop,
      regenerate,
      edit,
      setMessagesExternal,
      addToolOutput,
      clearError
    ]
  );
}

/** Applies a manual tool output/error onto a dynamic-tool part. */
function applyToolOutput(
  part: DynamicToolUIPart,
  params: Parameters<ChatAdapter['addToolOutput']>[0]
): DynamicToolUIPart {
  if (params.state === 'output-error') {
    return {
      type: 'dynamic-tool',
      toolName: part.toolName,
      toolCallId: part.toolCallId,
      state: 'output-error',
      input: part.input,
      errorText: params.errorText
    };
  }
  return {
    type: 'dynamic-tool',
    toolName: part.toolName,
    toolCallId: part.toolCallId,
    state: 'output-available',
    input: part.input,
    output: params.output
  };
}
