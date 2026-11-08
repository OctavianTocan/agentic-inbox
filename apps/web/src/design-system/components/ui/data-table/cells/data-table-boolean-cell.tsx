"use client";

import { cn } from "../../../../lib/utils";
import { CheckIcon, XIcon } from "../../../icons";

type DataTableBooleanCellProps = React.ComponentProps<"span"> & {
  value?: boolean | null;
  /** Render as icon-only (default) or with text */
  variant?: "icon" | "text";
};

/** Renders a boolean cell value as a check/cross icon or as "Yes"/"No" text. */
export function DataTableBooleanCell({
  value,
  variant = "icon",
  className,
  ...props
}: DataTableBooleanCellProps) {
  const isTrue = Boolean(value);
  if (variant === "text") {
    return (
      <span className={cn("text-foreground/70", className)} {...props}>
        {isTrue ? "Yes" : "No"}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center", className)} {...props}>
      <span className="sr-only">{isTrue ? "true" : "false"}</span>
      {isTrue ? (
        <CheckIcon className="size-3.5 text-emerald-600" />
      ) : (
        <XIcon className="size-3.5 text-muted-foreground" />
      )}
    </span>
  );
}

export type { DataTableBooleanCellProps };
