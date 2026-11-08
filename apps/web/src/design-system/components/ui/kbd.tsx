import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/** Keyboard shortcut badge variants. */
const kbdVariants = cva(
  "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm in-data-[slot=tooltip-content]:bg-background/20 px-1 font-medium font-sans in-data-[slot=tooltip-content]:text-background text-xs dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        ghost: "bg-muted/50 text-muted-foreground/70",
        outline: "border border-border text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type KbdVariant = VariantProps<typeof kbdVariants>["variant"];

/** Keyboard shortcut key badge with variant-based styling. */
function Kbd({
  className,
  variant,
  ...props
}: React.ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>) {
  return (
    <kbd
      className={cn(kbdVariants({ variant, className }))}
      data-slot="kbd"
      {...props}
    />
  );
}

/** Inline group of keyboard shortcut keys. */
function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      className={cn("inline-flex items-center gap-1", className)}
      data-slot="kbd-group"
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
