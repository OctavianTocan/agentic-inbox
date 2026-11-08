"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";

/** How long the scroll lock is held, covering the disclosure animation plus a settle tail. */
const DISCLOSURE_SETTLE_MS = 250;

/**
 * Returns a callback that pins the scroll position for the duration of a
 * disclosure animation. Designed for `<TraceStep onOpenChange>` and any
 * other consumer that toggles in-place height inside a `StickToBottom`
 * scroller. No-op when the user is not pinned at the bottom anchor.
 *
 * @returns Callback to invoke on open/close before height changes.
 */
export function useScrollAnchorLock(): () => void {
  const ctx = useStickToBottomContext();
  const timerRef = useRef<number | null>(null);

  /** Clears any pending release timer without clearing the override. */
  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelTimer();
      ctx.targetScrollTop = null;
    };
  }, [cancelTimer, ctx]);

  return useCallback(() => {
    const scroller = ctx.scrollRef.current;
    if (!(scroller && ctx.isAtBottom)) {
      return;
    }
    const savedScrollTop = scroller.scrollTop;
    ctx.targetScrollTop = () => savedScrollTop;
    cancelTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      ctx.targetScrollTop = null;
    }, DISCLOSURE_SETTLE_MS);
  }, [cancelTimer, ctx]);
}
