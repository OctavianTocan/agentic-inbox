"use client";

import type { RawHotkey } from "@tanstack/react-hotkeys";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { ShortcutDefinition } from "../lib/shortcuts";
import { formatShortcutKeys } from "../lib/shortcuts";
import { useIsMac } from "./use-is-mac";

export { useIsMac } from "./use-is-mac";

/**
 * Returns the platform modifier symbol for the current OS.
 *
 * @returns The Command symbol on macOS, otherwise `'Ctrl+'`.
 */
export function useModSymbol(): string {
  return useIsMac() ? "\u2318" : "Ctrl+";
}

/**
 * Formats a key combo into display segments for the current OS.
 *
 * @param keys - Key combo in `'Mod+K'` format.
 * @returns Display strings, one per step of the combo.
 */
export function useFormattedShortcutKeys(keys: string): string[] {
  return formatShortcutKeys(keys, useIsMac());
}

type UseShortcutOptions = {
  enabled?: boolean;
  preventDefault?: boolean;
};

/** Parse a `'Mod+K'`-style combo string into the modifier/key shape the hotkey library expects. */
function keysToRawHotkey(keys: string): RawHotkey {
  const parts = keys.split("+");
  const key = parts.pop() ?? "Escape";
  const modifiers = new Set(parts.map((p) => p.toLowerCase()));
  return {
    key,
    mod: modifiers.has("mod"),
    shift: modifiers.has("shift"),
    ctrl: modifiers.has("ctrl") || modifiers.has("control"),
    alt: modifiers.has("alt"),
    meta: modifiers.has("meta"),
  };
}

/**
 * Binds a keyboard shortcut to a callback for the lifetime of the component.
 *
 * @param definition - Shortcut to bind, or null to disable binding.
 * @param callback - Invoked with the keyboard event when the combo fires.
 * @param options - Optional `enabled` (gate the binding) and `preventDefault` (default true) flags.
 */
export function useShortcut(
  definition: ShortcutDefinition | null,
  callback: (event: KeyboardEvent) => void,
  options?: UseShortcutOptions,
): void {
  const hotkey = keysToRawHotkey(definition?.keys ?? "Escape");
  // The library only auto-ignores editable targets for single keys and
  // Shift/Alt combos; plain Escape/Enter still fire in inputs. Force it for any
  // combo without a Mod/Ctrl/Meta modifier so typing in the chat composer never
  // triggers inbox actions, while Cmd/Ctrl shortcuts keep working in inputs.
  const ignoreInputs = !(hotkey.mod || hotkey.ctrl || hotkey.meta);
  useHotkey(
    hotkey,
    (event) => {
      callback(event);
    },
    {
      enabled: definition !== null && (options?.enabled ?? true),
      preventDefault: options?.preventDefault ?? true,
      ignoreInputs,
    },
  );
}
