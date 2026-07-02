"use client";

import {
  ScrollButton as ScrollButtonPrimitive,
  type ScrollButtonProps as ScrollButtonPrimitiveProps,
} from "@/ai-ui/ui/scroll-button";
import { ChevronDownIcon } from "@/design-system/components/icons";
import { cn } from "../../../lib/utils";
import { buttonVariants } from "../button";

/**
 * Styled scroll-to-bottom button with visibility animation.
 * Shows when not at the bottom of the message list, hides when at bottom.
 * Default children: down chevron icon.
 */
export function ScrollButton({
  className,
  children,
  ...props
}: ScrollButtonPrimitiveProps) {
  return (
    <ScrollButtonPrimitive
      className={cn(
        buttonVariants({ size: "icon-sm", variant: "outline" }),
        "z-20 transform transition-all duration-200 ease-in-out max-md:size-8",
        "data-[visible=true]:pointer-events-none data-[visible=true]:translate-y-4 data-[visible=true]:opacity-0",
        "data-[visible=false]:pointer-events-auto data-[visible=false]:translate-y-0 data-[visible=false]:opacity-100",
        className,
      )}
      {...props}
    >
      {children ?? <ChevronDownIcon className="size-4" />}
    </ScrollButtonPrimitive>
  );
}
