"use client";

import type React from "react";
import { StickToBottom } from "use-stick-to-bottom";

export type MessageListProps = React.ComponentProps<typeof StickToBottom>;

export type MessageListContentProps = React.ComponentProps<
  typeof StickToBottom.Content
>;

export type MessageListBottomSpacerProps = React.ComponentProps<"div"> & {
  ref?: React.RefObject<HTMLDivElement>;
};

/**
 * Scrollable message list container with automatic stick-to-bottom behavior.
 *
 * Wraps `StickToBottom` and provides `role="log"` semantics. Renders no
 * visual styles; pass `className` to supply your own.
 */
function MessageList({
  className,
  children,
  initial = "instant",
  resize = "smooth",
  ...props
}: MessageListProps) {
  return (
    <StickToBottom
      className={className}
      data-slot="message-list"
      initial={initial}
      resize={resize}
      role="log"
      {...props}
    >
      {children}
    </StickToBottom>
  );
}

/**
 * Content area inside a `MessageList`. Renders no styles of its own; pass
 * `className` for the content div and `scrollClassName` for the scroll
 * container.
 */
function MessageListContent(props: MessageListContentProps) {
  return <StickToBottom.Content data-slot="message-list-content" {...props} />;
}

/**
 * Trailing spacer placed as the last child of `MessageListContent`. Gives
 * the scroller enough room past the final message that the last user
 * message can sit at the top of the viewport. The design-system layer is
 * responsible for the `min-height` styling; the primitive only emits an
 * `aria-hidden` div with a stable `data-slot`.
 */
function MessageListBottomSpacer({
  className,
  ...props
}: MessageListBottomSpacerProps) {
  return (
    <div
      aria-hidden="true"
      className={className}
      data-slot="message-list-bottom-spacer"
      {...props}
    />
  );
}

export { MessageList, MessageListBottomSpacer, MessageListContent };
