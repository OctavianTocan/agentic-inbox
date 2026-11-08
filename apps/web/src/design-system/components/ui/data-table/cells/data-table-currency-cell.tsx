"use client";

import { useMemo } from "react";
import { cn } from "../../../../lib/utils";

type DataTableCurrencyCellProps = React.ComponentProps<"span"> & {
  value?: number | null;
  currency: string; // ISO 4217, e.g., 'USD'
  locale?: string;
  compact?: boolean;
};

/** Formats a numeric value as a localised currency string. */
export function DataTableCurrencyCell({
  value,
  currency,
  locale,
  compact,
  className,
  ...props
}: DataTableCurrencyCellProps) {
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: compact ? "compact" : "standard",
        compactDisplay: compact ? "short" : undefined,
      }),
    [locale, currency, compact],
  );

  const text = typeof value === "number" ? formatter.format(value) : "—";
  return (
    <span className={cn("text-foreground/70", className)} {...props}>
      {text}
    </span>
  );
}

export type { DataTableCurrencyCellProps };
