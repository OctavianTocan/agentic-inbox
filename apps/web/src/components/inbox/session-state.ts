'use client';

import { useCallback, useState } from 'react';

// Module-scoped so it survives App Router client-side navigation (the JS
// runtime persists) but resets on a hard reload — exactly the semantics the
// run screen and cross-page chat toggle need. Deliberately not sessionStorage,
// which would survive reloads.
let chatOpen = true;
let hasPassedRunScreen = false;
let runViewRequested = false;

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

/**
 * Ask the inbox shell to open the run screen. Used to signal the request across
 * a client-side navigation from the audit page, where the shell is not mounted
 * yet; the shell consumes and clears the flag on its next mount.
 */
export function requestRunView(): void {
  runViewRequested = true;
}

/** Whether a cross-page run-screen request is pending. */
export function isRunViewRequested(): boolean {
  return runViewRequested;
}

/** Clear any pending cross-page run-screen request. */
export function clearRunViewRequest(): void {
  runViewRequested = false;
}
