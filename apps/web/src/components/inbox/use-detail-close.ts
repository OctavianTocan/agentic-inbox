'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Detail-pane collapse duration (ms); matches the `--duration-panel-close` CSS token. */
export const DETAIL_CLOSE_ANIMATION_MS = 220;

type DetailClose = {
  readonly isDetailOpen: boolean;
  readonly isDetailClosing: boolean;
  readonly shouldRenderDetail: boolean;
  readonly openDetail: () => void;
  readonly closeDetail: () => void;
};

/**
 * Owns the open / animating-closed / unmounted lifecycle of a resizable detail
 * pane so its neighbor can grow smoothly before the pane unmounts.
 *
 * @returns The pane's open and closing flags, a render gate, and open/close controls.
 */
export function useDetailClose(): DetailClose {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const openDetail = useCallback(() => {
    clearTimer();
    setIsDetailClosing(false);
    setIsDetailOpen(true);
  }, [clearTimer]);

  const closeDetail = useCallback(() => {
    if (!isDetailOpen || isDetailClosing) {
      return;
    }
    setIsDetailClosing(true);
    timerRef.current = window.setTimeout(() => {
      setIsDetailOpen(false);
      setIsDetailClosing(false);
      timerRef.current = null;
    }, DETAIL_CLOSE_ANIMATION_MS);
  }, [isDetailOpen, isDetailClosing]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    isDetailOpen,
    isDetailClosing,
    shouldRenderDetail: isDetailOpen || isDetailClosing,
    openDetail,
    closeDetail
  };
}
