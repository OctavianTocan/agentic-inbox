"use client";

import { useFormattedShortcutKeys } from "../../hooks/use-shortcut";
import type { ShortcutDefinition } from "../../lib/shortcuts";
import { Kbd, KbdGroup, type KbdVariant } from "./kbd";

type ShortcutKbdProps = {
  shortcut: ShortcutDefinition;
  className?: string;
  variant?: KbdVariant;
};

/** Renders a keyboard shortcut definition as one or more styled keycaps. */
export function ShortcutKbd({
  shortcut,
  className,
  variant,
}: ShortcutKbdProps) {
  const parts = useFormattedShortcutKeys(shortcut.keys);

  if (parts.length === 1) {
    return (
      <Kbd className={className} variant={variant}>
        {parts[0]}
      </Kbd>
    );
  }

  return (
    <KbdGroup className={className}>
      {parts.map((part) => (
        <Kbd key={part} variant={variant}>
          {part}
        </Kbd>
      ))}
    </KbdGroup>
  );
}
