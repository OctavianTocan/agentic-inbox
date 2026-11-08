"use client";

import { useEffect, useRef, useState } from "react";

export type AnimationType = "fade" | "blur";

export interface AnimationConfig {
  type: AnimationType;
  duration?: number;
  delay?: number;
  stagger?: number;
  enabled?: boolean;
  easing?: string;
}

/**
 * Resolves a loose animation prop into a full config with defaults applied,
 * disabling animation when the user prefers reduced motion.
 *
 * @param animation - A type name, a partial config, or a falsy value to
 * disable animation entirely.
 * @returns The resolved config, or `null` when animation is disabled.
 */
export function normalizeAnimation(
  animation?: AnimationType | AnimationConfig | false | null,
): AnimationConfig | null {
  if (!animation) {
    return null;
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (typeof animation === "string") {
    return {
      type: animation,
      duration: 200,
      delay: 10,
      enabled: !prefersReducedMotion,
      easing: "ease-out",
    };
  }

  return {
    duration: 200,
    delay: 10,
    enabled: !prefersReducedMotion,
    easing: "ease-out",
    ...animation,
  };
}

interface UseAnimationDurationProps {
  tokenCount: number;
  animation: AnimationConfig | null;
  waitForAnimation: boolean;
}

/**
 * Tracks whether a token-by-token reveal animation is still in flight.
 *
 * @param props - `tokenCount` of items being revealed, the resolved
 * `animation` config, and `waitForAnimation` to hold `isAnimating` true until
 * the staggered reveal completes.
 * @returns `{ isAnimating }`, true while the reveal is in progress.
 */
export function useAnimationDuration({
  tokenCount,
  animation,
  waitForAnimation,
}: UseAnimationDurationProps) {
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }

    if (!animation?.enabled || tokenCount === 0) {
      setIsAnimating(false);
      return;
    }

    const baseDelay = animation.delay || 10;
    const duration = animation.duration || 300;
    const stagger = animation.stagger || 0;
    const totalDuration = baseDelay + duration + (tokenCount - 1) * stagger;

    setIsAnimating(true);

    if (waitForAnimation) {
      animationTimerRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, totalDuration);
    } else {
      setIsAnimating(false);
    }

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [tokenCount, animation, waitForAnimation]);

  return { isAnimating };
}
