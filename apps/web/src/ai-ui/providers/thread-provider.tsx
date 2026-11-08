"use client";

import { createContext, use, useCallback, useMemo, useState } from "react";
import type {
  ChatAdapter,
  SuggestionItem,
  ThreadStatus,
  UIDataTypes,
  UITools,
} from "../types";

export interface ThreadContextValue {
  readonly messages: ChatAdapter["messages"];
  readonly status: ThreadStatus;
  readonly suggestions: readonly SuggestionItem[];
  readonly editingMessageId: string | null;
  readonly addToolOutput: ChatAdapter["addToolOutput"];
  sendMessage(
    message: Parameters<ChatAdapter["sendMessage"]>[0],
  ): Promise<void>;
  stop(): void;
  regenerate(options?: { messageId?: string }): Promise<void>;
  edit(messageId: string, content: string): Promise<void>;
  startEdit(messageId: string): void;
  cancelEdit(): void;
}

const ThreadContext = createContext<ThreadContextValue | undefined>(undefined);

export interface ThreadProviderProps<
  METADATA = unknown,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> extends React.PropsWithChildren {
  adapter: ChatAdapter<METADATA, DATA_TYPES, TOOLS>;
  suggestions?: readonly SuggestionItem[];
}

const EMPTY_SUGGESTIONS: readonly SuggestionItem[] = [];

/** Provides thread state and actions to descendant components. */
export function ThreadProvider<
  METADATA = unknown,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>({
  adapter,
  suggestions = EMPTY_SUGGESTIONS,
  children,
}: ThreadProviderProps<METADATA, DATA_TYPES, TOOLS>) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const startEdit = useCallback((messageId: string) => {
    setEditingMessageId(messageId);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const edit = useCallback(
    async (messageId: string, content: string) => {
      try {
        await adapter.edit(messageId, content);
      } finally {
        setEditingMessageId(null);
      }
    },
    [adapter],
  );

  const value = useMemo(
    (): ThreadContextValue => ({
      messages: adapter.messages,
      status: adapter.status,
      suggestions,
      editingMessageId,
      addToolOutput: adapter.addToolOutput,
      sendMessage: adapter.sendMessage,
      stop: adapter.stop,
      regenerate: adapter.regenerate,
      edit,
      startEdit,
      cancelEdit,
    }),
    [
      adapter.messages,
      adapter.status,
      adapter.sendMessage,
      adapter.stop,
      adapter.regenerate,
      adapter.addToolOutput,
      suggestions,
      editingMessageId,
      edit,
      startEdit,
      cancelEdit,
    ],
  );

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

/** Reads the surrounding `ThreadProvider` context. Throws outside one. */
export function useThread(): ThreadContextValue {
  const context = use(ThreadContext);

  if (!context) {
    throw new Error("useThread must be used within a ThreadProvider");
  }

  return context;
}
