"use client";

import { memo, type ReactNode, useState } from "react";
import { usePart } from "@/ai-ui/providers/part-provider";
import { useToolRegistry } from "@/ai-ui/providers/tool-registry";
import type { ToolStatus } from "@/ai-ui/types";
import { cn } from "../../../../../lib/utils";
import {
  ChevronDownIcon,
  CircleCheckIcon,
  TriangleAlertIcon,
  WrenchIcon,
} from "../../../../icons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../collapsible";
import { Spinner } from "../../../spinner";

/** Humanize a tool identifier into a spaced, title-cased label. */
function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Renders a value as a preformatted JSON block, or nothing when empty. */
function JsonPreview({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return null;
  }

  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  if (!text || text === "{}" || text === "null") {
    return null;
  }

  return (
    <pre className="max-h-48 overflow-auto rounded bg-muted/50 p-2 font-mono text-xs leading-relaxed">
      {text}
    </pre>
  );
}

/** Status glyph for a tool call, varying by completion, error, or streaming state. */
function ToolStatusIcon({ status }: { status: ToolStatus }) {
  switch (status.type) {
    case "complete":
      return (
        <CircleCheckIcon className="size-3.5 flex-shrink-0 text-green-500" />
      );
    case "error":
      return (
        <TriangleAlertIcon className="size-3.5 flex-shrink-0 text-destructive" />
      );
    case "input-streaming":
      return (
        <Spinner className="size-3.5 flex-shrink-0 text-muted-foreground" />
      );
    default:
      return (
        <WrenchIcon className="size-3.5 flex-shrink-0 text-muted-foreground" />
      );
  }
}

type ToolCallPartBlockProps = {
  /** Optional brand-slot visual rendered to the left of the tool name. When
   * supplied, the status icon (check/alert/spinner) appears inline next to the
   * name; the default wrench fallback is suppressed. */
  leadingIcon?: ReactNode;
};

/** Default block for a tool-call part: a registered custom view, or a collapsible input/output panel. */
function ToolCallPartBlockInner({ leadingIcon }: ToolCallPartBlockProps) {
  const { part, tool } = usePart({ type: "dynamic-tool" });
  const registry = useToolRegistry();
  const [isOpen, setIsOpen] = useState(false);

  const CustomComponent = registry[part.toolName];
  if (CustomComponent) {
    return <CustomComponent />;
  }

  const toolStatus: ToolStatus = tool?.status ?? {
    type: "disabled",
    reason: "not-dynamic-tool",
  };

  const hasActiveStatus =
    toolStatus.type === "complete" ||
    toolStatus.type === "error" ||
    toolStatus.type === "input-streaming";

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50">
        {leadingIcon ?? <ToolStatusIcon status={toolStatus} />}
        <span className="min-w-0 flex-1 truncate font-medium">
          {formatToolName(part.toolName)}
        </span>
        {leadingIcon && hasActiveStatus ? (
          <ToolStatusIcon status={toolStatus} />
        ) : null}
        <ChevronDownIcon
          className={cn(
            "size-3.5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-2 pl-6">
        {tool?.input !== undefined && tool.input !== null ? (
          <div>
            <p className="mb-1 text-muted-foreground text-xs">Input</p>
            <JsonPreview value={tool.input} />
          </div>
        ) : null}
        {toolStatus.type === "complete" && tool?.output !== undefined ? (
          <div>
            <p className="mb-1 text-muted-foreground text-xs">Output</p>
            <JsonPreview value={tool.output} />
          </div>
        ) : null}
        {toolStatus.type === "error" ? (
          <div>
            <p className="mb-1 text-destructive text-xs">Error</p>
            <p className="text-destructive text-xs">{tool?.errorText}</p>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

export const ToolCallPartBlock = memo(ToolCallPartBlockInner);
