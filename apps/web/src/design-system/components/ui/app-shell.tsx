"use client";

import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import {
  AppShellMaxWidthContext,
  appShellContentVariants,
  maxWidthVariants,
  useAppShellMaxWidth,
} from "./app-shell-context";

export { AppShellContent } from "./app-shell-content";
export { AppShellFooter } from "./app-shell-footer";

/** Top-level page shell that propagates a shared `maxWidth` to its children. */
function AppShell({
  children,
  className,
  maxWidth,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof maxWidthVariants>) {
  return (
    <AppShellMaxWidthContext.Provider value={maxWidth ?? null}>
      <div
        className={cn("flex min-h-[60vh] flex-col", className)}
        data-slot="app-shell"
        {...props}
      >
        {children}
      </div>
    </AppShellMaxWidthContext.Provider>
  );
}

export {
  AppShell,
  appShellContentVariants,
  maxWidthVariants,
  useAppShellMaxWidth,
};
