"use client";

import {
  PartActions as PartActionsPrimitive,
  type PartActionsProps,
  PartContent as PartContentPrimitive,
  type PartContentProps,
  PartFooter as PartFooterPrimitive,
  type PartFooterProps,
  PartHeader as PartHeaderPrimitive,
  type PartHeaderProps,
  PartIcon as PartIconPrimitive,
  type PartIconProps,
  Part as PartPrimitive,
  type PartProps,
  PartTitle as PartTitlePrimitive,
  type PartTitleProps,
} from "@/ai-ui/ui/part";
import { cn } from "../../../lib/utils";

/** Styled part container with vertical spacing. */
export function Part({ className, ...props }: PartProps) {
  return <PartPrimitive className={cn("space-y-3", className)} {...props} />;
}

/** Styled part header with horizontal alignment. */
export function PartHeader({ className, ...props }: PartHeaderProps) {
  return (
    <PartHeaderPrimitive
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

/** Styled part icon container. */
export function PartIcon({ className, ...props }: PartIconProps) {
  return (
    <PartIconPrimitive
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-md",
        className,
      )}
      {...props}
    />
  );
}

/** Styled part title. */
export function PartTitle({ className, ...props }: PartTitleProps) {
  return (
    <PartTitlePrimitive
      className={cn("font-medium text-sm", className)}
      {...props}
    />
  );
}

/** Styled part content area. */
export function PartContent({ className, ...props }: PartContentProps) {
  return (
    <PartContentPrimitive className={cn("text-sm", className)} {...props} />
  );
}

/** Styled part footer with top border. */
export function PartFooter({ className, ...props }: PartFooterProps) {
  return (
    <PartFooterPrimitive
      className={cn(
        "flex items-center justify-between border-border/50 border-t pt-2",
        className,
      )}
      {...props}
    />
  );
}

/** Styled part actions row. */
export function PartActions({ className, ...props }: PartActionsProps) {
  return (
    <PartActionsPrimitive
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}
