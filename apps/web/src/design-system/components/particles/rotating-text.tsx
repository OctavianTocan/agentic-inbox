"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

export type RotatingTextProps = {
  /** Labels to cycle through; one stays rendered if the array has a single item. */
  items: readonly string[];
  /** Milliseconds between rotations (default 2000). */
  interval?: number;
  /** Optional class name applied to the wrapping span. */
  className?: string;
};

/**
 * Inline label that rotates through `items` on a timed loop. Honors
 * `prefers-reduced-motion`. With 0–1 entries the rotation halts and the sole
 * item (if any) is shown as plain text.
 */
export function RotatingText({
  items,
  interval = 2000,
  className,
}: RotatingTextProps) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `items` is the explicit reset trigger; identity change resets the cycle even if the body doesn't read it directly.
  useEffect(() => {
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (items.length < 2) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, interval);
    return () => {
      window.clearInterval(id);
    };
  }, [items, interval]);

  // `items` can shrink between renders; the reset effect only fires afterward,
  // so clamp the index here to avoid a one-frame `undefined` flash.
  const current = items.length > 0 ? items[index % items.length] : undefined;

  return (
    <span
      className={cn("relative inline-block", className)}
      data-slot="rotating-text"
    >
      <AnimatePresence initial={false} mode="wait">
        {current ? (
          <m.span
            animate={{ opacity: 1, y: 0 }}
            className="inline-block"
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            key={current}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {current}
          </m.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
