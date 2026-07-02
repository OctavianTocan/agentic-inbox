import { cn } from "../../lib/utils";

/** Sticky page header bar that hosts top-bar content, actions, and center slots. */
function TopBar({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-(--top-bar-height) shrink-0 items-center gap-2 border-b bg-background px-2",
        className,
      )}
      data-slot="top-bar"
      {...props}
    />
  );
}

/** Left-aligned, flex-growing region of the top bar. */
function TopBarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 items-center gap-2", className)}
      data-slot="top-bar-content"
      {...props}
    />
  );
}

/** Right-aligned region of the top bar for action controls. */
function TopBarActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("ml-auto flex items-center gap-2", className)}
      data-slot="top-bar-actions"
      {...props}
    />
  );
}

/** Absolutely centered region of the top bar, overlaying the content row. */
function TopBarCenter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 left-1/2 flex max-w-[min(60%,32rem)] -translate-x-1/2 items-center [&>*]:pointer-events-auto",
        className,
      )}
      data-slot="top-bar-center"
      {...props}
    />
  );
}

/** Thin vertical divider between top-bar items. */
function TopBarSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("mx-0 h-4 w-px shrink-0 bg-border", className)}
      data-slot="top-bar-separator"
      {...props}
    />
  );
}

export { TopBar, TopBarActions, TopBarCenter, TopBarContent, TopBarSeparator };
