import type * as React from "react";
import { cn } from "../../lib/utils";

/** Grid container that renders hairline borders between its child items. */
function BorderGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("gap-px rounded-sm", className)}
      data-slot="border-grid"
      {...props}
    />
  );
}

/** A single cell within a `BorderGrid`. */
function BorderGridItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-sm bg-background", className)}
      data-slot="border-grid-item"
      {...props}
    />
  );
}

/** Wraps a `BorderGrid` to add a matching outer border on all sides. */
function BorderGridContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("p-[0.5px]", className)}
      data-slot="border-grid-container"
      {...props}
    />
  );
}

/** Tinted wrapper for composing nested `BorderGrid` layouts. */
function BorderGridSection({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-border/20 p-[0.5px]", className)}
      data-slot="border-grid-section"
      {...props}
    />
  );
}

export { BorderGrid, BorderGridContainer, BorderGridItem, BorderGridSection };
