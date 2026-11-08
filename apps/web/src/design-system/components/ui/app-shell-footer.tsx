"use client";

import { cn } from "../../lib/utils";

/** Footer area at the bottom of an `AppShell`. */
function AppShellFooter({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("", className)} data-slot="app-shell-footer" {...props}>
      {children}
    </div>
  );
}

export { AppShellFooter };
