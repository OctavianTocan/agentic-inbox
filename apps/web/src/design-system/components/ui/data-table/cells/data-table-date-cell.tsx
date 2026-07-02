"use client";

import { cn } from "../../../../lib/utils";
import {
  HybridHoverCard,
  HybridHoverCardContent,
  HybridHoverCardTrigger,
} from "../../hybrid-hover-card";
import { formatRelativeTime } from "./format-relative-time";

type DataTableDateCellProps = React.ComponentProps<"span"> & {
  value?: string | number | Date | null;
  variant?: "datetime" | "date" | "time";
  locale?: string;
  titleText?: string;
  /** Show relative time like "10m ago". Defaults to true. */
  relative?: boolean;
  /** Wrap in a hover card showing full details. Defaults to true. */
  showHoverCard?: boolean;
};

/** Formats a date as an absolute locale string for the given variant. */
function formatAbsolute(
  date: Date,
  variant: "datetime" | "date" | "time",
  locale?: string,
): string {
  if (variant === "date") {
    return date.toLocaleDateString(locale);
  }
  if (variant === "time") {
    return date.toLocaleTimeString(locale);
  }
  return date.toLocaleString(locale);
}

/** Span wrapper that renders the date text with shared cell styling. */
function Inner({
  text,
  className,
  title,
  ...props
}: {
  text: string;
  className?: string | undefined;
  title?: string | undefined;
} & Omit<
  React.ComponentProps<"span">,
  "children"
>) {
  return (
    <span
      className={cn("text-foreground/70", className)}
      title={title}
      {...props}
    >
      {text}
    </span>
  );
}

/** Renders a date cell with relative or absolute text and an optional detail hover card. */
export function DataTableDateCell({
  value,
  className,
  variant = "datetime",
  locale,
  titleText,
  relative = true,
  showHoverCard = true,
  ...props
}: DataTableDateCellProps) {
  if (!value) {
    return <Inner className={className} text="—" {...props} />;
  }

  const date = new Date(value);
  const isInvalid = Number.isNaN(date.getTime());
  const iso = isInvalid ? undefined : date.toISOString();
  const absolute = isInvalid ? "—" : formatAbsolute(date, variant, locale);
  const relativeText = isInvalid ? "—" : formatRelativeTime(date);
  const display = relative ? relativeText : absolute;
  const titleAttr = titleText ?? iso ?? undefined;

  if (!showHoverCard) {
    return (
      <Inner
        className={className}
        text={display}
        title={titleAttr}
        {...props}
      />
    );
  }

  return (
    <HybridHoverCard>
      <HybridHoverCardTrigger
        delay={200}
        render={
          <Inner
            className={className}
            text={display}
            title={titleAttr}
            {...props}
          />
        }
      />
      <HybridHoverCardContent align="start" className="max-w-80">
        <div className="grid gap-1 text-xs">
          <div className="font-medium">{absolute}</div>
          {iso ? <div className="text-muted-foreground">{iso}</div> : null}
        </div>
      </HybridHoverCardContent>
    </HybridHoverCard>
  );
}

export type { DataTableDateCellProps };
