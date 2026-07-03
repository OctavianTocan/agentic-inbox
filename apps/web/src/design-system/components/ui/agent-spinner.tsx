"use client";

import { useEffect, useState } from "react";

import { cn } from "../../lib/utils";

type SpinnerVariant =
  | "dots"
  | "dotsCircle"
  | "arc"
  | "wave"
  | "scan"
  | "arrow";

type SpinnerDefinition = {
  readonly frames: readonly string[];
  readonly interval: number;
};

const SPINNERS: Readonly<Record<SpinnerVariant, SpinnerDefinition>> = {
  dots: {
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    interval: 80,
  },
  dotsCircle: {
    frames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
    interval: 80,
  },
  arc: {
    frames: ["◜", "◠", "◝", "◞", "◡", "◟"],
    interval: 100,
  },
  wave: {
    frames: ["⠁⠂⠄⡀", "⠂⠄⡀⢀", "⠄⡀⢀⠠", "⡀⢀⠠⠐", "⢀⠠⠐⠈", "⠠⠐⠈⠁", "⠐⠈⠁⠂", "⠈⠁⠂⠄"],
    interval: 100,
  },
  scan: {
    frames: [
      "⠀⠀⠀⠀",
      "⡇⠀⠀⠀",
      "⣿⠀⠀⠀",
      "⢸⡇⠀⠀",
      "⠀⣿⠀⠀",
      "⠀⢸⡇⠀",
      "⠀⠀⣿⠀",
      "⠀⠀⢸⡇",
      "⠀⠀⠀⣿",
      "⠀⠀⠀⢸",
    ],
    interval: 70,
  },
  arrow: {
    frames: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
    interval: 100,
  },
};

const SPINNER_VARIANTS = Object.keys(SPINNERS) as readonly SpinnerVariant[];

type AgentSpinnerProps = {
  /** Frame set and timing to animate; defaults to `"dots"`. */
  readonly variant?: SpinnerVariant;
  /** Font size in `rem` for the glyphs; the container width scales with it. */
  readonly size?: number;
  /** Accessible label announced to assistive tech; defaults to `"Loading"`. */
  readonly label?: string;
  readonly className?: string;
};

/**
 * Terminal-style text spinner that cycles monospace glyph frames without
 * shifting surrounding layout, at any size or variant. Inherits color via
 * `currentColor` and honors `prefers-reduced-motion` by holding the first frame.
 *
 * @param variant - Which frame set and interval to animate.
 * @param size - Glyph font size in `rem`.
 * @param label - Accessible status label.
 * @param className - Additional classes for the outer span.
 * @returns The animated spinner span.
 */
export function AgentSpinner({
  variant = "dots",
  size = 0.875,
  label = "Loading",
  className,
}: AgentSpinnerProps) {
  const { frames, interval } = SPINNERS[variant];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) {
        return;
      }
    }

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % frames.length);
    }, interval);
    return () => clearInterval(id);
  }, [frames.length, interval]);

  const frameWidth = frames[0]?.length ?? 1;

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden text-center font-mono tabular-nums",
        className,
      )}
      role="status"
      // Fixed height + lineHeight keep the box stable: braille/box glyphs can
      // fall back to a font with a taller line box than the surrounding mono.
      style={{
        width: `${frameWidth}ch`,
        height: "1em",
        lineHeight: "1em",
        fontSize: `${size}rem`,
      }}
    >
      {frames[index] ?? frames[0]}
    </span>
  );
}

export { SPINNER_VARIANTS };
export type { AgentSpinnerProps, SpinnerVariant };
