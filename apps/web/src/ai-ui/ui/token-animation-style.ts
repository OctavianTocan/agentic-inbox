import type React from "react";
import type { AnimationConfig } from "../hooks/use-animation-duration";

type CSSCustomProperties = React.CSSProperties &
  Record<`--${string}`, string | number | undefined>;

/**
 * Computes CSS custom properties for a single animated token.
 *
 * @param animation - Animation type, duration, delay, and easing to apply.
 * @param index - Token's position in the sequence, used to offset its delay.
 * @param staggerMs - Per-token delay step applied across the sequence.
 * @returns CSS custom properties (`--animation`, `--duration`, `--delay`, `--easing`) for the token's inline style.
 */
export function tokenAnimationStyle(
  animation: AnimationConfig,
  index: number,
  staggerMs: number,
): CSSCustomProperties {
  return {
    "--animation": animation.type,
    "--duration": `${animation.duration ?? 200}ms`,
    "--delay": `${(animation.delay ?? 10) + index * staggerMs}ms`,
    "--easing": animation.easing || "ease-out",
  };
}
