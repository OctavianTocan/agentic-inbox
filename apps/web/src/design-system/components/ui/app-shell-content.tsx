"use client";

import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import {
  appShellContentVariants,
  useAppShellMaxWidth,
} from "./app-shell-context";

/** Main content area inside an `AppShell`, constrained to the inherited max-width. */
function AppShellContent({
  children,
  className,
  maxWidth,
  layout = "default",
  ...props
}: React.ComponentProps<"main"> &
  VariantProps<typeof appShellContentVariants>) {
  const inheritedMaxWidth = useAppShellMaxWidth();
  const resolvedMaxWidth = maxWidth ?? inheritedMaxWidth ?? "default";
  return (
    <main
      className={cn("flex flex-1 flex-col", className)}
      data-slot="app-shell-content"
      {...props}
    >
      <div
        className={cn(
          "flex flex-1 flex-col",
          appShellContentVariants({ maxWidth: resolvedMaxWidth, layout }),
        )}
      >
        {children}
      </div>
    </main>
  );
}

export { AppShellContent };
