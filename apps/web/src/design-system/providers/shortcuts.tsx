"use client";

import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

export { HotkeysProvider } from "@tanstack/react-hotkeys";

type ModifierHeldContextValue = {
  isHeld: boolean;
};

const ModifierHeldContext = createContext<ModifierHeldContextValue | null>(
  null,
);

/** Reads the modifier-held state, throwing if no provider is mounted. */
export function useModifierHeldContext(): boolean {
  const ctx = use(ModifierHeldContext);
  if (!ctx) {
    throw new Error(
      "useModifierHeldContext must be used within a ModifierHeldProvider",
    );
  }
  return ctx.isHeld;
}

/**
 * Read the modifier-held context, returning `null` when no provider is mounted.
 * Used by hooks that conditionally fall back to local state.
 */
export function useModifierHeldContextOptional(): boolean | null {
  const ctx = use(ModifierHeldContext);
  return ctx ? ctx.isHeld : null;
}

type ModifierHeldProviderProps = {
  delay?: number;
  children: ReactNode;
};

type HeldAction = { type: "held" } | { type: "released" };

/** Reduces the modifier-held binary state. */
function heldReducer(_state: boolean, action: HeldAction): boolean {
  return action.type === "held";
}

/** Provides a `isHeld` boolean that goes true after a modifier key is held for `delay` ms. */
export function ModifierHeldProvider({
  delay = 700,
  children,
}: ModifierHeldProviderProps) {
  const [isHeld, dispatch] = useReducer(heldReducer, false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /** Cancels any pending hold timer. */
    function cancelTimeout() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    /** Cancels the timer and resets the held state. */
    function clearAll() {
      cancelTimeout();
      dispatch({ type: "released" });
    }

    /** Starts the hold timer when a lone modifier key is pressed. */
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const isModifierOnly = event.key === "Meta" || event.key === "Control";

      if (!isModifierOnly) {
        // A combo like Cmd+K cancels a pending timeout so the overlay never
        // appears mid-tap, but must not clear a visible one (Cmd+1..9 nav).
        cancelTimeout();
        return;
      }

      if (timeoutRef.current) {
        return;
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        dispatch({ type: "held" });
      }, delay);
    }

    /** Resets on modifier release. */
    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Meta" || event.key === "Control") {
        clearAll();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearAll);

    return () => {
      clearAll();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearAll);
    };
  }, [delay]);

  return (
    <ModifierHeldContext.Provider value={useMemo(() => ({ isHeld }), [isHeld])}>
      {children}
    </ModifierHeldContext.Provider>
  );
}
