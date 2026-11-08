"use client";

import { type ComponentProps, useCallback, useMemo, useState } from "react";
import {
  formatDuration,
  readMessageOutputTokens,
  readMessageTimingMetadata,
} from "../helpers";
import { useMessage } from "../providers/message-provider";

/**
 * Props for the root Message container.
 */
export interface MessageProps extends ComponentProps<"div"> {}

/**
 * Root message container. Provides `data-role`, `data-last`, and `data-slot`
 * attributes for external styling. Renders a plain `<div>`.
 */
function Message({ className, children, ...props }: MessageProps) {
  const { message, isLast } = useMessage();

  return (
    <div
      className={className}
      data-last={isLast || undefined}
      data-role={message.role}
      data-slot="message"
      id={message.id}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Props for the message header region.
 */
export interface MessageHeaderProps extends ComponentProps<"div"> {}

/**
 * Header region of a message. Renders a plain `<div>` with
 * `data-slot="message-header"` for styling hooks.
 */
function MessageHeader({ className, children, ...props }: MessageHeaderProps) {
  return (
    <div className={className} data-slot="message-header" {...props}>
      {children}
    </div>
  );
}

/**
 * Props for the message content region.
 */
export interface MessageContentProps extends ComponentProps<"div"> {}

/**
 * Content region of a message. Renders a plain `<div>` with
 * `data-slot="message-content"`. Styling variants (bubble, outline, etc.)
 * are handled at the styled layer.
 */
function MessageContent({
  className,
  children,
  ...props
}: MessageContentProps) {
  return (
    <div className={className} data-slot="message-content" {...props}>
      {children}
    </div>
  );
}

/**
 * Props for the message footer region.
 */
export interface MessageFooterProps extends ComponentProps<"div"> {}

/**
 * Footer region of a message (typically action buttons). Renders a plain
 * `<div>` with `data-slot="message-footer"`.
 */
function MessageFooter({ className, children, ...props }: MessageFooterProps) {
  return (
    <div className={className} data-slot="message-footer" {...props}>
      {children}
    </div>
  );
}

/**
 * Props for the message copy button.
 */
export interface MessageCopyButtonProps
  extends Omit<ComponentProps<"button">, "onCopy"> {
  /** Text to copy. Defaults to the concatenated text parts of the message. */
  value?: string;
  /** Callback fired after a successful copy. */
  onCopy?: (value: string) => void;
  /** Duration in ms to keep `data-copied` active. Defaults to 2000. */
  timeout?: number;
}

/**
 * Button that copies the message text (or a custom value) to the clipboard.
 * Exposes `data-copied` when the copy is active so consumers can swap icons
 * or show feedback via CSS alone. Renders a plain `<button>`.
 */
function MessageCopyButton({
  children,
  value,
  onCopy,
  timeout = 2000,
  onClick,
  ...props
}: MessageCopyButtonProps) {
  const { message } = useMessage();
  const [isCopied, setIsCopied] = useState(false);

  const textToCopy = useMemo(() => {
    if (value) {
      return value;
    }
    const texts: string[] = [];
    for (const part of message.parts) {
      if ((part as { type: string }).type === "text") {
        texts.push((part as { type: string; text?: string }).text ?? "");
      }
    }
    return texts.join("\n");
  }, [value, message.parts]);

  const copyMessageText = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }

      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          setIsCopied(true);
          onCopy?.(textToCopy);
          setTimeout(() => setIsCopied(false), timeout);
        })
        .catch(() => {
          // Clipboard access may be denied in non-HTTPS contexts
        });
    },
    [textToCopy, onClick, onCopy, timeout],
  );

  return (
    <button
      aria-label="Copy message"
      data-copied={isCopied || undefined}
      data-slot="message-copy"
      onClick={copyMessageText}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Props for the message edit button.
 */
export interface MessageEditButtonProps extends ComponentProps<"button"> {}

/**
 * Button that enters edit mode for the current message. Renders a plain
 * `<button>` — provide your own icon via children.
 */
function MessageEditButton({
  onClick,
  children,
  ...props
}: MessageEditButtonProps) {
  const { startEdit } = useMessage();

  const enterEditMode = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }

      startEdit();
    },
    [startEdit, onClick],
  );

  return (
    <button
      aria-label="Edit message"
      data-slot="message-edit"
      onClick={enterEditMode}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Props for the message regenerate button.
 */
export interface MessageRegenerateButtonProps
  extends ComponentProps<"button"> {}

/**
 * Button that regenerates the assistant response. Renders a plain
 * `<button>` — provide your own icon via children.
 */
function MessageRegenerateButton({
  onClick,
  children,
  ...props
}: MessageRegenerateButtonProps) {
  const { regenerate } = useMessage();

  const retryAssistantResponse = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }

      regenerate();
    },
    [regenerate, onClick],
  );

  return (
    <button
      aria-label="Regenerate response"
      data-slot="message-regenerate"
      onClick={retryAssistantResponse}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Formats token throughput as "N tok/s".
 */
function formatSpeed(tokens: number, ms: number): string {
  const tokensPerSecond = (tokens / ms) * 1000;
  return `${Math.round(tokensPerSecond)} tok/s`;
}

/**
 * Props for the message timing badge.
 */
export interface MessageTimingBadgeProps extends ComponentProps<"span"> {}

/**
 * Displays compact timing metadata (total duration and token speed) for
 * assistant messages. Renders a plain `<span>` with `data-ttft`,
 * `data-total`, and `data-tokens` attributes for programmatic access.
 * The styled layer can wrap this in a tooltip if desired.
 */
function MessageTimingBadge({ className, ...props }: MessageTimingBadgeProps) {
  const { message, status } = useMessage();

  if (message.role !== "assistant") {
    return null;
  }

  if (status.type === "streaming") {
    return null;
  }

  const timing = readMessageTimingMetadata(message.metadata);
  if (!timing) {
    return null;
  }

  const { totalMs } = timing;
  const outputTokens = readMessageOutputTokens(message.metadata);

  const parts: string[] = [];
  if (totalMs !== undefined) {
    parts.push(formatDuration(totalMs));
  }
  if (outputTokens !== undefined && totalMs !== undefined && totalMs > 0) {
    parts.push(formatSpeed(outputTokens, totalMs));
  }

  if (parts.length === 0) {
    return null;
  }

  const compactLabel = parts.join(" · ");

  return (
    <span
      className={className}
      data-slot="message-timing"
      data-tokens={outputTokens}
      data-total={totalMs}
      {...props}
    >
      {compactLabel}
    </span>
  );
}

export {
  Message,
  MessageContent,
  MessageCopyButton,
  MessageEditButton,
  MessageFooter,
  MessageHeader,
  MessageRegenerateButton,
  MessageTimingBadge,
};
