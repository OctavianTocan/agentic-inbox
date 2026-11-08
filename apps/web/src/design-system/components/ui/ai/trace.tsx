"use client";

import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
} from "@/design-system/components/icons";
import { cn } from "@/design-system/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";

export type TraceProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Vertical timeline of collapsible steps. Each child should be a
 * `TraceStep` (or a component that renders one).
 *
 * Used to display agent activity (reasoning + tool calls) as a single
 * sequence inside an assistant message.
 */
export function Trace({ children, className }: TraceProps) {
  return (
    <div
      className={cn("flex flex-col text-muted-foreground text-sm", className)}
    >
      {children}
    </div>
  );
}

export type TraceStepProps = {
  children: ReactNode;
  className?: string;
  /**
   * Whether this step is the active last block. Opens while active and
   * closes when deactivated; user toggles are respected until the next
   * active flip.
   */
  active?: boolean;
  /** Fires only on user-driven toggles, not on auto open/close transitions. */
  onOpenChange?: (open: boolean) => void;
} & Omit<
  ComponentProps<typeof Collapsible>,
  "children" | "className" | "open" | "defaultOpen" | "onOpenChange"
>;

/**
 * One step in a `Trace`. Opens while `active`, honouring user toggles
 * until the next `active` change.
 */
export function TraceStep({
  children,
  className,
  active = false,
  onOpenChange,
  ...collapsibleProps
}: TraceStepProps) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);

  // When `active` flips, reset user override so the prop takes precedence.
  useEffect(() => {
    setUserOpen(null);
  }, []);

  const open = userOpen ?? active;

  return (
    <Collapsible
      {...collapsibleProps}
      className={cn("group/step", className)}
      onOpenChange={(next, eventDetails) => {
        if (eventDetails.reason === "trigger-press") {
          setUserOpen(next);
          onOpenChange?.(next);
        }
      }}
      open={open}
    >
      {children}
      <div className="flex justify-start group-last/step:hidden">
        <div className="ml-1.75 h-3 w-px bg-border" />
      </div>
    </Collapsible>
  );
}

export type TraceTriggerProps = {
  children: ReactNode;
  leftIcon?: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof CollapsibleTrigger>, "children" | "className">;

/**
 * Trigger row for a TraceStep. When `leftIcon` is provided the icon swaps
 * to a chevron on hover or when the panel is open. Without `leftIcon`,
 * a small filled dot is shown and a trailing chevron is added.
 */
export function TraceTrigger({
  children,
  leftIcon,
  className,
  ...props
}: TraceTriggerProps) {
  return (
    <CollapsibleTrigger
      {...props}
      className={cn(
        "group/trigger flex w-full min-w-0 max-w-full cursor-pointer items-center justify-start gap-1.5 text-left transition-colors hover:text-foreground",
        className,
      )}
    >
      <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
        {leftIcon ? (
          <>
            <span className="transition-opacity group-hover/trigger:opacity-0 group-data-panel-open/trigger:opacity-0">
              {leftIcon}
            </span>
            <PlusIcon className="absolute size-3 opacity-0 transition-opacity group-hover/trigger:opacity-100 group-data-panel-open/trigger:opacity-0" />
            <MinusIcon className="absolute size-3 opacity-0 transition-opacity group-data-panel-open/trigger:opacity-100" />
          </>
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {!leftIcon && (
        <ChevronDownIcon className="ml-auto size-4 shrink-0 -rotate-90 transition-transform group-data-panel-open/trigger:rotate-0" />
      )}
    </CollapsibleTrigger>
  );
}

export type TraceContentProps = {
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof CollapsibleContent>, "children" | "className">;

/**
 * Panel for a TraceStep. Animates height open/closed and renders a
 * continued vertical connector to the left of the content. The connector
 * dissolves on the final step so the timeline doesn't trail past the end.
 */
export function TraceContent({
  children,
  className,
  ...props
}: TraceContentProps) {
  return (
    <CollapsibleContent
      keepMounted
      {...props}
      className={cn(
        "overflow-hidden data-closed:animate-collapsible-panel-up data-open:animate-collapsible-panel-down",
        className,
      )}
    >
      <div className="grid grid-cols-[min-content_minmax(0,1fr)] gap-x-4">
        <div className="ml-1.75 h-full w-px bg-border group-last/step:bg-transparent" />
        <div className="mt-2 mb-2 space-y-2">{children}</div>
      </div>
    </CollapsibleContent>
  );
}

export type StaticTraceStepProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Non-collapsible counterpart to `TraceStep` for static rows (e.g. tool
 * calls with no expandable body) so they align with adjacent collapsible
 * steps and chain the timeline continuously.
 */
export function StaticTraceStep({ children, className }: StaticTraceStepProps) {
  return (
    <div className={cn("group/step", className)}>
      {children}
      <div className="flex justify-start group-last/step:hidden">
        <div className="ml-1.75 h-3 w-px bg-border" />
      </div>
    </div>
  );
}

export type TraceItemProps = ComponentProps<"div">;

/**
 * Single item shown inside a `TraceContent` body.
 */
export function TraceItem({ children, className, ...props }: TraceItemProps) {
  return (
    <div {...props} className={className}>
      {children}
    </div>
  );
}
