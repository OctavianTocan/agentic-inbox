/**
 * https://motion-primitives.com/docs/text-shimmer
 */
"use client";

import { m } from "motion/react";
import React, { type JSX, type ReactNode, useMemo } from "react";

import { cn } from "../../lib/utils";

type TextShimmerProps = {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  /** Cycle length in seconds. */
  duration?: number;
  spread?: number;
  /** Pause between shimmer passes, in seconds. */
  repeatDelay?: number;
  /** CSS color for the resting text. Overrides the default zinc palette. */
  baseColor?: string;
  /** CSS color for the moving shimmer peak. Overrides the default. */
  peakColor?: string;
  /** Approximate character length used to compute the shimmer width. Defaults to 15. */
  textLength?: number;
};

/** Animated text shimmer effect backed by Motion. */
function TextShimmerComponent({
  children,
  as: Component = "span",
  className,
  duration = 1.4,
  spread = 2,
  repeatDelay = 1.5,
  baseColor,
  peakColor,
  textLength = 15,
}: TextShimmerProps) {
  const MotionComponent = useMemo(() => m.create(Component), [Component]);

  const dynamicSpread = textLength * spread;

  const style: Record<string, string> = {
    "--spread": `${dynamicSpread}px`,
    backgroundImage:
      "var(--bg), linear-gradient(var(--base-color), var(--base-color))",
    ...(baseColor ? { "--base-color": baseColor } : {}),
    ...(peakColor ? { "--base-gradient-color": peakColor } : {}),
  };

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block w-fit bg-[length:250%_100%,auto] bg-clip-text",
        "text-transparent [--base-color:#a1a1aa] [--base-gradient-color:#000]",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        "dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={style}
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration,
        ease: "linear",
        repeatDelay,
      }}
    >
      {children}
    </MotionComponent>
  );
}

const TextShimmer = React.memo(TextShimmerComponent);

export { TextShimmer, type TextShimmerProps };
