"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import {
  formatDuration,
  readMessageOutputTokens,
  readMessageTimingMetadata,
} from "@/ai-ui/helpers";
import { useMessage } from "@/ai-ui/providers/message-provider";
import {
  MessageContent as MessageContentPrimitive,
  type MessageContentProps,
  MessageCopyButton as MessageCopyButtonPrimitive,
  type MessageCopyButtonProps,
  MessageEditButton as MessageEditButtonPrimitive,
  type MessageEditButtonProps,
  MessageFooter as MessageFooterPrimitive,
  type MessageFooterProps,
  MessageHeader as MessageHeaderPrimitive,
  type MessageHeaderProps,
  Message as MessagePrimitive,
  type MessageProps,
  MessageRegenerateButton as MessageRegenerateButtonPrimitive,
  type MessageRegenerateButtonProps,
} from "@/ai-ui/ui/message";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshCcwIcon,
} from "@/design-system/components/icons";

import { cn } from "../../../lib/utils";
import { buttonVariants } from "../button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

/** Visual style variants for message content blocks. */
const messageContentVariants = cva("flex flex-col gap-1.5 rounded-md", {
  variants: {
    variant: {
      default: "",
      bubble:
        "max-w-2xl rounded-md border border-border bg-card px-3 py-1.5 text-foreground",
      "bubble-primary":
        "prose-invert dark:prose rounded-md bg-primary px-3 py-1.5 text-primary-foreground",
      outline: "border border-border px-3 py-1.5",
      solid: "bg-muted px-3 py-1.5",
      card: "border border-border bg-card px-3 py-1.5 shadow-sm",
    },
    size: {
      sm: "text-sm",
      default: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

/** Message row; aligns and pads by role (user trailing, assistant leading). */
const Message = ({ className, ...props }: MessageProps) => (
  <MessagePrimitive
    className={cn(
      "group/message relative flex w-full flex-col gap-1",
      "data-[role=user]:items-end data-[role=user]:pl-8",
      "data-[role=assistant]:items-start data-[role=assistant]:pr-8",
      className,
    )}
    {...props}
  />
);

/** Header slot above a message's content. */
const MessageHeader = ({ className, ...props }: MessageHeaderProps) => (
  <MessageHeaderPrimitive className={cn(className)} {...props} />
);

/** Message body styled by the `variant` and `size` content variants. */
const MessageContent = ({
  className,
  variant,
  size,
  ...props
}: MessageContentProps & VariantProps<typeof messageContentVariants>) => (
  <MessageContentPrimitive
    className={cn(messageContentVariants({ variant, size, className }))}
    {...props}
  />
);

/** Action row revealed on hover or focus, and pinned for the last assistant message. */
const MessageFooter = ({ className, ...props }: MessageFooterProps) => (
  <MessageFooterPrimitive
    className={cn(
      "flex items-center gap-0.5 text-muted-foreground text-xs opacity-0 transition-opacity duration-200",
      "group-focus-within/message:opacity-100 group-hover/message:opacity-100",
      "group-[[data-last][data-role=assistant]]/message:opacity-100",
      className,
    )}
    {...props}
  />
);

/** Copy-to-clipboard footer button; defaults to a copy/check icon. */
const MessageCopyButton = ({
  className,
  children,
  ...props
}: MessageCopyButtonProps) => (
  <MessageCopyButtonPrimitive
    className={cn(
      buttonVariants({ size: "icon-sm", variant: "ghost" }),
      "text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        <CopyIcon className="block size-4 data-[copied]:hidden [[data-copied]_&]:hidden" />
        <CheckIcon className="hidden size-4 data-[copied]:block [[data-copied]_&]:block" />
      </>
    )}
  </MessageCopyButtonPrimitive>
);

/** Edit-message footer button; defaults to a pencil icon. */
const MessageEditButton = ({
  className,
  children,
  ...props
}: MessageEditButtonProps) => (
  <MessageEditButtonPrimitive
    className={cn(
      buttonVariants({ size: "icon-sm", variant: "ghost" }),
      "text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children ?? <PencilIcon className="size-4" />}
  </MessageEditButtonPrimitive>
);

/** Regenerate-message footer button; defaults to a refresh icon. */
const MessageRegenerateButton = ({
  className,
  children,
  ...props
}: MessageRegenerateButtonProps) => (
  <MessageRegenerateButtonPrimitive
    className={cn(
      buttonVariants({ size: "icon-sm", variant: "ghost" }),
      "text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children ?? <RefreshCcwIcon className="size-4" />}
  </MessageRegenerateButtonPrimitive>
);

/** Formats a token count over a duration as a rounded `tok/s` label. */
function formatSpeed(tokens: number, ms: number): string {
  const tokensPerSecond = (tokens / ms) * 1000;
  return `${Math.round(tokensPerSecond)} tok/s`;
}

/** Footer badge showing a completed assistant turn's duration and tok/s, with a detail tooltip. */
function MessageTimingBadge({ className, ...props }: ComponentProps<"span">) {
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

  const compactParts: string[] = [];
  if (totalMs !== undefined) {
    compactParts.push(formatDuration(totalMs));
  }
  if (outputTokens !== undefined && totalMs !== undefined && totalMs > 0) {
    compactParts.push(formatSpeed(outputTokens, totalMs));
  }

  if (compactParts.length === 0) {
    return null;
  }

  const compactLabel = compactParts.join(" \u00b7 ");

  const tooltipLines: string[] = [];
  if (totalMs !== undefined) {
    tooltipLines.push(`Total: ${formatDuration(totalMs)}`);
  }
  if (outputTokens !== undefined) {
    tooltipLines.push(`Tokens: ${outputTokens}`);
  }
  if (outputTokens !== undefined && totalMs !== undefined && totalMs > 0) {
    tooltipLines.push(`Speed: ${formatSpeed(outputTokens, totalMs)}`);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn(
                "cursor-default text-muted-foreground text-xs tabular-nums",
                className,
              )}
              data-slot="message-timing"
              data-tokens={outputTokens}
              data-total={totalMs}
              {...props}
            />
          }
        >
          {compactLabel}
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-0.5">
            {tooltipLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
