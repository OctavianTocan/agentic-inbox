"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import {
  Children,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
} from "react";
import { ChevronDownIcon } from "@/design-system/components/icons";
import { cn } from "../../../lib/utils";

type MarkdownSummaryProps = HTMLAttributes<HTMLElement> & {
  // react-markdown passes the hast `node` as a prop; drop it from forwarded
  // DOM attributes.
  node?: unknown | undefined;
};

/**
 * Marker child used by `MarkdownDetails` to identify the summary slot.
 * Other props on the summary element are read by the parent and forwarded
 * onto the collapsible trigger.
 *
 * @param props - Component props.
 * @param props.children - Summary content to render inside the trigger.
 */
export function MarkdownSummary({ children }: MarkdownSummaryProps) {
  return <>{children}</>;
}

type MarkdownDetailsProps = HTMLAttributes<HTMLElement> & {
  open?: boolean | undefined;
  // react-markdown passes the hast `node` as a prop; drop it from forwarded
  // DOM attributes.
  node?: unknown | undefined;
};

/**
 * `<details>`/`<summary>` renderer for the markdown component map.
 *
 * @param props - Component props.
 * @param props.children - Child nodes including a `MarkdownSummary` and body content.
 * @param props.open - Whether the collapsible starts open (defaults to true so streaming bodies stay visible).
 * @param props.className - Additional CSS class names for the wrapper.
 */
export function MarkdownDetails({
  children,
  open,
  className,
  node: _node,
  ...rest
}: MarkdownDetailsProps) {
  let summaryChildren: ReactNode = null;
  let summaryRest: HTMLAttributes<HTMLElement> = {};
  const body: ReactNode[] = [];
  for (const child of Children.toArray(children)) {
    if (
      isValidElement<MarkdownSummaryProps>(child) &&
      child.type === MarkdownSummary
    ) {
      const {
        children: childChildren,
        node: _summaryNode,
        ...summaryProps
      } = child.props;
      summaryChildren = childChildren;
      summaryRest = summaryProps;
    } else {
      body.push(child);
    }
  }
  const triggerContent = summaryChildren ?? "Details";

  return (
    <CollapsiblePrimitive.Root
      {...rest}
      className={cn(
        "not-prose my-3 overflow-hidden rounded-md border border-border",
        className,
      )}
      data-slot="markdown-details"
      defaultOpen={open ?? true}
    >
      <CollapsiblePrimitive.Trigger
        {...summaryRest}
        className={cn(
          "group/markdown-details-trigger flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-medium outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          summaryRest.className,
        )}
        data-slot="markdown-details-trigger"
        nativeButton={false}
        render={
          <button type="button">
            <ChevronDownIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[panel-open]/markdown-details-trigger:rotate-180"
              data-slot="markdown-details-trigger-icon"
            />
            <span className="min-w-0 flex-1">{triggerContent}</span>
          </button>
        }
      />
      <CollapsiblePrimitive.Panel
        className="overflow-hidden data-closed:animate-collapsible-panel-up data-open:animate-collapsible-panel-down"
        data-slot="markdown-details-content"
      >
        <div className="prose prose-sm dark:prose-invert h-(--collapsible-panel-height) px-3 pb-3 pt-1 data-ending-style:h-0 data-starting-style:h-0">
          {body}
        </div>
      </CollapsiblePrimitive.Panel>
    </CollapsiblePrimitive.Root>
  );
}
