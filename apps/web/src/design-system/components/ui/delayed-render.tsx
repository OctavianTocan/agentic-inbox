"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface DelayedRenderProps {
  children: ReactNode;
  delay?: number;
}

/**
 * Delays rendering of children by a specified duration.
 * Useful for suppressing brief loading indicators on fast operations.
 * Resets when unmounted, so the delay applies each time the component mounts.
 */
export function DelayedRender({ children, delay = 300 }: DelayedRenderProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) {
    return null;
  }

  return <>{children}</>;
}
