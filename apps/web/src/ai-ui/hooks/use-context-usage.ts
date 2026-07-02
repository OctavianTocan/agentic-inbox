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
    const source = messages.findLast(
      (m: UIMessage) =>
        m.role === "assistant" &&
        readMessageTotalTokens(m.metadata) !== undefined,
    );
    const totalTokens = readMessageTotalTokens(source?.metadata);
    if (totalTokens === undefined) {
      return null;
    }

    return {
      inputTokens: readMessageInputTokens(source?.metadata),
      outputTokens: readMessageOutputTokens(source?.metadata),
      totalTokens,
      contextWindow,
      ratio: totalTokens / contextWindow,
    };
  }, [messages, contextWindow]);
}
