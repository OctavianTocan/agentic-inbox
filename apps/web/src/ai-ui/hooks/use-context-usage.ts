"use client";

import { useMemo } from "react";
import {
  readMessageInputTokens,
  readMessageOutputTokens,
  readMessageTotalTokens,
} from "../helpers";
import { useThread } from "../providers/thread-provider";
import type { UIMessage } from "../types";

const DEFAULT_CONTEXT_WINDOW = 200_000;

interface MessageMetadata {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface ContextUsageOptions {
  readonly contextWindow?: number;
}

export interface ContextUsageInfo extends MessageMetadata {
  readonly contextWindow: number;
  readonly ratio: number;
}

/**
 * Reports the latest assistant turn's token usage against the context window.
 *
 * @param options - Optional `contextWindow` size; defaults to 200k tokens.
 * @returns Usage info with `ratio` of the window consumed, or `null` when no
 * assistant message in the thread reports token usage yet.
 */
export function useContextUsage(
  options?: ContextUsageOptions,
): ContextUsageInfo | null {
  const { messages } = useThread();
  const contextWindow = options?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;

  return useMemo(() => {
    let source: UIMessage | undefined;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        message !== undefined &&
        message.role === "assistant" &&
        readMessageTotalTokens(message.metadata) !== undefined
      ) {
        source = message;
        break;
      }
    }

    const totalTokens = readMessageTotalTokens(source?.metadata);
    if (totalTokens === undefined) {
      return null;
    }

    const inputTokens = readMessageInputTokens(source?.metadata);
    const outputTokens = readMessageOutputTokens(source?.metadata);

    return {
      ...(inputTokens !== undefined && { inputTokens }),
      ...(outputTokens !== undefined && { outputTokens }),
      totalTokens,
      contextWindow,
      ratio: totalTokens / contextWindow,
    };
  }, [messages, contextWindow]);
}
