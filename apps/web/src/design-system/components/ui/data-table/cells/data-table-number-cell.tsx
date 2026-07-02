"use client";

import { useMemo } from "react";
import { cn } from "../../../../lib/utils";

type DataTableNumberCellProps = React.ComponentProps<"span"> & {
  value?: number | null;
  locale?: string;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  /** Compact short format: 1.2K, 3.4M */
  compact?: boolean;
};

/** Table cell that renders a locale-formatted number, or an em dash when absent. */
export function DataTableNumberCell({
  value,
  locale,
  minFractionDigits,
  maxFractionDigits,
  compact,
  className,
  ...props
}: DataTableNumberCellProps) {
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: minFractionDigits,
        maximumFractionDigits: maxFractionDigits,
        notation: compact ? "compact" : "standard",
        compactDisplay: compact ? "short" : undefined,
      }),
    [locale, minFractionDigits, maxFractionDigits, compact],
  );

  const text = typeof value === "number" ? formatter.format(value) : "—";

  return (
    <span className={cn("text-foreground/70", className)} {...props}>
      {text}
    </span>
  );
}

export type { DataTableNumberCellProps };
