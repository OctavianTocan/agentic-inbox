"use client";

import React, { memo, useEffect, useMemo, useReducer, useRef } from "react";
import { DEFAULT_DELIMITER } from "../hooks/use-tokens";
import { useMarkdown } from "../providers/markdown-provider";
import { tokenAnimationStyle } from "./token-animation-style";

interface AnimationState {
  stableText: string;
  animatingTokens: string[];
}

type AnimationAction =
  | { type: "APPEND_TOKENS"; stablePrefix: string; tokens: string[] }
  | { type: "RESET_TOKENS"; tokens: string[] }
  | { type: "SETTLE" };

/** Reduces animated text state transitions into a single dispatch. */
function animationReducer(
  state: AnimationState,
  action: AnimationAction,
): AnimationState {
  switch (action.type) {
    case "APPEND_TOKENS":
      return {
        stableText: state.stableText + action.stablePrefix,
        animatingTokens: action.tokens,
      };
    case "RESET_TOKENS":
      return { stableText: "", animatingTokens: action.tokens };
    case "SETTLE":
      return {
        stableText: state.stableText + state.animatingTokens.join(""),
        animatingTokens: [],
      };
    default:
      return state;
  }
}

const INITIAL_ANIMATION_STATE: AnimationState = {
  stableText: "",
  animatingTokens: [],
};

interface AnimatedTextProps {
  children: React.ReactNode;
}

/** Renders text with per-token animation driven by the surrounding `MarkdownProvider`. */
export const AnimatedText = ({ children }: AnimatedTextProps) => {
  const { effectiveAnimation } = useMarkdown();

  const text = useMemo(
    () => React.Children.toArray(children).join(""),
    [children],
  );

  const previousTextRef = useRef("");
  const [state, dispatch] = useReducer(
    animationReducer,
    INITIAL_ANIMATION_STATE,
  );
  const animatingTokensRef = useRef<string[]>([]);
  animatingTokensRef.current = state.animatingTokens;

  // Derive new tokens during render rather than in an effect to avoid a
  // cascading re-render on every text change.
  if (text !== previousTextRef.current) {
    if (text.startsWith(previousTextRef.current)) {
      const newText = text.slice(previousTextRef.current.length);
      if (newText) {
        const newTokens = newText.split(DEFAULT_DELIMITER).filter(Boolean);
        dispatch({
          type: "APPEND_TOKENS",
          stablePrefix: animatingTokensRef.current.join(""),
          tokens: newTokens,
        });
      }
    } else {
      const allTokens = text.split(DEFAULT_DELIMITER).filter(Boolean);
      dispatch({ type: "RESET_TOKENS", tokens: allTokens });
    }
    previousTextRef.current = text;
  }

  useEffect(() => {
    if (state.animatingTokens.length === 0 || !effectiveAnimation?.enabled) {
      return;
    }

    const delay = effectiveAnimation.delay ?? 10;
    const duration = effectiveAnimation.duration ?? 200;
    const stagger = effectiveAnimation.stagger ?? 0;
    const animationFinishTime =
      delay + duration + (state.animatingTokens.length - 1) * stagger;

    const timer = setTimeout(() => {
      dispatch({ type: "SETTLE" });
    }, animationFinishTime);

    return () => clearTimeout(timer);
  }, [state.animatingTokens, effectiveAnimation]);

  if (!effectiveAnimation?.enabled) {
    return <>{children}</>;
  }

  const staggerMs = effectiveAnimation.stagger ?? 0;

  return (
    <>
      {state.stableText}
      {state.animatingTokens.map((token, i) => (
        <span
          className="animate-token"
          // biome-ignore lint/suspicious/noArrayIndexKey: animation tokens are positional
          key={`${i}-${token}`}
          style={tokenAnimationStyle(effectiveAnimation, i, staggerMs)}
        >
          {token}
        </span>
      ))}
    </>
  );
};

interface AnimatedComponentProps {
  as?: React.ElementType;
  children?: React.ReactNode;
  [key: string]: unknown;
}

/** Wraps each string child in `AnimatedText` while rendering as the given element. */
function AnimatedComponentInner({
  as: Component = "span",
  children,
  ...props
}: AnimatedComponentProps) {
  return (
    <Component {...props}>
      {React.Children.map(children, (child) => {
        if (typeof child === "string") {
          return <AnimatedText>{child}</AnimatedText>;
        }
        return child;
      })}
    </Component>
  );
}

/** Memoized element wrapper that animates its string children. */
export const AnimatedComponent = memo(AnimatedComponentInner);
