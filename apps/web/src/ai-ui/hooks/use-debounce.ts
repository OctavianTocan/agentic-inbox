"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Debounces a callback, deferring the latest invocation until calls quiet
 * down (distinct from design-system's value debouncer).
 *
 * @template T - The callback's signature, preserved on the returned function.
 * @param callback - Function to invoke after the quiet period.
 * @param delay - Quiet period in milliseconds before the callback fires.
 * @returns A debounced function taking the same arguments as `callback`.
 */
// biome-ignore lint/suspicious/noExplicitAny: generic constraint requires any to accept all callback signatures
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );
}
