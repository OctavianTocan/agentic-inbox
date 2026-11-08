"use client";

import { memo } from "react";
import { formatDuration } from "@/ai-ui/helpers";
import { usePart } from "@/ai-ui/providers/part-provider";
import { useThread } from "@/ai-ui/providers/thread-provider";
import { BrainIcon } from "@/design-system/components/icons";
import { Markdown } from "../../markdown/markdown";
import { TraceContent, TraceStep, TraceTrigger } from "../../trace";

const MARKDOWN_CONTAINER_PROPS = { className: "prose-sm prose-chat" };

/** Trigger label for a reasoning step: elapsed time when timed, otherwise "Thinking". */
function reasoningLabel(startedAt?: number, endedAt?: number) {
  if (
    startedAt !== undefined &&
    endedAt !== undefined &&
    endedAt >= startedAt
  ) {
    return `Thought for ${formatDuration(endedAt - startedAt, "s")}`;
  }
  return "Thinking";
}

/** Renders a reasoning part as a collapsible trace step with optional streamed Markdown. */
const ReasoningPartBlockInner = () => {
  const { part, isLast } = usePart({ type: "reasoning" });
  const { status } = useThread();
  const isStreaming = status.type === "streaming" && isLast;
  const hasText = part.text.trim().length > 0;

  return (
    <TraceStep active={isLast}>
      <TraceTrigger leftIcon={<BrainIcon className="size-4" />}>
        {reasoningLabel(part.startedAt, part.endedAt)}
      </TraceTrigger>
      {hasText && (
        <TraceContent>
          <Markdown
            animation={isStreaming ? "blur" : false}
            containerProps={MARKDOWN_CONTAINER_PROPS}
          >
            {part.text}
          </Markdown>
        </TraceContent>
      )}
    </TraceStep>
  );
};
ReasoningPartBlockInner.displayName = "ReasoningPartBlockInner";

export const ReasoningPartBlock = memo(ReasoningPartBlockInner);
ReasoningPartBlock.displayName = "ReasoningPartBlock";
