"use client";

import {
  createContext,
  type ReactNode,
  use,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AnimationConfig,
  type AnimationType,
  normalizeAnimation,
  useAnimationDuration,
} from "../hooks/use-animation-duration";
import { useTokens } from "../hooks/use-tokens";

export interface MarkdownContextValue {
  animation?: AnimationConfig | null | AnimationType | false;
  isAnimating: boolean;
  effectiveAnimation: AnimationConfig | null;
}

const MarkdownContext = createContext<MarkdownContextValue | null>(null);

/** Reads the surrounding `MarkdownProvider` context. Throws outside one. */
export function useMarkdown() {
  const context = use(MarkdownContext);
  if (!context) {
    throw new Error("useMarkdown must be used within a Markdown component");
  }
  return context;
}

export interface MarkdownProviderProps {
  children: ReactNode;
  content: ReactNode;
  animation?: AnimationConfig | null | AnimationType | false;
  waitForAnimation: boolean;
}

/** Provides markdown animation state to descendant components. */
export function MarkdownProvider({
  children,
  content,
  animation,
  waitForAnimation,
}: MarkdownProviderProps) {
  const normalizedAnimation = useMemo(
    () => normalizeAnimation(animation),
    [animation],
  );

  const pendingRef = useRef<AnimationConfig | null>(null);
  const [effectiveAnimation, setEffectiveAnimation] =
    useState(normalizedAnimation);

  const { tokens } = useTokens({
    children: content,
    streaming: true,
  });

  const { isAnimating } = useAnimationDuration({
    tokenCount: tokens.length,
    animation: effectiveAnimation,
    waitForAnimation,
  });

  // Defer a config change while an animation is in flight so it isn't cut off;
  // apply immediately otherwise, then flush any deferred change once settled.
  if (!(waitForAnimation && isAnimating)) {
    if (normalizedAnimation !== effectiveAnimation) {
      setEffectiveAnimation(normalizedAnimation);
    }
    pendingRef.current = null;
  } else if (normalizedAnimation !== effectiveAnimation) {
    pendingRef.current = normalizedAnimation;
  }

  if (!isAnimating && pendingRef.current !== null) {
    setEffectiveAnimation(pendingRef.current);
    pendingRef.current = null;
  }

  const contextValue = useMemo(
    () => ({
      animation: normalizedAnimation,
      isAnimating,
      effectiveAnimation,
    }),
    [normalizedAnimation, isAnimating, effectiveAnimation],
  );

  return (
    <MarkdownContext.Provider value={contextValue}>
      {children}
    </MarkdownContext.Provider>
  );
}
