"use client";

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  type Transition,
  useReducedMotion,
} from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

const DEFAULT_TRANSITION: Transition = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1],
};

type AnimatedTabContentProps = {
  /** Identifier for the current tab — a change triggers the slide-blur transition. */
  transitionKey: string;
  /** Direction of the slide. `1` = new content slides in from the right, `-1` = from the left. */
  direction?: 1 | -1;
  /** Controls whether old and new tab content overlap during the transition. */
  mode?: "sync" | "popLayout" | "wait";
  children: ReactNode;
  className?: string;
  transition?: Transition;
  /** Pixels of blur applied to entering / exiting content. */
  blurPx?: number;
  /** Pixels of horizontal travel for entering / exiting content. */
  slidePx?: number;
};

/**
 * Tab-content transition: the new content slides in from one side with a
 * blur while the previous content slides out the other.
 */
export function AnimatedTabContent({
  transitionKey,
  direction = 1,
  mode = "popLayout",
  children,
  className,
  transition = DEFAULT_TRANSITION,
  blurPx = 8,
  slidePx = 24,
}: AnimatedTabContentProps) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveTransition = prefersReducedMotion
    ? { duration: 0 }
    : transition;
  const blurred = `blur(${blurPx}px)`;
  const sharp = "blur(0px)";
  const enterX = direction * slidePx;
  const exitX = -direction * slidePx;

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence initial={false} mode={mode}>
        <m.div
          animate={{ x: 0, filter: sharp, opacity: 1 }}
          className={cn(className)}
          data-slot="animated-tab-content"
          exit={{ x: exitX, filter: blurred, opacity: 0 }}
          initial={{ x: enterX, filter: blurred, opacity: 0 }}
          key={transitionKey}
          transition={effectiveTransition}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
