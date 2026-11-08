import type * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Bordered card wrapper for grid-row tables that scrolls horizontally on
 * narrow viewports without clipping portaled popovers or tooltips.
 */
function TableShell({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border bg-card", className)}
      data-slot="table-shell"
      {...props}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export { TableShell };
