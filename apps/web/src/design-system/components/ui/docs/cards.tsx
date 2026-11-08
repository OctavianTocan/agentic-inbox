import type { ComponentProps } from "react";

import { cn } from "../../../lib/utils";

/**
 * Responsive grid wrapper for `Card` children. Two columns at sm+, one column otherwise.
 *
 * @param props - Standard div props.
 * @param props.className - Extra classes merged with the base grid layout.
 * @returns The rendered grid container.
 */
export function Cards({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "not-prose grid gap-4 sm:grid-cols-2 @max-lg:[&>*]:col-span-full",
        className,
      )}
      data-slot="docs-cards"
      {...props}
    />
  );
}
