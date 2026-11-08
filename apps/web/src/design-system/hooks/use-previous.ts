"use client";

import { useEffect, useRef } from "react";

/**
 * Returns the value from the previous render.
 *
 * @template T - Type of the tracked value.
 * @param value - Current value to track across renders.
 * @param initial - Value returned on the first render before any previous exists; defaults to `value`.
 * @returns The value as of the previous render.
 */
export function usePrevious<T>(value: T, initial: T = value): T {
  const ref = useRef<T>(initial);
  const previous = ref.current;
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return previous;
}
