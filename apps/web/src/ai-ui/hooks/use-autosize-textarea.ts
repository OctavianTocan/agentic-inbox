"use client";

import type React from "react";
import { useLayoutEffect, useRef } from "react";

export type UseAutosizeTextareaOptions = {
  readonly value?: string | number;
  readonly ref?: React.RefObject<HTMLTextAreaElement | null>;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly enabled?: boolean;
};

/** Probes whether the browser supports the CSS `field-sizing: content` declaration. */
function supportsFieldSizing(): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    return false;
  }
  return CSS.supports("field-sizing", "content");
}

/**
 * Auto-resizes a textarea element to fit its content, falling back
 * to a JS write-read-write pass on browsers without support for the
 * CSS `field-sizing: content` declaration (notably Firefox as of 2026).
 *
 * On supporting browsers (Chrome, Edge, Safari 18.4+) the hook only
 * applies `min-height`/`max-height` inline styles so the native
 * field-sizing path can clamp, then bails out and lets the browser do
 * the resize work.
 *
 * @param options - Configuration for autosize behavior.
 * @returns The textarea ref to attach to the element.
 */
export function useAutosizeTextarea({
  value,
  ref,
  minHeight,
  maxHeight,
  enabled = true,
}: UseAutosizeTextareaOptions): React.RefObject<HTMLTextAreaElement | null> {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = ref ?? internalRef;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `value` triggers resize on controlled content change without being read directly.
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    if (typeof minHeight === "number") {
      textarea.style.minHeight = `${minHeight}px`;
    }
    if (typeof maxHeight === "number") {
      textarea.style.maxHeight = `${maxHeight}px`;
    }

    // Native field-sizing handles the resize on supporting browsers; bail.
    if (supportsFieldSizing()) {
      return;
    }

    /** Performs one write-read-write pass to size the textarea to its content. */
    const resize = () => {
      textarea.style.height = "auto";
      let nextHeight = textarea.scrollHeight;
      if (typeof minHeight === "number") {
        nextHeight = Math.max(nextHeight, minHeight);
      }
      if (typeof maxHeight === "number") {
        nextHeight = Math.min(nextHeight, maxHeight);
      }
      textarea.style.height = `${nextHeight}px`;
    };

    resize();
    textarea.addEventListener("input", resize);
    return () => {
      textarea.removeEventListener("input", resize);
    };
  }, [textareaRef, value, minHeight, maxHeight, enabled]);

  return textareaRef;
}
