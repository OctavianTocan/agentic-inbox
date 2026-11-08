/**
 * Copied from https://github.com/shadcn-ui/ui/issues/2402#issuecomment-1930895113
 */
"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import { useTouch } from "./hybrid-tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type HybridHoverCardProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
};

/** Touch-aware hover card that falls back to a popover on touch devices. */
export const HybridHoverCard = (props: HybridHoverCardProps) => {
  const isTouch = useTouch();

  return isTouch ? <Popover {...props} /> : <HoverCard {...props} />;
};

type HybridHoverCardTriggerProps = {
  children?: ReactNode;
  render?: ReactElement;
  className?: string;
  delay?: number;
  closeDelay?: number;
};

/** Touch-aware hover card trigger that falls back to a popover on mobile. */
export const HybridHoverCardTrigger = ({
  delay,
  closeDelay,
  ...rest
}: HybridHoverCardTriggerProps) => {
  const isTouch = useTouch();

  return isTouch ? (
    <PopoverTrigger {...rest} />
  ) : (
    <HoverCardTrigger closeDelay={closeDelay} delay={delay} {...rest} />
  );
};

/** Touch-aware hover card content that renders as a popover on mobile. */
export const HybridHoverCardContent = (
  props: ComponentProps<typeof HoverCardContent> &
    ComponentProps<typeof PopoverContent>,
) => {
  const isTouch = useTouch();

  return isTouch ? (
    <PopoverContent {...props} />
  ) : (
    <HoverCardContent {...props} />
  );
};
