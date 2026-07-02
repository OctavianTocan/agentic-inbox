"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cn } from "../../lib/utils";

/** Root that toggles the visibility of its `CollapsibleContent`. */
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

/** Control that expands or collapses the enclosing `Collapsible`. */
function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  );
}

/** Region revealed when the `Collapsible` is open. */
function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  );
}

type CollapsibleAnimatedContentProps = CollapsiblePrimitive.Panel.Props & {
  /** Class names applied to the inner height-pinned wrapper that holds the children. */
  contentClassName?: string;
};

/**
 * Drop-in alternative to `CollapsibleContent` that animates expand and
 * collapse via the shared `--collapsible-panel-height` keyframes defined in
 * the design-system globals. Pair with `Collapsible` and `CollapsibleTrigger`
 * when the open/close transition should be smooth (e.g. nested settings
 * cards on the connections detail page).
 *
 * @param props - Forwarded to `Collapsible.Panel`.
 * @param props.contentClassName - Class names for the inner height-pinned
 *   wrapper.
 * @returns The animated panel.
 */
function CollapsibleAnimatedContent({
  children,
  className,
  contentClassName,
  ...props
}: CollapsibleAnimatedContentProps) {
  return (
    <CollapsiblePrimitive.Panel
      className={cn(
        "overflow-hidden data-closed:animate-collapsible-panel-up data-open:animate-collapsible-panel-down",
        className,
      )}
      data-slot="collapsible-animated-content"
      {...props}
    >
      <div
        className={cn(
          "h-(--collapsible-panel-height) data-ending-style:h-0 data-starting-style:h-0",
          contentClassName,
        )}
      >
        {children}
      </div>
    </CollapsiblePrimitive.Panel>
  );
}

export {
  Collapsible,
  CollapsibleAnimatedContent,
  CollapsibleContent,
  CollapsibleTrigger,
};
