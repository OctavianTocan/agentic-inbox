"use client";

import { useShortcut } from "../hooks/use-shortcut";
import type { ShortcutDefinition } from "../lib/shortcuts";
import { useTheme } from "./theme";

const THEME_TOGGLE_SHORTCUT: ShortcutDefinition = {
  id: "theme.toggle",
  keys: "Mod+Shift+L",
  label: "Toggle Theme",
  category: "general",
  description: "Switches between light and dark modes",
};

/** Registers the keyboard shortcut that toggles between light and dark themes. */
export function ThemeToggleShortcut() {
  const { resolvedTheme, setTheme } = useTheme();

  useShortcut(THEME_TOGGLE_SHORTCUT, () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  });

  return null;
}
