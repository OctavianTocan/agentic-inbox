"use client";

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { cn } from "../../lib/utils";

const SWAP_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
};

type AnimatedTextSwapProps = {
  /** Current text. Each new value spring-swaps over the previous one. */
  value: string;
  className?: string;
};

/**
 * Spring-swaps successive text values in place with a crossfade, for string
 * labels that change inline. Respects the user's reduced-motion preference.
 */
export function AnimatedTextSwap({ value, className }: AnimatedTextSwapProps) {
  const reduce = useReducedMotion();
  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      data-slot="animated-text-swap"
    >
      <LazyMotion features={domAnimation}>
        <AnimatePresence initial={false} mode="popLayout">
          <m.span
            animate={{ opacity: 1, y: 0 }}
            className="inline-block max-w-full truncate"
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            key={value}
            transition={reduce ? { duration: 0 } : SWAP_SPRING}
          >
            {value}
          </m.span>
        </AnimatePresence>
      </LazyMotion>
    </span>
  );
}
