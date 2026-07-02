"use client";

import { domMax, LazyMotion, MotionConfig } from "motion/react";
import type { ReactElement, ReactNode } from "react";

type MotionProviderProps = {
  children: ReactNode;
};

/** Provides the shared Motion runtime while respecting user reduced-motion preferences. */
export function MotionProvider({
  children,
}: MotionProviderProps): ReactElement {
  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
