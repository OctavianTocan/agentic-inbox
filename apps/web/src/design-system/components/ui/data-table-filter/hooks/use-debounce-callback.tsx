import { useEffect, useMemo, useRef } from "react";
import { debounce } from "../lib/debounce";
import { useUnmount } from "./use-unmount";

type DebounceOptions = {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
};

type ControlFunctions = {
  cancel: () => void;
  flush: () => void;
  isPending: () => boolean;
};

export type DebouncedState<T extends (...args: never[]) => ReturnType<T>> = ((
  ...args: Parameters<T>
) => ReturnType<T> | undefined) &
  ControlFunctions;

/**
 * Debounces a callback by `delay` ms; cancels any pending invocation on unmount.
 *
 * @template T - The callback signature.
 * @param func - The function to debounce.
 * @param delay - Wait time in milliseconds.
 * @param options - Lodash-style debounce options.
 * @returns A debounced function with cancel/flush/isPending controls.
 */
export function useDebounceCallback<
  T extends (...args: never[]) => ReturnType<T>,
>(func: T, delay = 500, options?: DebounceOptions): DebouncedState<T> {
  const debouncedRef = useRef<ReturnType<typeof debounce<T>> | null>(null);

  useUnmount(() => {
    debouncedRef.current?.cancel();
  });

  const debounced = useMemo(() => {
    debouncedRef.current?.cancel();
    const instance = debounce(func, delay, options);
    debouncedRef.current = instance;

    const wrapped: DebouncedState<T> = (...args: Parameters<T>) =>
      instance(...args);
    wrapped.cancel = instance.cancel;
    wrapped.flush = instance.flush;
    wrapped.isPending = instance.isPending;
    return wrapped;
  }, [func, delay, options]);

  useEffect(
    () => () => {
      debouncedRef.current?.cancel();
    },
    [],
  );

  return debounced;
}
