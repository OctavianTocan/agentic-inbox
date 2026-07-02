"use client";

import { useSyncExternalStore } from "react";
import { isMacPlatform } from "../lib/shortcuts";

/** Store subscription for {@link useIsMac}; platform never changes at runtime, so it is a no-op. */
function subscribePlatform() {
  return () => undefined;
}

/** Client snapshot reporting whether the current platform is macOS/iOS. */
function getPlatformSnapshot() {
  return isMacPlatform();
}

/** Server snapshot; assumes non-Mac so SSR and the first hydration render agree. */
function getPlatformServerSnapshot() {
  return false;
}

/**
 * Hydration-safe hook that returns whether the user is on macOS/iOS.
 *
 * Returns `false` during SSR and hydration (matching the server render),
 * then updates to the real value after hydration completes.
 */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribePlatform,
    getPlatformSnapshot,
    getPlatformServerSnapshot,
  );
}
