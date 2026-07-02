import { cva, type VariantProps } from "class-variance-authority";
import { siteConfig } from "@/config/site";
import { cn } from "../lib/utils";
import { LogoIcon } from "./icons";

const logoVariants = cva("inline-flex items-center gap-3", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const logoIconVariants = cva("shrink-0", {
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface LogoProps extends VariantProps<typeof logoVariants> {
  showText?: boolean;
  className?: string;
  iconClassName?: string;
}

/** Company logo pairing the symbol mark with the company name. */
export function Logo({
  size = "md",
  showText = true,
  className,
  iconClassName,
}: LogoProps) {
  return (
    <div className={cn(logoVariants({ size }), className)}>
      <LogoIcon className={cn(logoIconVariants({ size }), iconClassName)} />
      {showText && (
        <span className="whitespace-nowrap font-bold font-display">
          {siteConfig.name}
        </span>
      )}
    </div>
  );
}
