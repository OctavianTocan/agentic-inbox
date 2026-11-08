"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseTimedFlagOptions = {
  /** Duration in milliseconds the flag stays true before auto-resetting (default: 1500). */
  duration?: number;
};

type UseTimedFlagReturn = {
  /** Whether the flag is currently active. */
  flagged: boolean;
  /** Activates the flag; it auto-resets after the configured duration. Re-calling restarts the timer. */
  trigger: () => void;
};

/**
 * Returns a boolean flag that briefly turns true when `trigger` is called,
 * then auto-resets to false after `duration` milliseconds. Useful for
 * transient post-action UI like inline "Saved" confirmations, copy feedback,
 * or success chrome that should fade on its own.
 *
 * @param options - Hook options.
 * @returns `{ flagged, trigger }` — the current flag state and a stable trigger function.
 */
export function useTimedFlag(
  options: Readonly<UseTimedFlagOptions> = {},
): UseTimedFlagReturn {
  const { duration = 1500 } = options;
  const [flagged, setFlagged] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setFlagged(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setFlagged(false);
      timeoutRef.current = null;
    }, duration);
  }, [duration]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { flagged, trigger };
}
