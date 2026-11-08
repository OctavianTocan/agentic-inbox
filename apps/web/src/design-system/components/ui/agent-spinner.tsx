"use client";

import { cn } from "../../lib/utils";
import { DotmSquare3 } from "./dotm-square-3";

type AgentSpinnerProps = {
  /** Matrix size in `rem`, converted to a pixel dot grid. */
  readonly size?: number;
  /** Accessible status label announced to assistive tech. */
  readonly label?: string;
  readonly className?: string;
};

/**
 * App loading spinner: the "Core Spiral" dot-matrix from `@dotmatrix`. Inherits
 * color via `currentColor` and holds still under `prefers-reduced-motion`.
 *
 * @param size - Matrix size in `rem`; converted to a pixel dot grid.
 * @param label - Accessible status label.
 * @param className - Additional classes for the wrapper (e.g. a text color).
 * @returns The animated dot-matrix spinner.
 */
export function AgentSpinner({
  size = 1,
  label = "Loading",
  className,
}: AgentSpinnerProps) {
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className,
      )}
      role="status"
    >
      <DotmSquare3 size={Math.round(size * 26)} />
    </span>
  );
}

export type { AgentSpinnerProps };
