import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/** Link visual style variants. */
const linkVariants = cva(
  "rounded-xs font-normal underline decoration-muted-foreground/60 decoration-dashed decoration-from-font underline-offset-4 transition-colors hover:decoration-foreground hover:decoration-solid hover:decoration-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default:
          "text-primary hover:[text-shadow:0.02em_0_0_currentColor,-0.02em_0_0_currentColor]",
        muted: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type LinkProps = ComponentProps<"a"> & VariantProps<typeof linkVariants>;

/** Styled anchor element with variant-based visual styles. */
function Link({ className, variant, children, ...props }: LinkProps) {
  return (
    <a
      className={cn(linkVariants({ variant, className }))}
      data-slot="link"
      {...props}
    >
      {children}
    </a>
  );
}

export { Link, linkVariants };
