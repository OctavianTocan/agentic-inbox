import { useEffect, useMemo, useRef } from "react";

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/use-callback-ref/src/useCallbackRef.tsx
 */

/**
 * Returns a stable function whose identity never changes but always invokes the
 * latest `callback`, so passing it as a prop or effect dependency does not cause
 * re-renders or re-runs.
 *
 * @template T - Callback signature being stabilized.
 * @param callback - The function to invoke; the most recent value is always called.
 * @returns A referentially stable wrapper around the current `callback`.
 */
function useCallbackRef<T extends (...args: never[]) => unknown>(
  callback: T | undefined,
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  // https://github.com/facebook/react/issues/19240
  return useMemo(() => ((...args) => callbackRef.current?.(...args)) as T, []);
}

export { useCallbackRef };
