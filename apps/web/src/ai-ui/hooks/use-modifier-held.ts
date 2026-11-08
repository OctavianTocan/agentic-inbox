"use client";

import { useEffect, useState } from "react";

/** Which modifier the hook should track. */
export type ModifierKey = "meta" | "control" | "shift" | "alt";

/** Optional behaviour knobs for `useModifierHeld`. */
export interface UseModifierHeldOptions {
  /** When `false`, skip the listener and return `false`. Defaults to `true`. */
  readonly enabled?: boolean;
}

/**
 * Track whether a given modifier is currently held, reporting correctly
 * regardless of which element holds focus.
 *
 * @param modifier - Modifier key to observe.
 * @param options - Optional behaviour knobs (see {@link UseModifierHeldOptions}).
 * @returns `true` while the modifier is held, `false` otherwise (and while disabled).
 */
export function useModifierHeld(
  modifier: ModifierKey,
  options?: UseModifierHeldOptions,
): boolean {
  const enabled = options?.enabled ?? true;
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHeld(false);
      return;
    }
    const matches = (event: KeyboardEvent): boolean => {
      switch (modifier) {
        case "meta":
          return event.metaKey;
        case "control":
          return event.ctrlKey;
        case "shift":
          return event.shiftKey;
        case "alt":
          return event.altKey;
        default:
          return false;
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      setHeld(matches(event));
    };
    const onBlur = (): void => setHeld(false);

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [modifier, enabled]);

  return held;
}
