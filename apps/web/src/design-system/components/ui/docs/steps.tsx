import type { ComponentProps } from "react";

import { cn } from "../../../lib/utils";

/**
 * Vertical numbered list with a connector line. Each `Step` child increments the counter.
 *
 * @param props - Standard div props.
 * @param props.className - Extra classes merged with the base list styles.
 * @returns The rendered steps container.
 */
export function Steps({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "fd-steps relative flex flex-col gap-8 border-border border-l-2 pl-8 [counter-reset:step]",
        className,
      )}
      data-slot="docs-steps"
      {...props}
    />
  );
}

/**
 * Single step row inside `Steps`. Renders an auto-incrementing badge in the gutter.
 *
 * @param props - Standard div props.
 * @param props.className - Extra classes merged with the base step styles.
 * @returns The rendered step row.
 */
export function Step({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative [counter-increment:step] before:-left-[2.55rem] before:absolute before:flex before:size-7 before:items-center before:justify-center before:rounded-full before:border-2 before:border-border before:bg-card before:font-medium before:text-muted-foreground before:text-xs before:content-[counter(step)]",
        className,
      )}
      data-slot="docs-step"
      {...props}
    />
  );
}
