type ControlFunctions = {
  cancel: () => void;
  flush: () => void;
  isPending: () => boolean;
};

type DebounceOptions = {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
};

/**
 * Lodash-style debounce: collapses bursts of calls into a single trailing
 * (or leading) invocation after `wait` ms of quiet.
 *
 * @template T - The callback signature.
 * @param func - The function to debounce.
 * @param wait - Quiet time in milliseconds before invocation.
 * @param options - Leading/trailing/maxWait controls.
 * @returns A debounced function with cancel/flush/isPending helpers.
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number,
  options: DebounceOptions = {},
): ((...args: Parameters<T>) => ReturnType<T> | undefined) & ControlFunctions {
  const { leading = false, trailing = true, maxWait } = options;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisParameterType<T> | undefined;
  let result: ReturnType<T> | undefined;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;

  const maxWaitTime = maxWait !== undefined ? Math.max(wait, maxWait) : null;

  /** Invokes the underlying function with the most recent args/this. */
  function invokeFunc(time: number): ReturnType<T> | undefined {
    if (lastArgs === null) return undefined;
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg as ThisParameterType<T>, args) as ReturnType<T>;
    return result;
  }

  /** True when enough quiet has elapsed (or maxWait elapsed) to invoke. */
  function shouldInvoke(time: number): boolean {
    if (lastCallTime === null) return false;
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWaitTime !== null && timeSinceLastInvoke >= maxWaitTime)
    );
  }

  /** Returns ms left before `func` should fire on the trailing edge. */
  function remainingWait(time: number): number {
    if (lastCallTime === null) return wait;
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    return maxWaitTime !== null
      ? Math.min(timeWaiting, maxWaitTime - timeSinceLastInvoke)
      : timeWaiting;
  }

  /** Trailing-edge timer callback; either invokes or restarts the wait. */
  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  }

  /** Handles the first call in a quiet period. */
  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : undefined;
  }

  /** Handles the trailing fire after a quiet period or maxWait. */
  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    lastThis = undefined;
    return result;
  }

  function debounced(
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxWaitTime !== null) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = (): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastThis = undefined;
    lastCallTime = null;
    timeout = null;
  };

  debounced.flush = (): ReturnType<T> | undefined => {
    return timeout === null ? result : trailingEdge(Date.now());
  };

  debounced.isPending = (): boolean => {
    return timeout !== null;
  };

  return debounced;
}
