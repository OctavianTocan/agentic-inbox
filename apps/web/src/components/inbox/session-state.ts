'use client';

import { useCallback, useState } from 'react';

// Module-scoped so it survives App Router client-side navigation (the JS
// runtime persists) but resets on a hard reload — exactly the semantics the
// run screen and cross-page chat toggle need. Deliberately not sessionStorage,
// which would survive reloads.
let chatOpen = true;
let hasPassedRunScreen = false;

/**
 * Chat-panel open state shared across the inbox and audit pages so the panel
 * keeps its open/closed state through client-side navigation.
 *
 * @returns A tuple of the current open state and a setter that also updates the shared value.
 */
export function useSharedChatOpen(): readonly [
  boolean,
  (open: boolean) => void
] {
  const [open, setLocal] = useState(chatOpen);
  const set = useCallback((next: boolean) => {
    chatOpen = next;
    setLocal(next);
  }, []);
  return [open, set];
}

/** Whether the user has already passed the run screen in this JS session. */
export function hasSeenInbox(): boolean {
  return hasPassedRunScreen;
}

/** Mark the run screen as passed for the remainder of this JS session. */
export function markInboxSeen(): void {
  hasPassedRunScreen = true;
}
