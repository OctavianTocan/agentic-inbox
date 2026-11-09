import { cva, type VariantProps } from "class-variance-authority";
import { siteConfig } from "@/config/site";
import { cn } from "../lib/utils";
import { AgenticInboxIcon } from "./icons";

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

const logoIconVariants = cva("size-[1lh] shrink-0");

export type LogoProps = VariantProps<typeof logoVariants> & {
  showText?: boolean;
  className?: string;
  iconClassName?: string;
};

/** Agentic Inbox logo: the envelope mark beside the app's name. */
export function Logo({
  size = "md",
  showText = true,
  className,
  iconClassName,
}: LogoProps) {
  return (
    <div className={cn(logoVariants({ size }), className)}>
      <AgenticInboxIcon className={cn(logoIconVariants(), iconClassName)} />
      {showText && (
        <span className="whitespace-nowrap font-bold font-display">
          {siteConfig.name}
        </span>
      )}
    </div>
  );
}
