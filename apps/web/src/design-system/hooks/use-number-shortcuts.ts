"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useCallback } from "react";

/**
 * Binds Mod+1 through Mod+9 to navigate to a zero-based index.
 *
 * @param enabled - Whether the shortcuts are active.
 * @param onNavigate - Called with the zero-based index for the pressed digit (Mod+1 yields 0).
 */
export function useNumberShortcuts(
  enabled: boolean,
  onNavigate: (index: number) => void,
) {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      const digit = Number.parseInt(event.key, 10);
      if (digit >= 1 && digit <= 9) {
        onNavigate(digit - 1);
      }
    },
    [onNavigate],
  );

  useHotkey("Mod+1", handler, { enabled, preventDefault: true });
  useHotkey("Mod+2", handler, { enabled, preventDefault: true });
  useHotkey("Mod+3", handler, { enabled, preventDefault: true });
  useHotkey("Mod+4", handler, { enabled, preventDefault: true });
  useHotkey("Mod+5", handler, { enabled, preventDefault: true });
  useHotkey("Mod+6", handler, { enabled, preventDefault: true });
  useHotkey("Mod+7", handler, { enabled, preventDefault: true });
  useHotkey("Mod+8", handler, { enabled, preventDefault: true });
  useHotkey("Mod+9", handler, { enabled, preventDefault: true });
}
