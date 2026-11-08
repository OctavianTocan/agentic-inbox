"use client";

import type React from "react";
import { useMemo } from "react";
import { useMessage } from "@/ai-ui/providers/message-provider";
import { usePart } from "@/ai-ui/providers/part-provider";
import { cn } from "@/design-system/lib/utils";
import { Markdown } from "../../markdown/markdown";

const BASE_CLASS = "prose-sm prose-chat";
const DEFAULT_CONTAINER_PROPS = { className: BASE_CLASS };

export interface TextPartBlockProps
  extends Omit<React.ComponentProps<typeof Markdown>, "children"> {}

/** Renders a message text part: plain wrapped text for user messages, Markdown for the assistant. */
export const TextPartBlock = ({
  animation = "blur",
  containerProps,
  ...props
}: TextPartBlockProps) => {
  const { message, status } = useMessage();
  const { part } = usePart({ type: "text" });

  const shouldAnimate = status.type === "streaming";

  const mergedContainerProps = useMemo(
    () =>
      containerProps
        ? {
            ...containerProps,
            className: cn(BASE_CLASS, containerProps.className),
          }
        : DEFAULT_CONTAINER_PROPS,
    [containerProps],
  );

  if (message.role === "user") {
    return <div className="whitespace-pre-wrap break-words">{part.text}</div>;
  }

  return (
    <Markdown
      animation={shouldAnimate && animation}
      containerProps={mergedContainerProps}
      {...props}
    >
      {part.text}
    </Markdown>
  );
};
