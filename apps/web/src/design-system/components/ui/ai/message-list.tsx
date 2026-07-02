"use client";

import {
  MessageListBottomSpacer as MessageListBottomSpacerPrimitive,
  type MessageListBottomSpacerProps as MessageListBottomSpacerPrimitiveProps,
  MessageListContent as MessageListContentPrimitive,
  type MessageListContentProps as MessageListContentPrimitiveProps,
  MessageList as MessageListPrimitive,
  type MessageListProps as MessageListPrimitiveProps,
} from "@/ai-ui/ui/message-list";
import { cn } from "../../../lib/utils";

/**
 * Styled scroll-anchored message list container. Fades content at the top
 * and bottom via a mask so whatever surface sits behind shows through.
 */
export function MessageList({
  className,
  ...props
}: MessageListPrimitiveProps) {
  return (
    <MessageListPrimitive
      className={cn(
        "relative flex size-full flex-1 flex-col",
        "[mask-image:linear-gradient(to_bottom,transparent_0px,black_24px,black_calc(100%-24px),transparent_100%)]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Styled content area within the message list. Centers content with a
 * max-width and provides vertical spacing. Marks the scroll container as a
 * sized CSS container so descendants (notably `MessageListBottomSpacer`)
 * can use `cqh` units to size against the visible viewport.
 */
export function MessageListContent({
  className,
  scrollClassName,
  ...props
}: MessageListContentPrimitiveProps) {
  return (
    <MessageListContentPrimitive
      className={cn(
        "relative mx-auto flex w-full max-w-3xl flex-col gap-10 overscroll-contain pb-24",
        className,
      )}
      scrollClassName={cn(
        "[container-type:size] [container-name:chat-scroller]",
        scrollClassName,
      )}
      {...props}
    />
  );
}

/**
 * Trailing spacer that gives the scroller enough room past the final
 * message for the last user message to sit at the top of the viewport.
 *
 * Sized via container queries against the `chat-scroller` named container
 * (the scroll element rendered by `MessageListContent`). Defaults to one
 * viewport tall as a safe fallback; consumers that anchor the last
 * conversation round override the inline `height` (and reset `min-height`)
 * to fit the actual round so users cannot scroll into empty space.
 */
export function MessageListBottomSpacer({
  className,
  ...props
}: MessageListBottomSpacerPrimitiveProps) {
  return (
    <MessageListBottomSpacerPrimitive
      className={cn("w-full shrink-0 min-h-[100cqh]", className)}
      {...props}
    />
  );
}
