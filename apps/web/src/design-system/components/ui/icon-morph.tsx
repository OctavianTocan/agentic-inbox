"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type IconMorphProps = {
  activeKey: string;
  children: Record<string, ReactNode>;
  className?: string;
};

/** Crossfades between keyed glyphs, animating to the child selected by `activeKey`. */
export function IconMorph({ activeKey, children, className }: IconMorphProps) {
  const reduce = useReducedMotion();
  const current = children[activeKey];

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden",
        className,
      )}
      data-slot="icon-morph"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center"
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3 }}
          initial={reduce ? false : { opacity: 0, y: 3 }}
          key={activeKey}
          transition={{ duration: reduce ? 0 : 0.15, ease: [0.2, 0, 0, 1] }}
        >
          {current}
        </m.span>
      </AnimatePresence>
    </span>
  );
}
