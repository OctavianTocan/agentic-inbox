// sadman table

import { useCallback, useEffect, useRef } from "react";
import { useCallbackRef } from "./use-callback-ref";

/**
 * Returns a stable function that defers invoking `callback` until `delay` has elapsed
 * since its most recent call, so rapid calls collapse into a single trailing run.
 *
 * @template T - Signature of the callback being debounced.
 * @param callback - The function to invoke after the quiet period.
 * @param delay - Quiet period in milliseconds before `callback` fires.
 * @returns A debounced wrapper accepting the same arguments as `callback`.
 */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
) {
  const handleCallback = useCallbackRef(callback);
  const debounceTimerRef = useRef(0);
  useEffect(() => () => window.clearTimeout(debounceTimerRef.current), []);

  const setValue = useCallback(
    (...args: Parameters<T>) => {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(
        () => handleCallback(...args),
        delay,
      );
    },
    [handleCallback, delay],
  );

  return setValue;
}
