"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMessage } from "../providers/message-provider";
import { useAutosizeTextarea } from "./use-autosize-textarea";

export interface UseInlineEditorReturn {
  text: string;
  setText: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  canSave: boolean;
}

/**
 * Drives in-place editing of the surrounding message's text, seeded from its
 * current content and committed through the message provider.
 *
 * @returns Editor state and handlers: the `text` buffer and `setText`, a
 * `textareaRef` to attach, `handleSave` / `handleCancel` / `handleKeyDown`,
 * and `canSave` (true once the text is non-empty and changed).
 */
export function useInlineEditor(): UseInlineEditorReturn {
  const { message, submitEdit, cancelEdit } = useMessage();

  const textContent = message.parts
    .filter((part: { type: string }) => part.type === "text")
    .map((part: { type: string; text?: string }) => part.text ?? "")
    .join("\n");

  const [text, setText] = useState(textContent);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useAutosizeTextarea({
    ref: textareaRef,
    value: text,
    minHeight: 40,
    maxHeight: 240,
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (text.trim()) {
      await submitEdit(text.trim());
    }
  }, [text, submitEdit]);

  const handleCancel = useCallback(() => {
    cancelEdit();
  }, [cancelEdit]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSave();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdit();
      }
    },
    [handleSave, cancelEdit],
  );

  return {
    text,
    setText,
    textareaRef,
    handleSave,
    handleCancel,
    handleKeyDown,
    canSave: text.trim().length > 0 && text.trim() !== textContent.trim(),
  };
}
