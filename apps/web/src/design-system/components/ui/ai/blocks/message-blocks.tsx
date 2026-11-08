"use client";

import { type ReactNode, useMemo, useState } from "react";
import { CopyAffordanceProvider } from "@/ai-ui/providers/copy-affordance-provider";
import { useInlineEditor } from "@/ai-ui/hooks/use-inline-editor";
import { useMessage } from "@/ai-ui/providers/message-provider";
import type { MessageProps } from "@/ai-ui/ui/message";
import { ArrowUpIcon, XIcon } from "@/design-system/components/icons";
import { cn } from "../../../../lib/utils";
import { Button } from "../../button";
import {
  Message,
  MessageContent,
  MessageCopyButton,
  MessageFooter,
  MessageTimingBadge,
} from "../message";

/** Inline edit form rendered inside a user message bubble. */
function InlineEditor() {
  const {
    text,
    setText,
    textareaRef,
    handleKeyDown,
    handleSave,
    handleCancel,
    canSave,
  } = useInlineEditor();

  return (
    <div
      className={cn(
        "flex w-full max-w-2xl flex-col rounded-md bg-card text-foreground",
        "border border-border transition-colors duration-150 focus-within:border-ring/60",
      )}
    >
      <textarea
        aria-label="Edit message"
        className={cn(
          "w-full resize-none border-0 bg-transparent px-3.5 pt-3 pb-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "min-h-[40px] max-h-[240px] [field-sizing:content]",
          "overflow-y-auto scrollbar-none",
        )}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        ref={textareaRef}
        value={text}
      />
      <div className="flex items-center justify-end gap-1 px-2 pb-2">
        <Button
          onClick={handleCancel}
          size="icon-sm"
          variant="ghost"
          aria-label="Cancel edit"
        >
          <XIcon className="size-4" />
        </Button>
        <Button
          aria-label="Save edit"
          disabled={!canSave}
          onClick={handleSave}
          size="icon-sm"
          variant="default"
        >
          <ArrowUpIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

const LONG_MESSAGE_CHARS = 600;
const LONG_MESSAGE_LINES = 10;

/** True when the message has finished and carries copyable text — gates the actions footer. */
function useHasCopyableText(): boolean {
  const { message, status } = useMessage();
  const text = useMemo(
    () =>
      message.parts
        .flatMap((part) => (part.type === "text" ? [part.text ?? ""] : []))
        .join("")
        .trim(),
    [message.parts],
  );
  return status.type === "complete" && text.length > 0;
}

/** Bubble wrapper that collapses long user messages behind a Show more toggle. */
function CollapsibleBubble({ children }: { children: ReactNode }) {
  const { message } = useMessage();
  const text = useMemo(
    () =>
      message.parts
        .flatMap((part) => (part.type === "text" ? [part.text ?? ""] : []))
        .join("\n"),
    [message.parts],
  );
  const isLong =
    text.length > LONG_MESSAGE_CHARS ||
    text.split("\n").length > LONG_MESSAGE_LINES;
  const [expanded, setExpanded] = useState(false);

  if (!isLong) {
    return (
      <MessageContent size="sm" variant="bubble">
        {children}
      </MessageContent>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <MessageContent
        className={cn(
          "overflow-hidden",
          !expanded &&
            "max-h-64 [mask-image:linear-gradient(to_bottom,black_85%,transparent)]",
        )}
        size="sm"
        variant="bubble"
      >
        {children}
      </MessageContent>
      <button
        className="text-muted-foreground text-xs hover:text-foreground"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

export type UserMessageBlockProps = MessageProps;

/** Default block for a user message: inline editor while editing, collapsible bubble otherwise. */
export const UserMessageBlock = ({
  children,
  ...props
}: UserMessageBlockProps) => {
  const { isEditing } = useMessage();
  const hasCopyableText = useHasCopyableText();

  if (isEditing) {
    return (
      <Message {...props}>
        <InlineEditor />
      </Message>
    );
  }

  return (
    <Message {...props}>
      <CollapsibleBubble>{children}</CollapsibleBubble>
      {hasCopyableText ? (
        <MessageFooter>
          <MessageCopyButton />
        </MessageFooter>
      ) : null}
    </Message>
  );
};
UserMessageBlock.displayName = "UserMessageBlock";

export type AssistantMessageBlockProps = MessageProps;

/** Default block for an assistant message: content with timing and copy footer. */
export const AssistantMessageBlock = ({
  children,
  ...props
}: AssistantMessageBlockProps) => {
  const { status } = useMessage();
  const hasCopyableText = useHasCopyableText();
  const isComplete = status.type === "complete";

  return (
    <Message {...props}>
      <MessageContent className="w-full min-w-0 overflow-hidden">
        <CopyAffordanceProvider enabled={isComplete}>
          {children}
        </CopyAffordanceProvider>
      </MessageContent>
      {hasCopyableText ? (
        <MessageFooter>
          <MessageTimingBadge />
          <MessageCopyButton />
        </MessageFooter>
      ) : null}
    </Message>
  );
};
AssistantMessageBlock.displayName = "AssistantMessageBlock";
