"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const COMPLETE_WORD_RE = /\S+\s+/g;

export type UseRevealedTextOptions = {
  /** Whether the source is still actively streaming (the active trailing turn). */
  readonly enabled: boolean;
  /** Milliseconds between reveal ticks. The caller owns this product-tuning value. */
  readonly intervalMs: number;
  /** Upper bound on how far the reveal may lag the source before it accelerates. */
  readonly maxLagMs: number;
};

/** Result of `useRevealedText`: the revealed prefix and whether it is still catching up. */
export type RevealedText = {
  /** True while the revealed prefix is still shorter than the full source. */
  readonly isRevealing: boolean;
  /** The portion of the source revealed so far (a prefix of `fullText`). */
  readonly text: string;
};

/** Reads the OS reduced-motion preference once; SSR-safe. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** End offsets of each whitespace-terminated word; a trailing partial word is excluded. */
function computeWordBoundaries(text: string): number[] {
  const offsets: number[] = [];
  COMPLETE_WORD_RE.lastIndex = 0;
  let match = COMPLETE_WORD_RE.exec(text);
  while (match !== null) {
    offsets.push(match.index + match[0].length);
    match = COMPLETE_WORD_RE.exec(text);
  }
  return offsets;
}

/**
 * Reveals `fullText` word-by-word at a steady, lag-bounded cadence so the UI
 * owns streaming reveal pacing while the data layer stays current. Text present
 * at mount shows instantly (baseline); only later growth is paced. A trailing
 * partial word is held while `enabled` (streaming) and released once it is
 * false, so the final word — which usually arrives without trailing whitespace
 * — still reveals. A large burst drains within roughly `maxLagMs` instead of
 * one word at a time forever, so the reveal can never fall far behind the model.
 *
 * @param fullText - The assistant text streamed so far (a growing prefix).
 * @param options - Streaming state (`enabled`) and reveal cadence (`intervalMs`, `maxLagMs`).
 * @returns The revealed prefix of `fullText` and whether the reveal is still catching up.
 */
export function useRevealedText(
  fullText: string,
  options: UseRevealedTextOptions,
): RevealedText {
  const { enabled } = options;
  const intervalMs = Math.max(1, options.intervalMs);
  const maxLagMs = Math.max(intervalMs, options.maxLagMs);
  const ticksToDrain = Math.max(1, maxLagMs / intervalMs);
  const [reducedMotion] = useState(prefersReducedMotion);

  const { boundaries, hasPartial } = useMemo(() => {
    const offsets = computeWordBoundaries(fullText);
    const lastEnd = offsets.length > 0 ? offsets[offsets.length - 1] : 0;
    return {
      boundaries: offsets,
      hasPartial: fullText.slice(lastEnd).trim().length > 0,
    };
  }, [fullText]);

  // The trailing partial word becomes revealable only once streaming stops; the
  // final word of a reply usually arrives without trailing whitespace.
  const availableCount = boundaries.length + (!enabled && hasPartial ? 1 : 0);

  const [revealedCount, setRevealedCount] = useState(() => availableCount);

  // Clamp the counter (not just the rendered prefix) when the source shrinks or
  // is replaced, so a later regrow paces from the new boundary instead of jumping to the end.
  if (revealedCount > availableCount) {
    setRevealedCount(availableCount);
  }

  const revealedCountRef = useRef(revealedCount);
  revealedCountRef.current = revealedCount;
  const availableCountRef = useRef(availableCount);
  availableCountRef.current = availableCount;

  // `enabled` pins this true while streaming, so the interval is armed once
  // rather than re-armed (and reset) on every word, which would stall the reveal.
  const shouldRun = enabled || revealedCount < availableCount;

  useEffect(() => {
    if (reducedMotion || !shouldRun) {
      return;
    }
    const interval = setInterval(() => {
      const target = availableCountRef.current;
      const current = revealedCountRef.current;
      if (current >= target) {
        return;
      }
      const step = Math.max(1, Math.ceil((target - current) / ticksToDrain));
      const next = Math.min(target, current + step);
      revealedCountRef.current = next;
      setRevealedCount(next);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [shouldRun, reducedMotion, intervalMs, ticksToDrain]);

  if (reducedMotion) {
    return { isRevealing: false, text: fullText };
  }

  const endOffset =
    revealedCount <= 0
      ? 0
      : revealedCount <= boundaries.length
        ? boundaries[revealedCount - 1]
        : fullText.length;

  return {
    isRevealing: revealedCount < availableCount,
    text: fullText.slice(0, endOffset),
  };
}
