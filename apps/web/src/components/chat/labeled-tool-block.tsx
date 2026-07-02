'use client';

import { memo, useState } from 'react';
import { usePart } from '@/ai-ui/providers/part-provider';
import type { ToolStatus } from '@/ai-ui/types';
import {
  ChevronDownIcon,
  CircleCheckIcon,
  ExternalLinkIcon,
  TriangleAlertIcon
} from '@/design-system/components/icons';
import { AgentSpinner } from '@/design-system/components/ui/agent-spinner';
import { Button } from '@/design-system/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/design-system/components/ui/collapsible';
import { cn } from '@/design-system/lib/utils';
import {
  type DraftBridgePayload,
  useDraftBridge
} from './draft-bridge-context';
import { DRAFT_TOOL_NAMES, TOOL_LABELS } from './tool-labels';

/** Renders a value as a compact JSON block, or nothing when empty. */
function JsonPreview({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return null;
  }
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!text || text === '{}' || text === 'null') {
    return null;
  }
  return (
    <pre className="max-h-48 overflow-auto rounded bg-muted/50 p-2 font-mono text-xs leading-relaxed">
      {text}
    </pre>
  );
}

/** Reads string fields from an unknown record, tolerating missing keys. */
function readString(source: unknown, key: string): string | undefined {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** Builds the inbox bridge payload from a draft tool's input and output. */
function toDraftPayload(
  toolCallId: string,
  input: unknown,
  output: unknown
): DraftBridgePayload {
  const emailId = readString(output, 'emailId') ?? readString(input, 'emailId');
  const subject = readString(output, 'subject') ?? readString(input, 'subject');
  const body = readString(output, 'body') ?? readString(input, 'body');
  return {
    toolCallId,
    ...(emailId ? { emailId } : {}),
    ...(subject ? { subject } : {}),
    ...(body ? { body } : {})
  };
}

/** Leading glyph reflecting the tool's run state. */
function StatusGlyph({ status }: { status: ToolStatus }) {
  switch (status.type) {
    case 'complete':
      return <CircleCheckIcon className="size-3.5 shrink-0 text-success" />;
    case 'error':
      return (
        <TriangleAlertIcon className="size-3.5 shrink-0 text-destructive" />
      );
    default:
      return <AgentSpinner size={0.75} variant="dots" />;
  }
}

/**
 * Chat tool-call block with a friendly {@link TOOL_LABELS} label, a
 * spinner→check status glyph, a collapsible input/output panel, and an
 * "Edit & approve in inbox" bridge for draft-bearing tools.
 */
function LabeledToolBlockInner() {
  const { part, tool } = usePart({ type: 'dynamic-tool' });
  const bridge = useDraftBridge();
  const [isOpen, setIsOpen] = useState(false);

  const status: ToolStatus = tool?.status ?? {
    type: 'disabled',
    reason: 'not-dynamic-tool'
  };
  const label = TOOL_LABELS[part.toolName] ?? part.toolName;
  const isDraftTool =
    DRAFT_TOOL_NAMES.has(part.toolName) && status.type === 'complete';

  return (
    <div className="flex flex-col gap-1.5">
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50">
          <StatusGlyph status={status} />
          <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
          <ChevronDownIcon
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
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
          {status.type === 'complete' && tool?.output !== undefined ? (
            <div>
              <p className="mb-1 text-muted-foreground text-xs">Output</p>
              <JsonPreview value={tool.output} />
            </div>
          ) : null}
          {status.type === 'error' ? (
            <p className="text-destructive text-xs">{tool?.errorText}</p>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
      {isDraftTool ? (
        <Button
          className="self-start"
          onClick={() =>
            bridge(toDraftPayload(part.toolCallId, tool?.input, tool?.output))
          }
          size="sm"
          variant="outline"
        >
          <ExternalLinkIcon className="size-4" />
          Edit &amp; approve in inbox
        </Button>
      ) : null}
    </div>
  );
}

export const LabeledToolBlock = memo(LabeledToolBlockInner);
