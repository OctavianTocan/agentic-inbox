"use client";

import { Thread as ThreadPrimitive, type ThreadProps } from "@/ai-ui/ui/thread";
import { cn } from "../../../lib/utils";

/**
 * Styled root thread container. Full height flex column layout.
 */
export function Thread({ className, ...props }: ThreadProps) {
  return (
    <ThreadPrimitive
      className={cn("flex h-full flex-col", className)}
      {...props}
    />
  );
}
