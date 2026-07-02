// https://github.com/nainglinnkhant/shadcn-view-table/tree/main
import { useEffect, useState } from "react";

/**
 * Returns a copy of `value` that only updates after it has stayed unchanged for `delay`.
 *
 * @template T - Type of the debounced value.
 * @param value - The latest value to debounce.
 * @param delay - Quiet period in milliseconds before the value settles. Defaults to 500.
 * @returns The most recent value that has remained stable for the delay.
 */
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay ?? 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
