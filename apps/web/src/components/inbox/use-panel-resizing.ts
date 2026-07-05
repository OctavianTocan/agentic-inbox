'use client';

import { useEffect, useState } from 'react';

type PanelResizing = {
  /** True while a resize handle is actively being dragged. */
  readonly isResizing: boolean;
  /** Attach to a resize handle's `onPointerDown` to begin tracking a drag. */
  readonly startResizing: () => void;
};

/**
 * Tracks whether a resize handle is actively dragging so the panel grow
 * transition can be suppressed for the duration (the transition should animate
 * open/close, never lag the pointer during a manual resize).
 *
 * @returns The active-drag flag and a pointer-down starter for the handle.
 */
export function usePanelResizing(): PanelResizing {
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) {
      return;
    }
    const stop = () => setIsResizing(false);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [isResizing]);

  return {
    isResizing,
    startResizing: () => setIsResizing(true)
  };
}
