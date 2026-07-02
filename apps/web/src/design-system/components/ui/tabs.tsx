"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/** Visual style variants for the TabsList container. */
const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-lg bg-muted p-[3px]",
        line: "gap-1 rounded-none bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** Sliding active indicator, positioned over the active tab via Base UI's position CSS vars. */
const tabsIndicatorVariants = cva(
  "pointer-events-none absolute top-0 left-0 z-0 h-(--active-tab-height) w-(--active-tab-width) [transform:translate(var(--active-tab-left),var(--active-tab-top))] transition-[transform,width,height] duration-200 ease-out-quint data-[activation-direction=none]:transition-none motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "rounded-md border bg-card shadow-sm dark:border-transparent dark:bg-foreground/10",
        line: "before:absolute before:rounded-md before:bg-muted-foreground/4 dark:before:bg-muted/60 after:absolute after:rounded-full after:bg-muted-foreground group-data-horizontal/tabs:before:inset-x-0 group-data-horizontal/tabs:before:inset-y-1 group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:before:inset-x-1 group-data-vertical/tabs:before:inset-y-0 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:right-0 group-data-vertical/tabs:after:w-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** Tabs root managing the active tab in either orientation. */
function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className,
      )}
      data-orientation={orientation}
      data-slot="tabs"
      orientation={orientation}
      {...props}
    />
  );
}

/** Container row of tab triggers, with the shared sliding active indicator. */
function TabsList({
  className,
  variant = "default",
  indicator = true,
  children,
  ...props
}: TabsPrimitive.List.Props &
  VariantProps<typeof tabsListVariants> & { indicator?: boolean }) {
  return (
    <TabsPrimitive.List
      className={cn(tabsListVariants({ variant }), className)}
      data-slot="tabs-list"
      data-variant={variant}
      {...props}
    >
      {children}
      {indicator && (
        <TabsPrimitive.Indicator
          className={tabsIndicatorVariants({ variant })}
          data-slot="tabs-indicator"
        />
      )}
    </TabsPrimitive.List>
  );
}

/** Clickable tab that activates its matching panel. */
function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative z-1 inline-flex h-[calc(100%-1px)] flex-1 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 font-medium text-muted-foreground text-sm transition-colors duration-150 ease-out-quint hover:text-foreground focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:text-foreground group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

/** Panel shown when its tab is active. */
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("flex-1 text-sm outline-none", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
