"use client";

import { type ReactNode, useState } from "react";
import { formatDuration } from "@/ai-ui/helpers";
import { useMessage } from "@/ai-ui/providers/message-provider";
import { BrainIcon, ChevronDownIcon } from "@/design-system/components/icons";
import { cn } from "../../../../lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";

export interface StreamingBlockProps {
  isLastSegment: boolean;
  duration?: number;
  label?: string;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Reasoning container for a single message segment: expanded while the segment
 * streams, collapsible with a duration badge once complete.
 */
export function StreamingBlock({
  isLastSegment,
  duration,
  label = "Working…",
  icon,
  className,
  children,
}: StreamingBlockProps) {
  const { status } = useMessage();
  const isStreaming = isLastSegment && status.type === "streaming";
  const [isOpen, setIsOpen] = useState(false);

  const iconElement = icon ?? <BrainIcon className="size-3.5" />;

  if (isStreaming) {
    return (
      <div
        className={cn("flex flex-col gap-2", className)}
        data-slot="streaming-block"
        data-state="streaming"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="animate-pulse">{iconElement}</span>
          <span>{label}</span>
        </div>
        <div className="border-l-2 border-border/50 pl-4">{children}</div>
      </div>
    );
  }

  if (!children) return null;

  return (
    <Collapsible
      data-slot="streaming-block"
      data-state="complete"
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2 rounded-md py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
      >
        <span className="group-hover:hidden">{iconElement}</span>
        <ChevronDownIcon
          className={cn(
            "hidden size-3.5 transition-transform duration-200 group-hover:block",
            isOpen && "rotate-180",
          )}
        />
        <span>
          {duration ? `Worked for ${formatDuration(duration)}` : "Completed"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-l-2 border-border/50 pl-4">
        <div className="max-h-48 overflow-auto">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
