"use client";

import { animate, m, useMotionValue, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { cn } from "../../lib/utils";
import { LogoIcon } from "./logo-icon";

const SWEEP_GRADIENT =
  "linear-gradient(90deg, transparent 0%, black 50%, transparent 100%)";

const SWEEP_BASE_STYLE: CSSProperties = {
  maskImage: SWEEP_GRADIENT,
  WebkitMaskImage: SWEEP_GRADIENT,
  maskSize: "200% 100%",
  WebkitMaskSize: "200% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

export type LogoShimmerProps = {
  /** Tailwind size utility (e.g. "size-10", "size-16"). Defaults to size-10. */
  className?: string;
};

/**
 * Animated shimmering company mark, suitable as a loading indicator. Always
 * renders `aria-hidden`; consumers provide their own accessible loading label.
 */
export function LogoShimmer({ className }: LogoShimmerProps) {
  const reduce = useReducedMotion() ?? false;
  const maskPos = useMotionValue("200% 0%");

  useEffect(() => {
    if (reduce) {
      return;
    }
    const controls = animate(maskPos, ["200% 0%", "-100% 0%"], {
      duration: 1.4,
      ease: "linear",
      repeat: Number.POSITIVE_INFINITY,
      repeatDelay: 1,
    });
    return () => controls.stop();
  }, [reduce, maskPos]);

  if (reduce) {
    return (
      <LogoIcon
        aria-hidden="true"
        className={cn("size-10 text-muted-foreground/55", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block size-10", className)}
    >
      <LogoIcon className="absolute inset-0 size-full text-muted-foreground/55" />
      <m.span
        className="absolute inset-0"
        style={{
          ...SWEEP_BASE_STYLE,
          maskPosition: maskPos,
          WebkitMaskPosition: maskPos,
        }}
      >
        <LogoIcon className="size-full text-foreground" />
      </m.span>
    </span>
  );
}
