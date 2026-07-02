import { formatForDisplay } from "@tanstack/react-hotkeys";

export type ShortcutCategory =
  | "navigation"
  | "actions"
  | "editing"
  | "general"
  | (string & {});

export interface ShortcutDefinition {
  /** Unique identifier, e.g. 'search.open', 'sidebar.toggle' */
  id: string;
  /** Key combo in 'Mod+K' format, e.g. 'Mod+K', 'Mod+B' */
  keys: string;
  /** Human-readable label, e.g. 'Open Search' */
  label: string;
  /** Grouping category for command palette display */
  category: ShortcutCategory;
  /** Extra context shown in the shortcuts help dialog */
  description?: string;
}

/** Map of shortcut ID to definition */
export type ShortcutMap = Record<string, ShortcutDefinition>;

const MAC_UA_PATTERN = /Mac|iPhone|iPad|iPod/;

/**
 * Detect whether the current runtime is macOS or iOS.
 *
 * @returns True on macOS/iOS, false elsewhere or when `navigator` is unavailable (SSR).
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return MAC_UA_PATTERN.test(navigator.userAgent);
}

/**
 * Format shortcut keys into per-step display strings.
 *
 * Pass `isMac` explicitly to avoid SSR hydration mismatches; when omitted it
 * falls back to runtime detection.
 *
 * @param keys - Key combo in `'Mod+K'` format.
 * @param isMac - Whether to render macOS glyphs; defaults to runtime platform detection.
 * @returns Display strings, one per step; a modifier combo like `'Mod+K'` yields a single entry `['⌘K']`.
 */
export function formatShortcutKeys(keys: string, isMac?: boolean): string[] {
  const mac = isMac ?? isMacPlatform();
  const platform = mac ? "mac" : "windows";

  if (keys === "Shift+/") {
    return ["?"];
  }

  return [formatForDisplay(keys, { platform })];
}
