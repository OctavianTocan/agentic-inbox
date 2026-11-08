"use client";

import { useEffect, useRef } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";

/**
 * Scrolls to bottom when a new user message appears in the message list.
 * Must be used inside a `StickToBottom` (i.e. `MessageList`) context.
 *
 * @param messageCount - Current number of messages in the list.
 * @param lastMessageRole - Role of the final message, used to scroll only on user sends.
 */
export function useScrollOnSubmit(
  messageCount: number,
  lastMessageRole: string | undefined,
) {
  const { scrollToBottom } = useStickToBottomContext();
  const prevCountRef = useRef(messageCount);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = messageCount;

    if (messageCount > prevCount && lastMessageRole === "user") {
      scrollToBottom();
    }
  }, [messageCount, lastMessageRole, scrollToBottom]);
}
