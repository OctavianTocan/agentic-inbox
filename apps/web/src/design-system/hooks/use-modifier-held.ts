"use client";

import type { ModifierKey } from "@/ai-ui/hooks/use-modifier-held";
import { useModifierHeld as useInstantModifierHeld } from "@/ai-ui/hooks/use-modifier-held";
import { useModifierHeldContextOptional } from "../providers/shortcuts";

export type { ModifierKey } from "@/ai-ui/hooks/use-modifier-held";

/**
 * Returns whether the platform modifier (Cmd on Mac, Ctrl on Windows) has been
 * held longer than the configured delay. Must be called within a
 * `ModifierHeldProvider`, which preserves the held state across page navigations.
 *
 * @returns `true` once the platform modifier has been held past the delay.
 * @throws If called outside a `ModifierHeldProvider`.
 */
export function useModifierHeld(): boolean;
/**
 * Returns whether the given modifier is currently pressed, with no delay.
 * No `ModifierHeldProvider` is required.
 *
 * @param modifier - Modifier key to track.
 * @returns `true` while the modifier is held.
 */
export function useModifierHeld(modifier: ModifierKey): boolean;
export function useModifierHeld(modifier?: ModifierKey): boolean {
  const providerHeld = useModifierHeldContextOptional();
  const instantHeld = useInstantModifierHeld(modifier ?? "meta", {
    enabled: modifier !== undefined,
  });
  if (modifier !== undefined) {
    return instantHeld;
  }
  if (providerHeld === null) {
    throw new Error(
      "useModifierHeld() (no-arg form) must be used within a ModifierHeldProvider; pass an explicit modifier for the provider-less form.",
    );
  }
  return providerHeld;
}
