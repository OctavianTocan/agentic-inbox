"use client";

import { cn } from "../../../../lib/utils";
import { formatDuration } from "./format-duration";

type DataTableDurationCellProps = React.ComponentProps<"span"> & {
  /** Duration in milliseconds */
  ms?: number | null;
  /** Compact format like 1h 3m vs long format like 1 hour 3 minutes */
  compact?: boolean;
};

/** Table cell that renders a millisecond duration, or an em dash when absent. */
export function DataTableDurationCell({
  ms,
  compact = true,
  className,
  ...props
}: DataTableDurationCellProps) {
  const text = typeof ms === "number" ? formatDuration(ms, compact) : "—";
  return (
    <span className={cn("text-foreground/70", className)} {...props}>
      {text}
    </span>
  );
}

export type { DataTableDurationCellProps };
