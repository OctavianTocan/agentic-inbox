"use client";

import type React from "react";
import { createContext, use, useCallback, useMemo } from "react";
import type { MessageStatus, UIDataTypes, UIMessage, UITools } from "../types";
import { useThread } from "./thread-provider";

export interface MessageContextValue<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  readonly message: UIMessage<METADATA, DATA_PARTS, TOOLS>;
  readonly isLast: boolean;
  readonly status: MessageStatus;
  readonly isEditing: boolean;
  startEdit(): void;
  cancelEdit(): void;
  submitEdit(content: string): Promise<void>;
  regenerate(): void;
}

const MessageContext = createContext<MessageContextValue | undefined>(
  undefined,
);

export interface MessageProviderProps<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  message: UIMessage<METADATA, DATA_PARTS, TOOLS>;
  children: React.ReactNode;
  index?: number;
}

/** Provides per-message state (status, edit lifecycle, regenerate) to descendant parts. */
export function MessageProvider({ message, children }: MessageProviderProps) {
  const thread = useThread();

  const isLast = useMemo(() => {
    const last = thread.messages.at(-1);
    return last?.id === message.id;
  }, [thread.messages, message.id]);

  const status: MessageStatus = useMemo(() => {
    if (isLast && thread.status.type === "streaming") {
      return { type: "streaming" };
    }
    if (thread.status.type === "error" && isLast) {
      return { type: "error", error: thread.status.error };
    }
    return { type: "complete" };
  }, [isLast, thread.status]);

  const isEditing = thread.editingMessageId === message.id;

  const startEdit = useCallback(() => {
    thread.startEdit(message.id);
  }, [thread, message.id]);

  const cancelEdit = useCallback(() => {
    thread.cancelEdit();
  }, [thread]);

  const submitEdit = useCallback(
    async (content: string) => {
      await thread.edit(message.id, content);
    },
    [thread, message.id],
  );

  const regenerate = useCallback(() => {
    thread.regenerate({ messageId: message.id });
  }, [thread, message.id]);

  const value = useMemo((): MessageContextValue => {
    return {
      message,
      isLast,
      status,
      isEditing,
      startEdit,
      cancelEdit,
      submitEdit,
      regenerate,
    };
  }, [
    message,
    isLast,
    status,
    isEditing,
    startEdit,
    cancelEdit,
    submitEdit,
    regenerate,
  ]);

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
}

/**
 * Reads the surrounding `MessageProvider` context.
 *
 * @param options - Optional `role` to assert the message's role matches.
 * @returns The message context value.
 * @throws When called outside a `MessageProvider`, or when `options.role` is
 *   given and does not match the message's role.
 */
export function useMessage<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>(options?: {
  role?: UIMessage<METADATA, DATA_PARTS, TOOLS>["role"];
}): MessageContextValue<METADATA, DATA_PARTS, TOOLS> {
  const context = use(MessageContext);

  if (!context) {
    throw new Error("useMessage must be used within a MessageProvider");
  }

  if (options?.role && context.message.role !== options.role) {
    throw new Error("Message role does not match the provided role");
  }

  return context as MessageContextValue<METADATA, DATA_PARTS, TOOLS>;
}
